/**
 * Backfills scripture text onto imported artworks, keyed off each artwork's
 * Bible Reference.
 *
 *   node scripts/backfill-scripture.mjs --dry-run --limit 5
 *   node scripts/backfill-scripture.mjs
 *
 * The workbook holds citations only, so artworks arrive from
 * scripts/import-artworks.mjs with no verse text at all. This does in bulk what
 * the Studio's "Fetch Scripture" action does for one document.
 *
 * It calls the app's /api/scripture proxy rather than any Bible service
 * directly, so the providers, their normalisation and the server-side ESV key
 * all stay exactly where they already live — this script knows only that an
 * endpoint returns `texts` keyed by locale. The Next.js app must be running, or
 * pass --api.
 *
 * Options
 *   --dry-run        Report what would be written; write nothing to Sanity.
 *                    Still calls the providers, so it does consume API quota.
 *   --limit N        Only process the first N artworks.
 *   --rate N         Lookups per minute (default 50). The Chinese provider
 *                    advertises a 60/min cap and answers HTTP 429 past it, so
 *                    an unpaced run over 302 artworks fails most of them.
 *   --overwrite      Also replace scripture fields that already hold text.
 *                    Off by default, so a rerun only ever fills blanks.
 *   --api URL        Scripture endpoint. Defaults to SCRIPTURE_API_URL, then
 *                    http://localhost:3000/api/scripture.
 *
 * Re-running is safe. It selects only artworks still missing text, writes only
 * empty fields, and performs one lookup per *unique* reference no matter how
 * many artworks cite it. A provider that is down leaves its fields empty and
 * listed in the report; run the script again later to pick them up.
 *
 * Writes to the published documents, matching the importer. Note that
 * scripture.zhCN is one of the fields the public gallery gates on, so an
 * artwork that also passes the selection criteria goes live on the site as soon
 * as this fills it — the report counts those before anything is written.
 */
import {getWriteClient, loadEnv} from './lib/scriptClient.mjs'

function flag(name) {
    return process.argv.includes(`--${name}`)
}

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? fallback : process.argv[index + 1]
}

const DRY_RUN = flag('dry-run')
const OVERWRITE = flag('overwrite')
const LIMIT = Number(option('limit', 0)) || 0
/**
 * Lookups per minute. The Chinese provider returns `X-RateLimit-Limit: 60`, and
 * one lookup here is one request to each provider, so the default sits under
 * that ceiling rather than on it. Running in parallel is pointless against a
 * per-minute cap, so lookups are sequential and paced instead.
 */
const RATE_PER_MINUTE = Math.max(1, Number(option('rate', 50)) || 50)
const MIN_INTERVAL_MS = Math.ceil(60_000 / RATE_PER_MINUTE)

loadEnv()

const API = option('api', process.env.SCRIPTURE_API_URL || 'http://localhost:3000/api/scripture')

/** Mirrors the localeText object's keys, in the order the Studio dialog lists them. */
const SCRIPTURE_FIELDS = ['zhTW', 'zhCN', 'en']

// Generous: the endpoint already caps each provider at 8s and runs both in
// parallel, so anything past this is a hung connection rather than slowness.
const LOOKUP_TIMEOUT_MS = 20_000

/** Sanity rejects unbounded transactions, so patches go up in chunks. */
const PATCHES_PER_TRANSACTION = 50

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Confirms the endpoint is reachable before burning 300 lookups discovering it
 * is not. A reference-less call is answered 400 by design, which is all the
 * proof needed and costs no provider quota.
 */
async function preflight() {
    try {
        const response = await fetch(API, {signal: AbortSignal.timeout(10_000)})
        if (response.ok || response.status === 400) return

        console.error(`Scripture endpoint answered HTTP ${response.status}: ${API}`)
        process.exit(1)
    } catch (error) {
        console.error(`Cannot reach the scripture endpoint: ${API}`)
        console.error(`  ${error instanceof Error ? error.message : error}`)
        console.error('Start the app first, or point --api at a deployed one.')
        process.exit(1)
    }
}

