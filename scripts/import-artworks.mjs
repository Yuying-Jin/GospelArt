/**
 * One-off migration: the Gospel Artwork Archives workbook -> Sanity.
 *
 *   node scripts/seed-taxonomies.mjs          # run this first
 *   node scripts/import-artworks.mjs --dry-run
 *   node scripts/import-artworks.mjs
 *
 * Options
 *   --dry-run          Report what would happen; write nothing.
 *   --limit N          Only process the first N artworks (trial run).
 *   --skip-images      Create/patch documents but do not touch any image.
 *   --create-only      Never patch documents that already exist. By default a
 *                      rerun re-syncs the workbook-owned fields listed in
 *                      WORKBOOK_OWNED_FIELDS onto existing documents.
 *   --concurrency N    Parallel image downloads/uploads (default 4).
 *   --file PATH        Workbook to read (defaults to the one in the repo root).
 *
 * Idempotency
 *  - **Document identity** is `artwork-<sha1(sourceKey)>`, where sourceKey is the
 *    *immutable* part of the Dropbox share link — the `scl/fi/<file-id>` segment
 *    where present, otherwise the full URL pathname. Query parameters (`rlkey`,
 *    `st`, `dl`) and the trailing filename are excluded, so re-sharing or
 *    renaming the file in Dropbox does not mint a second artwork. Identity is
 *    deliberately NOT the gallery slug: slugs are editor-changeable via the
 *    "Change gallery URL" action and are archived into `previousSlugs`.
 *  - **Assets are deduplicated twice over.** An artwork that already has an
 *    image is skipped entirely (no download, no upload). If it does not, the
 *    downloaded bytes are SHA-1'd and matched against existing
 *    `sanity.imageAsset` documents, so an upload that succeeded before a failed
 *    patch is reused rather than duplicated.
 *  - **Editor content is never touched on rerun.** Only the fields in
 *    WORKBOOK_OWNED_FIELDS are ever patched, and only when they actually differ.
 *    Scripture, translations, sections, themes, slug, previousSlugs,
 *    galleryVisibility and image crops are written on creation at most.
 *  - The six trailing "Summary" rows in the workbook are tallies, not artworks
 *    (their selection columns hold counts like 150/194/302). Rows without an
 *    image URL and a date are dropped, leaving 302 artworks.
 *  - No Dropbox token is needed: the stored links are public share URLs, so the
 *    images are downloaded directly over HTTPS.
 *  - Scripture text does not exist anywhere in the workbook, so imported
 *    artworks start without it. They are visible in the Studio but withheld from
 *    the public gallery, which requires scripture — see lib/sanity/queries.ts.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import XLSX from 'xlsx'
import {arrayKey, getWriteClient} from './lib/scriptClient.mjs'

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flag(name) {
    return process.argv.includes(`--${name}`)
}

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? fallback : process.argv[index + 1]
}

const DRY_RUN = flag('dry-run')
const SKIP_IMAGES = flag('skip-images')
const CREATE_ONLY = flag('create-only')
const LIMIT = Number(option('limit', 0)) || 0
const CONCURRENCY = Math.max(1, Number(option('concurrency', 4)) || 4)
const WORKBOOK = option('file', 'Gospel Artwork Archives (2025-06-08).xlsx')

/**
 * Which section type the workbook's "Artwork description" becomes. It reads as
 * the ministry's own sharing/devotional text, so it lands under that heading in
 * Simplified Chinese with the other languages left for collaborators.
 */
const DESCRIPTION_SECTION_TYPE = 'section-type-devotional'

/**
 * The only fields the importer owns. Everything else on an artwork belongs to
 * whoever is editing it in the Studio and is never patched by a rerun.
 */
export const WORKBOOK_OWNED_FIELDS = [
    'bibleReference',
    'date',
    'artworkSubject',
    'scriptureFellowship',
    'notes',
    'repetition',
    'quality',
    'creativity',
    'optimizedSelection',
    'overallSelection',
    'dropboxPath',
]

// ---------------------------------------------------------------------------
// Workbook parsing
// ---------------------------------------------------------------------------

