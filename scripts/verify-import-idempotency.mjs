/**
 * Proves the importer is safe to run twice, without writing to Sanity.
 *
 *   node scripts/verify-import-idempotency.mjs
 *
 * Runs the importer's real planning code against the real workbook, simulating
 * what Sanity would hold after each run:
 *
 *   run 1  empty dataset            -> creates everything, resolves every image
 *   run 2  identical source data    -> no creates, no updates, no image work
 *   run 3  one metadata cell edited -> one targeted update, still no creates
 *   run 4  collaborator has edited  -> editor content survives untouched
 *
 * It also exercises asset deduplication with a stubbed lookup/upload pair, and
 * performs one real download so the SHA-1 path is genuinely covered.
 */
import {
    buildArtworkSlug,
    buildArtworks,
    descriptionSection,
    documentId,
    driftedFields,
    planArtworks,
    readWorkbook,
    resolveAsset,
    sourceFields,
    sourceKeyFor,
    WORKBOOK_OWNED_FIELDS,
} from './import-artworks.mjs'

const WORKBOOK = 'Gospel Artwork Archives (2025-06-08).xlsx'

let failures = 0

function check(label, condition, detail = '') {
    if (condition) {
        console.log(`  PASS  ${label}`)
    } else {
        failures += 1
        console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
    }
}

function counts(planned) {
    return {
        create: planned.filter((a) => a.action === 'create').length,
        update: planned.filter((a) => a.action === 'update').length,
        unchanged: planned.filter((a) => a.action === 'unchanged').length,
        images: planned.filter((a) => a.needsImage).length,
    }
}

/**
 * Builds the `existing` map the importer would read back from Sanity after a
 * run, i.e. workbook-owned fields plus slug and an attached image.
 */
function simulateSanity(planned, {attachImages = true} = {}) {
    const existing = new Map()
    for (const artwork of planned) {
        existing.set(artwork._id, {
            _id: artwork._id,
            slug: artwork.slug,
            previousSlugs: [],
            hasImage: attachImages,
            ...sourceFields(artwork),
        })
    }
    return existing
}

// ---------------------------------------------------------------------------

console.log('\n=== Scope: 302 artworks, 6 Summary rows excluded ===')

const rows = readWorkbook(WORKBOOK)
const {candidates, skipped} = buildArtworks(rows)

check('workbook has 308 rows', rows.length === 308, `got ${rows.length}`)
check('302 artwork rows', candidates.length === 302, `got ${candidates.length}`)
check('6 rows skipped', skipped.length === 6, `got ${skipped.length}`)
check(
    'all skipped rows are the trailing Summary block',
    skipped.every((row) => row.sheetRow >= 304),
    JSON.stringify(skipped.map((r) => r.sheetRow)),
)

// ---------------------------------------------------------------------------

console.log('\n=== Identity: stable, derived from source, not the slug ===')

const run1 = planArtworks(candidates, new Map())
const ids = run1.map((a) => a._id)

check('every artwork got an id', ids.every(Boolean))
check('all 302 ids are unique', new Set(ids).size === 302, `got ${new Set(ids).size} distinct`)

const rerunIds = planArtworks(candidates, new Map()).map((a) => a._id)
check('ids are identical across two independent runs', ids.join() === rerunIds.join())

const sample = candidates[0].imageUrl
const rotatedToken = sample.replace(/([?&])st=[^&]*/, '$1st=ROTATED')
const renamedFile = sample.replace(/\/([^/?]+)(\?|$)/, '/RENAMED.JPG$2')
const noQuery = sample.split('?')[0]

check(
    'id survives a rotated st= token',
    documentId(sample) === documentId(rotatedToken),
    `${sourceKeyFor(sample)} vs ${sourceKeyFor(rotatedToken)}`,
)
check(
    'id survives the file being renamed',
    documentId(sample) === documentId(renamedFile),
    `${sourceKeyFor(sample)} vs ${sourceKeyFor(renamedFile)}`,
)
check('id survives the query string being dropped', documentId(sample) === documentId(noQuery))
check(
    'source key is the immutable scl/fi/<file-id> segment',
    /^scl\/fi\/[^/]+$/.test(sourceKeyFor(sample)),
    sourceKeyFor(sample),
)