async function lookup(reference) {
    try {
        const response = await fetch(`${API}?reference=${encodeURIComponent(reference)}`, {
            signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
            return {texts: {}, errors: {}, failure: payload?.error ?? `HTTP ${response.status}`}
        }

        return {
            texts: payload?.texts ?? {},
            errors: payload?.errors ?? {},
            invalid: payload?.invalid,
            unavailableProviders: payload?.unavailableProviders,
        }
    } catch (error) {
        return {
            texts: {},
            errors: {},
            failure: error instanceof Error ? error.message : 'lookup failed',
        }
    }
}

/**
 * The provider explanations for the given fields, deduplicated — zhTW and zhCN
 * come from one provider and carry the identical message.
 */
function reasonsFor(result, fields) {
    if (result.failure) return result.failure
    return [...new Set(fields.map((field) => result.errors?.[field]).filter(Boolean))].join('; ')
}

/** True when this artwork still has a field worth filling. */
function needsWork(artwork) {
    if (OVERWRITE) return true
    return SCRIPTURE_FIELDS.some((field) => !artwork.scripture?.[field]?.trim())
}

/** The patch this artwork would receive, given what the lookup returned. */
function plannedSet(artwork, texts, overwrite = OVERWRITE) {
    const set = {}

    for (const field of SCRIPTURE_FIELDS) {
        const fetched = texts?.[field]
        if (!fetched) continue

        // Never write over text a person entered unless explicitly asked to.
        if (artwork.scripture?.[field]?.trim() && !overwrite) continue

        set[`scripture.${field}`] = fetched
    }

    return set
}

async function main() {
    const client = getWriteClient()
    await preflight()

    const docs = await client.fetch(
        `*[_type == "artwork" && defined(bibleReference) && bibleReference != ""]{
            _id, bibleReference, scripture
        } | order(date desc, _id asc)`,
    )

    const targets = docs.filter(needsWork)
    const selected = LIMIT > 0 ? targets.slice(0, LIMIT) : targets
    const references = [...new Set(selected.map((doc) => doc.bibleReference.trim()))]

    console.log(`Endpoint:                      ${API}`)
    console.log(`Artworks with a reference:     ${docs.length}`)
    console.log(`Still missing scripture:       ${targets.length}`)
    if (LIMIT > 0) console.log(`--limit ${LIMIT}: processing        ${selected.length}`)
    console.log(`Unique references to look up:  ${references.length}`)
    if (OVERWRITE) console.log('--overwrite: existing text will be replaced.')

    if (references.length === 0) {
        console.log('\nNothing to do.')
        return
    }

    // One lookup per distinct citation, shared by every artwork quoting it.
    const resolved = new Map()
    let done = 0

    const estimate = Math.ceil((references.length * MIN_INTERVAL_MS) / 60_000)
    console.log(`\nLooking up at ${RATE_PER_MINUTE}/min (about ${estimate} min)…`)

    let halted = null

    for (const reference of references) {
        const startedAt = Date.now()
        const result = await lookup(reference)
        resolved.set(reference, result)
        done += 1

        if (done % 25 === 0 || done === references.length) {
            console.log(`  ${done}/${references.length}`)
        }

        // A spent quota or a rejected key fails every remaining reference the
        // same way. Carrying on would waste minutes and, worse, file a provider
        // outage under "needs a person" as though the data were at fault.
        if (result.unavailableProviders?.length) {
            halted = {providers: result.unavailableProviders, attempted: done}
            break
        }

        // A rejected reference never reached a provider, so it owes the rate
        // limit nothing. Pacing otherwise counts the request's own duration.
        if (result.invalid || done === references.length) continue

        const remaining = MIN_INTERVAL_MS - (Date.now() - startedAt)
        if (remaining > 0) await sleep(remaining)
    }

    if (halted) {
        const remaining = references.length - halted.attempted

        console.error('\nStopped — a scripture provider cannot serve requests right now:')
        for (const provider of halted.providers) {
            console.error(`  ${provider.reason}`)
        }
        console.error(
            `\nLooked up ${halted.attempted} of ${references.length}; ${remaining} not attempted.`,
        )
        console.error('Nothing was written. Run again once the provider recovers.')
        console.error('A per-day cap resets on its own; BIBLESUPERSEARCH_ENDPOINT can point at')
        console.error('a self-hosted instance if the public quota is too small for the archive.')
        process.exit(1)
    }

    const writes = []
    const unresolved = new Map()
    const partial = new Map()
    const filledPerField = {zhTW: 0, zhCN: 0, en: 0}
    let newlyGalleryEligible = 0

    for (const artwork of selected) {
        const reference = artwork.bibleReference.trim()
        const result = resolved.get(reference)
        const set = plannedSet(artwork, result.texts)

        if (Object.keys(set).length === 0) {
            const reason = reasonsFor(result, SCRIPTURE_FIELDS)
            if (reason) unresolved.set(reference, reason)
            continue
        }

        for (const field of SCRIPTURE_FIELDS) {
            if (set[`scripture.${field}`]) filledPerField[field] += 1
        }

        // One provider answering and the other not is easy to miss in the
        // totals, and an artwork left without zhCN stays out of the gallery.
        const stillEmpty = SCRIPTURE_FIELDS.filter(
            (field) => !set[`scripture.${field}`] && !artwork.scripture?.[field]?.trim(),
        )
        if (stillEmpty.length > 0) {
            partial.set(reference, {missing: stillEmpty, reason: reasonsFor(result, stillEmpty)})
        }

        // scripture.zhCN is a gallery gate, so gaining it changes what the
        // public site can show.
        if (set['scripture.zhCN'] && !artwork.scripture?.zhCN?.trim()) {
            newlyGalleryEligible += 1
        }

        writes.push({id: artwork._id, set})
    }

    console.log(`\nArtworks to patch:             ${writes.length}`)
    console.log(`  zhTW filled:                 ${filledPerField.zhTW}`)
    console.log(`  zhCN filled:                 ${filledPerField.zhCN}`)
    console.log(`  en filled:                   ${filledPerField.en}`)
    console.log(`\nGaining scripture.zhCN:        ${newlyGalleryEligible}`)
    console.log('  These become visible on the public gallery once they also pass')
    console.log('  the selection criteria. Set galleryVisibility to "never" on any')
    console.log('  that should stay hidden.')

    if (partial.size > 0) {
        console.log(`\nPartly resolved (${partial.size}) — check these, the gaps need a person:`)
        for (const [reference, {missing, reason}] of partial) {
            console.log(`  ${reference.padEnd(28)} no ${missing.join('/')}  ${reason}`)
        }
    }

    if (unresolved.size > 0) {
        console.log(`\nReferences that resolved nowhere (${unresolved.size}) — enter by hand:`)
        for (const [reference, reason] of unresolved) {
            console.log(`  ${reference.padEnd(28)} ${reason}`)
        }
    }

    if (DRY_RUN) {
        console.log('\n--dry-run: nothing written to Sanity.')
        return
    }

    if (writes.length === 0) {
        console.log('\nNothing to write.')
        return
    }

    console.log('')
    let committed = 0
    for (let index = 0; index < writes.length; index += PATCHES_PER_TRANSACTION) {
        const chunk = writes.slice(index, index + PATCHES_PER_TRANSACTION)
        const transaction = client.transaction()

        for (const {id, set} of chunk) {
            transaction.patch(id, {
                // The field may not exist yet on artworks the importer created.
                setIfMissing: {scripture: {_type: 'localeText'}},
                set,
            })
        }

        await transaction.commit()
        committed += chunk.length
        console.log(`  committed ${committed}/${writes.length}`)
    }

    console.log('\nDone. Only empty fields were filled; existing text was left alone.')
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