/**
 * Column headers embed their own legend across several lines, e.g.
 * "Quality:\r\nH = Impactful, \r\nM = Symbolic, \r\nL = Mediocre". Matching on
 * the part before the first colon keeps this working if the legend is reworded.
 */
const HEADER_MAP = {
    'bible scripture': 'bibleReference',
    'artwork theme': 'artworkSubject',
    'date of artwork produced': 'date',
    'artwork image': 'imageUrl',
    'artwork description': 'description',
    'scripture fellowship': 'scriptureFellowship',
    'video clip or other notes': 'notes',
    'optimized selection': 'optimizedSelection',
    'overall selection': 'overallSelection',
    'selection criteria': 'workbookSelectionCriteria',
    repetition: 'repetition',
    quality: 'quality',
    creativity: 'creativity',
}

function normalizeHeader(header) {
    return String(header)
        .replace(/[\r\n]+/g, ' ')
        .split(':')[0]
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
}

const EMPTY_VALUES = new Set(['', 'n/a', 'na', 'none', '-'])

function text(value) {
    const trimmed = String(value ?? '').trim()
    return EMPTY_VALUES.has(trimmed.toLowerCase()) ? '' : trimmed
}

function code(value) {
    const trimmed = String(value ?? '').trim().toUpperCase()
    return EMPTY_VALUES.has(trimmed.toLowerCase()) ? '' : trimmed
}

function excelDate(value) {
    if (typeof value === 'number') return XLSX.SSF.format('yyyy-mm-dd', value)

    const trimmed = String(value ?? '').trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber) && asNumber > 0) {
        return XLSX.SSF.format('yyyy-mm-dd', asNumber)
    }
    return ''
}

export function readWorkbook(file) {
    const full = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
    if (!fs.existsSync(full)) {
        console.error(`Workbook not found: ${full}`)
        process.exit(1)
    }

    const workbook = XLSX.read(fs.readFileSync(full), {type: 'buffer'})
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, {defval: '', raw: true})

    return rows.map((row, index) => {
        const mapped = {sheetRow: index + 2}
        for (const [header, value] of Object.entries(row)) {
            const key = HEADER_MAP[normalizeHeader(header)]
            if (key) mapped[key] = value
        }
        return mapped
    })
}

// ---------------------------------------------------------------------------
// Slugs — must match lib/artworkSlug.ts byte for byte
// ---------------------------------------------------------------------------