// Identity must not be the slug: two rows share date+reference, so a
// slug-derived identity would have collapsed them into one document.
// A collision is an assigned slug that differs from the slug the row would
// naturally produce — note many references legitimately end in "-2"
// (Psalms 18:2 -> psalms-18-2), so the suffix alone proves nothing.
const collisions = run1.filter(
    (a) => a.slug !== buildArtworkSlug(a.date, a.bibleReference),
)
check(
    'exactly one date+reference collision, resolved by suffix',
    collisions.length === 1,
    JSON.stringify(collisions.map((a) => a.slug)),
)
check(
    'the colliding pair are two distinct documents, not one',
    new Set(ids).size === 302 &&
        collisions[0]?.slug === '2024-11-16_proverbs-10-29-2' &&
        run1.filter((a) => a.slug.startsWith('2024-11-16_proverbs-10-29')).length === 2,
    JSON.stringify(
        run1.filter((a) => a.slug.startsWith('2024-11-16_proverbs-10-29')).map((a) => ({id: a._id, slug: a.slug})),
    ),
)
check(
    'all 302 assigned slugs are unique',
    new Set(run1.map((a) => a.slug)).size === 302,
)

// ---------------------------------------------------------------------------

console.log('\n=== Run 1: empty dataset ===')

const c1 = counts(run1)
check('creates all 302', c1.create === 302, JSON.stringify(c1))
check('no updates', c1.update === 0, JSON.stringify(c1))
check('resolves 302 images', c1.images === 302, JSON.stringify(c1))

// ---------------------------------------------------------------------------

console.log('\n=== Run 2: identical source data ===')

const afterRun1 = simulateSanity(run1)
const run2 = planArtworks(candidates, afterRun1)
const c2 = counts(run2)

check('creates nothing', c2.create === 0, JSON.stringify(c2))
check('updates nothing', c2.update === 0, JSON.stringify(c2))
check('all 302 reported unchanged', c2.unchanged === 302, JSON.stringify(c2))
check('resolves no images', c2.images === 0, JSON.stringify(c2))
check(
    'ids unchanged from run 1',
    run2.map((a) => a._id).join() === ids.join(),
)

// ---------------------------------------------------------------------------

console.log('\n=== Run 3: one metadata cell changed in the workbook ===')

const edited = candidates.map((c, i) => (i === 5 ? {...c, quality: 'H', notes: 'new note'} : {...c}))
const run3 = planArtworks(edited, afterRun1)
const c3 = counts(run3)
const updatedDoc = run3.find((a) => a.action === 'update')

check('creates nothing', c3.create === 0, JSON.stringify(c3))
check('updates exactly one document', c3.update === 1, JSON.stringify(c3))
check('resolves no images', c3.images === 0, JSON.stringify(c3))
check(
    'patch contains only the changed workbook fields',
    updatedDoc && JSON.stringify(Object.keys(updatedDoc.patch).sort()) === '["notes","quality"]',
    updatedDoc ? JSON.stringify(updatedDoc.patch) : 'no update found',
)
check(
    'the updated document kept its identity',
    updatedDoc && updatedDoc._id === run1[5]._id,
)

// ---------------------------------------------------------------------------

console.log('\n=== Run 4: collaborator has edited the artwork in Sanity ===')

// A collaborator added scripture and sections, then used "Change gallery URL".
const afterEditing = simulateSanity(run1)
const target = run1[0]
afterEditing.set(target._id, {
    ...afterEditing.get(target._id),
    slug: 'a-hand-picked-url',
    previousSlugs: [target.slug],
    scripture: {zhCN: '复活在我', zhTW: '復活在我', en: 'I am the resurrection'},
    sections: [{_key: 'x', body: {zhCN: 'editor wrote this'}}],
    bibleThemes: [{_ref: 'bible-theme-gospels'}],
    galleryVisibility: 'always',
})

const run4 = planArtworks(candidates, afterEditing)
const c4 = counts(run4)
const targetPlan = run4.find((a) => a._id === target._id)

check('creates nothing despite the changed slug', c4.create === 0, JSON.stringify(c4))
check('updates nothing', c4.update === 0, JSON.stringify(c4))
check(
    'the hand-picked gallery URL is preserved, not recomputed',
    targetPlan.slug === 'a-hand-picked-url',
    targetPlan.slug,
)
check('nothing is patched onto the edited document', Object.keys(targetPlan.patch).length === 0)
check(
    'importer only ever owns workbook fields',
    !WORKBOOK_OWNED_FIELDS.some((f) =>
        ['scripture', 'sections', 'slug', 'previousSlugs', 'galleryVisibility', 'bibleThemes', 'spiritualThemes', 'image'].includes(f),
    ),
    WORKBOOK_OWNED_FIELDS.join(', '),
)

// Even with --create-only, an existing document is never patched.
const run4CreateOnly = planArtworks(edited, afterRun1, {createOnly: true})
check(
    '--create-only patches nothing at all',
    counts(run4CreateOnly).update === 0 && counts(run4CreateOnly).create === 0,
    JSON.stringify(counts(run4CreateOnly)),
)

// ---------------------------------------------------------------------------

console.log('\n=== Language ownership: zhTW is primary, nothing is misfiled ===')

const twRow ={_id: 'x', description: '這幅作品創作於清晨', bibleReference: 'John 1:1'}
const cnRow = {_id: 'y', description: '这幅作品创作于清晨', bibleReference: 'John 1:2'}
const twBody = descriptionSection(twRow, true)[0].body
const cnBody = descriptionSection(cnRow, true)[0].body

check(
    'a Traditional description lands in zhTW only',
    twBody.zhTW === twRow.description && twBody.zhCN === '',
)
check(
    'a Simplified description also lands in zhTW, never zhCN',
    cnBody.zhTW === cnRow.description && cnBody.zhCN === '',
)
check('the other locales are left empty for a translator', twBody.en === '' && cnBody.en === '')

const describedRows = candidates.filter((c) => c.description)
console.log(`  info  ${describedRows.length} workbook descriptions -> zhTW`)

console.log('\n=== Asset deduplication (one real download) ===')

const assetArtwork = {...run1[0]}
let uploadCalls = 0

const reused = await resolveAsset(null, assetArtwork, {
    lookupAsset: () => 'image-existing-asset-id',
    upload: () => {
        uploadCalls += 1
        return {_id: 'image-should-not-happen'}
    },
})

check('matching sha1 reuses the existing asset', reused.assetId === 'image-existing-asset-id')
check('matching sha1 performs no upload', uploadCalls === 0, `uploadCalls=${uploadCalls}`)
check('reuse is reported as such', reused.reused === true)

let seenHash = null
const uploaded = await resolveAsset(null, assetArtwork, {
    lookupAsset: (hash) => {
        seenHash = hash
        return null
    },
    upload: () => {
        uploadCalls += 1
        return {_id: 'image-freshly-uploaded'}
    },
})

check('no match means the bytes are uploaded', uploaded.assetId === 'image-freshly-uploaded')
check('upload happened exactly once', uploadCalls === 1, `uploadCalls=${uploadCalls}`)
check('upload is not reported as reuse', uploaded.reused === false)
check('lookup was keyed by a real sha1 of the bytes', /^[0-9a-f]{40}$/.test(seenHash ?? ''), String(seenHash))

// ---------------------------------------------------------------------------

console.log(
    failures === 0
        ? '\nAll checks passed — the importer is safe to run twice.\n'
        : `\n${failures} check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