function slugifyBibleReference(bibleReference) {
    return String(bibleReference)
        .toLowerCase()
        .trim()
        .replace(/[:.]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export function buildArtworkSlug(date, bibleReference) {
    if (!date || !bibleReference) return ''
    return `${date}_${slugifyBibleReference(bibleReference)}`
}

/**
 * The workbook genuinely contains a duplicate (2024-11-16 / Proverbs 10:29
 * twice) and 20 dates carry more than one artwork, so slugs are not unique by
 * construction. Suffixes are assigned in workbook order, which makes them
 * reproducible across runs.
 */
function uniqueSlug(base, taken) {
    if (!base) return ''
    if (!taken.has(base)) return base

    let suffix = 2
    while (taken.has(`${base}-${suffix}`)) suffix += 1
    return `${base}-${suffix}`
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * The immutable part of a Dropbox share link.
 *
 * A link looks like
 *   https://www.dropbox.com/scl/fi/<file-id>/<filename>?rlkey=..&st=..&dl=0
 * The query string rotates (`st` is a short-lived token) and the filename can be
 * changed by renaming the file, but `<file-id>` is assigned once and never
 * changes. Keying identity on it means neither re-sharing nor renaming produces
 * a duplicate artwork.
 */
export function sourceKeyFor(imageUrl) {
    let pathname = String(imageUrl ?? '')
    try {
        pathname = new URL(imageUrl).pathname
    } catch {
        // Not a parseable URL — fall back to the raw string.
    }

    const scl = pathname.match(/\/scl\/fi\/([^/]+)/)
    return scl ? `scl/fi/${scl[1]}` : pathname
}

export function documentId(imageUrl) {
    const key = sourceKeyFor(imageUrl)
    return `artwork-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 20)}`
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

function toDownloadUrl(shareUrl) {
    const url = new URL(shareUrl)
    url.searchParams.delete('raw')
    url.searchParams.set('dl', '1')
    return url.toString()
}

function filenameFor(shareUrl, fallback) {
    try {
        const segments = new URL(shareUrl).pathname.split('/')
        const last = decodeURIComponent(segments[segments.length - 1] || '')
        if (last) return last
    } catch {
        // fall through
    }
    return `${fallback}.jpg`
}

async function download(artwork) {
    const response = await fetch(toDownloadUrl(artwork.imageUrl), {redirect: 'follow'})
    if (!response.ok) {
        throw new Error(`download failed with HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.startsWith('text/html')) {
        throw new Error('Dropbox returned an HTML page rather than the file')
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength === 0) {
        throw new Error('downloaded file was empty')
    }

    return {buffer, contentType}
}

/**
 * Returns an asset id for this artwork's image, uploading only if those exact
 * bytes are not already in the dataset.
 *
 * Sanity stores `sha1hash` on every image asset, so hashing the download gives
 * an exact content match. This is the safety net for the one sequence that could
 * otherwise orphan a duplicate asset: upload succeeds, the patch that attaches
 * it fails, and the next run downloads the same bytes again.
 */
export async function resolveAsset(client, artwork, {lookupAsset, upload} = {}) {
    const {buffer, contentType} = await download(artwork)
    const sha1 = crypto.createHash('sha1').update(buffer).digest('hex')

    const find =
        lookupAsset ??
        ((hash) =>
            client.fetch(`*[_type == "sanity.imageAsset" && sha1hash == $hash][0]._id`, {
                hash,
            }))

    try {
        const existingAssetId = await find(sha1)
        if (existingAssetId) {
            return {assetId: existingAssetId, reused: true}
        }
    } catch (error) {
        // A failed lookup must not block the import; the worst case is that
        // Sanity's own upload-side dedup handles it.
        console.warn(`   asset lookup failed for ${artwork.bibleReference}, uploading anyway`)
    }

    const doUpload =
        upload ??
        ((bytes) =>
            client.assets.upload('image', bytes, {
                filename: filenameFor(artwork.imageUrl, artwork.slug || artwork._id),
                // Dropbox answers with "application/binary" rather than an image
                // type, so only a real image/* value is forwarded — otherwise
                // Sanity detects the type from the file itself.
                contentType: contentType.startsWith('image/') ? contentType : undefined,
            }))

    const asset = await doUpload(buffer)
    return {assetId: asset._id, reused: false}
}

/** Small worker pool so 302 downloads are not strictly sequential. */
async function pooled(items, size, worker) {
    let cursor = 0
    const runners = Array.from({length: Math.min(size, items.length)}, async () => {
        while (cursor < items.length) {
            const index = cursor
            cursor += 1
            await worker(items[index], index)
        }
    })
    await Promise.all(runners)
}

// ---------------------------------------------------------------------------
// Chinese script detection
// ---------------------------------------------------------------------------

/**
 * Characters that exist only in Simplified, paired index-for-index with their
 * Traditional counterparts. Not exhaustive — enough high-frequency pairs to
 * classify a sentence of devotional prose.
 */
const SIMPLIFIED_ONLY = new Set(
    '诗让们说时来会为无见爱华荣与这个样边过远灵记圣经后传从众义门学问题风飞马鸟鱼车东语话谁买卖对开关闭书画图国园长张乐医药亲节庆办务动员产业丝电脑机点烦恼欢',
)
const TRADITIONAL_ONLY = new Set(
    '詩讓們說時來會為無見愛華榮與這個樣邊過遠靈記聖經後傳從眾義門學問題風飛馬鳥魚車東語話誰買賣對開關閉書畫圖國園長張樂醫藥親節慶辦務動員產業絲電腦機點煩惱歡',
)

/**
 * Which locale field a piece of workbook Chinese actually belongs in.
 *
 * The workbook was written over several years in mixed script — of the 33 rows
 * carrying description text, 16 are clearly Simplified, 3 clearly Traditional
 * and 14 mix both within one message. Routing everything to a single field
 * would file most of it under the wrong language, so each row goes to the field
 * matching its dominant script.
 *
 * Undetectable or tied text goes to `zhTW`, the primary/original field.
 */
export function detectChineseScript(value) {
    let simplified = 0
    let traditional = 0

    for (const char of String(value ?? '')) {
        if (SIMPLIFIED_ONLY.has(char)) simplified += 1
        if (TRADITIONAL_ONLY.has(char)) traditional += 1
    }

    const field = simplified > traditional ? 'zhCN' : 'zhTW'
    return {
        field,
        simplified,
        traditional,
        mixed: simplified > 0 && traditional > 0,
        undetectable: simplified === 0 && traditional === 0,
    }
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export function buildArtworks(rows) {
    const skipped = []
    const candidates = []

    for (const row of rows) {
        const imageUrl = text(row.imageUrl)
        const date = excelDate(row.date)
        const bibleReference = text(row.bibleReference)

        if (!imageUrl.startsWith('http') || !date) {
            skipped.push({
                sheetRow: row.sheetRow,
                reference: bibleReference || String(row.bibleReference ?? '').trim(),
                reason: !imageUrl.startsWith('http') ? 'no image link' : 'no date',
            })
            continue
        }

        candidates.push({
            sheetRow: row.sheetRow,
            imageUrl,
            date,
            bibleReference,
            artworkSubject: text(row.artworkSubject),
            description: text(row.description),
            scriptureFellowship: text(row.scriptureFellowship),
            notes: text(row.notes),
            repetition: code(row.repetition),
            quality: code(row.quality),
            creativity: code(row.creativity),
            optimizedSelection: code(row.optimizedSelection),
            overallSelection: code(row.overallSelection),
        })
    }

    return {candidates, skipped}
}

export function sourceFields(artwork) {
    const fields = {
        bibleReference: artwork.bibleReference,
        date: artwork.date,
        dropboxPath: artwork.imageUrl,
    }

    // Only set what the workbook actually holds, so empty cells do not write
    // empty strings over anything an editor may have filled in.
    if (artwork.artworkSubject) fields.artworkSubject = artwork.artworkSubject
    if (artwork.scriptureFellowship) fields.scriptureFellowship = artwork.scriptureFellowship
    if (artwork.notes) fields.notes = artwork.notes
    if (artwork.repetition) fields.repetition = artwork.repetition
    if (artwork.quality) fields.quality = artwork.quality
    if (artwork.creativity) fields.creativity = artwork.creativity
    if (artwork.optimizedSelection) fields.optimizedSelection = artwork.optimizedSelection
    if (['S1', 'S2', 'S3', 'N'].includes(artwork.overallSelection)) {
        fields.overallSelection = artwork.overallSelection
    }

    return fields
}

/** Workbook-owned fields whose value in Sanity differs from the workbook. */
export function driftedFields(artwork, known) {
    const wanted = sourceFields(artwork)
    const patch = {}

    for (const key of Object.keys(wanted)) {
        if (!WORKBOOK_OWNED_FIELDS.includes(key)) continue
        if (known[key] !== wanted[key]) patch[key] = wanted[key]
    }

    return patch
}

/**
 * Decides, for every candidate row, what this run should do — without touching
 * the network. `existing` maps document id -> the workbook-owned fields plus
 * slug/previousSlugs/hasImage currently in Sanity.
 *
 * Pure and exported so idempotency can be asserted offline; see
 * scripts/verify-import-idempotency.mjs.
 */
export function planArtworks(candidates, existing, options = {}) {
    const {skipImages = false, createOnly = false} = options

    const takenSlugs = new Set()
    for (const doc of existing.values()) {
        if (doc.slug) takenSlugs.add(doc.slug)
        for (const previous of doc.previousSlugs ?? []) takenSlugs.add(previous)
    }

    const planned = []

    for (const candidate of candidates) {
        const artwork = {...candidate}
        artwork._id = documentId(artwork.imageUrl)
        artwork.sourceKey = sourceKeyFor(artwork.imageUrl)

        const known = existing.get(artwork._id)

        if (known) {
            // Never recompute the slug for an existing artwork: it may have been
            // changed deliberately via "Change gallery URL", and the old value
            // lives on in previousSlugs so shared links keep resolving.
            artwork.slug = known.slug ?? ''
            artwork.patch = createOnly ? {} : driftedFields(artwork, known)
            artwork.action = Object.keys(artwork.patch).length > 0 ? 'update' : 'unchanged'
            artwork.needsImage = !skipImages && !known.hasImage
        } else {
            artwork.slug = uniqueSlug(
                buildArtworkSlug(artwork.date, artwork.bibleReference),
                takenSlugs,
            )
            artwork.patch = {}
            artwork.action = 'create'
            artwork.needsImage = !skipImages
        }

        if (artwork.slug) takenSlugs.add(artwork.slug)
        planned.push(artwork)
    }

    return planned
}

export function descriptionSection(artwork, sectionTypeExists) {
    if (!artwork.description || !sectionTypeExists) return undefined

    // Never blanket-assign to one language: the field is chosen from the text's
    // own script. The other two stay empty for a collaborator to translate.
    const {field} = detectChineseScript(artwork.description)
    const body = {_type: 'localeText', zhTW: '', zhCN: '', en: ''}
    body[field] = artwork.description

    return [
        {
            _type: 'artworkSection',
            _key: arrayKey(`${artwork._id}:description`),
            sectionType: {_type: 'reference', _ref: DESCRIPTION_SECTION_TYPE},
            body,
        },
    ]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const rows = readWorkbook(WORKBOOK)
    const {candidates, skipped} = buildArtworks(rows)

    console.log(`Workbook rows read:        ${rows.length}`)
    console.log(`Artwork rows:              ${candidates.length}`)
    console.log(`Skipped (not artworks):    ${skipped.length}`)
    for (const row of skipped) {
        console.log(`   row ${row.sheetRow}: ${row.reason}${row.reference ? ` (${row.reference})` : ''}`)
    }

    const client = DRY_RUN ? null : getWriteClient()

    let existing = new Map()
    let sectionTypeExists = true

    if (client) {
        const projection = WORKBOOK_OWNED_FIELDS.join(', ')
        const docs = await client.fetch(
            `*[_type == "artwork"]{_id, "slug": slug.current, previousSlugs, "hasImage": defined(image.asset), ${projection}}`,
        )
        existing = new Map(docs.map((doc) => [doc._id, doc]))

        sectionTypeExists = Boolean(
            await client.fetch(`defined(*[_id == $id][0]._id)`, {id: DESCRIPTION_SECTION_TYPE}),
        )
        if (!sectionTypeExists) {
            console.warn(
                `\nWarning: ${DESCRIPTION_SECTION_TYPE} is missing — run scripts/seed-taxonomies.mjs first.`,
            )
            console.warn('Workbook descriptions will be skipped for now.')
        }
    }

    const selected = LIMIT ? candidates.slice(0, LIMIT) : candidates
    const planned = planArtworks(selected, existing, {
        skipImages: SKIP_IMAGES,
        createOnly: CREATE_ONLY,
    })

    const toCreate = planned.filter((artwork) => artwork.action === 'create')
    const toUpdate = planned.filter((artwork) => artwork.action === 'update')
    const unchanged = planned.filter((artwork) => artwork.action === 'unchanged')
    const imageQueue = planned.filter((artwork) => artwork.needsImage)
    const withoutSlug = planned.filter((artwork) => !artwork.slug)

    console.log(`\nAlready in Sanity:         ${existing.size}`)
    console.log(`To create:                 ${toCreate.length}`)
    console.log(`To update (drifted):       ${toUpdate.length}`)
    console.log(`Unchanged:                 ${unchanged.length}`)
    console.log(`Images to resolve:         ${imageQueue.length}`)
    if (withoutSlug.length) {
        console.log(`Missing a slug (no reference): ${withoutSlug.length}`)
    }
    if (CREATE_ONLY) {
        console.log('--create-only: existing documents will not be patched.')
    }

    const described = planned.filter((artwork) => artwork.description)
    if (described.length) {
        const routed = described.map((artwork) => ({
            artwork,
            ...detectChineseScript(artwork.description),
        }))
        const toTW = routed.filter((r) => r.field === 'zhTW').length
        const mixed = routed.filter((r) => r.mixed)

        console.log(`
Workbook descriptions:     ${described.length}`)
        console.log(`  -> zhTW (Traditional):   ${toTW}`)
        console.log(`  -> zhCN (Simplified):    ${described.length - toTW}`)
        console.log(`  mixed script, review:    ${mixed.length}`)
        for (const entry of mixed) {
            console.log(
                `     row ${entry.artwork.sheetRow} -> ${entry.field}  (${entry.traditional} trad / ${entry.simplified} simp)  ${entry.artwork.bibleReference}`,
            )
        }
    }

    if (DRY_RUN) {
        console.log('\nFirst 5 planned documents:')
        for (const artwork of planned.slice(0, 5)) {
            console.log(
                `  [${artwork.action}] ${artwork._id}  ${artwork.date}  ${artwork.slug || '(no slug)'}  ${artwork.bibleReference}`,
            )
        }
        console.log('\n--dry-run: nothing written.')
        return
    }

    // 1. Documents first, so an interrupted image pass can be resumed.
    for (let start = 0; start < planned.length; start += 50) {
        const batch = planned.slice(start, start + 50)
        const transaction = client.transaction()
        let writes = 0

        for (const artwork of batch) {
            if (artwork.action === 'create') {
                const doc = {
                    _id: artwork._id,
                    _type: 'artwork',
                    ...sourceFields(artwork),
                    galleryVisibility: 'auto',
                }
                if (artwork.slug) doc.slug = {_type: 'slug', current: artwork.slug}

                const sections = descriptionSection(artwork, sectionTypeExists)
                if (sections) doc.sections = sections

                transaction.createIfNotExists(doc)
                writes += 1
            } else if (artwork.action === 'update') {
                transaction.patch(artwork._id, {set: artwork.patch})
                writes += 1
            }
        }

        if (writes > 0) await transaction.commit()
        console.log(`documents: ${Math.min(start + 50, planned.length)}/${planned.length}`)
    }

    // 2. Images.
    const failures = []
    let reusedAssets = 0
    let uploadedAssets = 0
    let done = 0

    if (imageQueue.length) {
        console.log(`\nResolving ${imageQueue.length} image(s) with concurrency ${CONCURRENCY}...`)

        await pooled(imageQueue, CONCURRENCY, async (artwork) => {
            try {
                const {assetId, reused} = await resolveAsset(client, artwork)
                if (reused) reusedAssets += 1
                else uploadedAssets += 1

                await client
                    .patch(artwork._id)
                    .set({image: {_type: 'image', asset: {_type: 'reference', _ref: assetId}}})
                    .commit()
            } catch (error) {
                failures.push({
                    sheetRow: artwork.sheetRow,
                    reference: artwork.bibleReference,
                    message: error instanceof Error ? error.message : String(error),
                })
            } finally {
                done += 1
                if (done % 10 === 0 || done === imageQueue.length) {
                    console.log(`images: ${done}/${imageQueue.length}`)
                }
            }
        })
    }

    console.log('\n--- Summary ---')
    console.log(`Documents created:         ${toCreate.length}`)
    console.log(`Documents updated:         ${toUpdate.length}`)
    console.log(`Documents unchanged:       ${unchanged.length}`)
    console.log(`Assets uploaded:           ${uploadedAssets}`)
    console.log(`Assets reused (dedup):     ${reusedAssets}`)
    console.log(`Image failures:            ${failures.length}`)
    for (const failure of failures) {
        console.log(`   row ${failure.sheetRow} (${failure.reference}): ${failure.message}`)
    }
    if (failures.length) {
        console.log('\nRe-run the script to retry only the failures — it is idempotent.')
    }
    console.log(
        '\nImported artworks have no scripture text yet, so they stay out of the public gallery',
    )
    console.log('until a collaborator adds it. See "Missing scripture" in the Studio sidebar.')
}

// Only run when executed directly, so the exported helpers above can be
// imported by the verification script without kicking off an import.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    main().catch((error) => {
        console.error(error)
        process.exit(1)
    })
}
