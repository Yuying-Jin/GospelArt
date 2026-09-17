/**
 * Verifies how verse-part suffixes ("1 John 4:16b") are handled by the
 * scripture lookup.
 *
 *   node scripts/verify-scripture-reference.mjs
 *
 * The normalisation checks are pure and always run. The endpoint checks need
 * the Next.js app running and report themselves as skipped when it is not, so
 * this is safe to run offline. Assertions that depend on a Bible provider
 * actually answering are skipped rather than failed when one is down.
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import {hasVersePart, stripVerseParts} from '../lib/scripture/reference.ts'
import {validateReference} from '../lib/scripture/validate.ts'

let failures = 0
let skips = 0

function check(label, condition, detail) {
    if (condition) {
        console.log(`  PASS  ${label}`)
        return
    }
    failures += 1
    console.log(`  FAIL  ${label}${detail ? `\n          ${detail}` : ''}`)
}

function equal(label, actual, expected) {
    check(
        label,
        actual === expected,
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    )
}

function skip(reason) {
    skips += 1
    console.log(`  SKIP  ${reason}`)
}

// ---------------------------------------------------------------------------

console.log('\n=== A verse-part suffix is stripped for lookup ===')

equal(
    'Galatians 5:22-23a is looked up as Galatians 5:22-23',
    stripVerseParts('Galatians 5:22-23a'),
    'Galatians 5:22-23',
)
equal('1 John 4:16b is looked up as 1 John 4:16', stripVerseParts('1 John 4:16b'), '1 John 4:16')
equal('a trailing "c" is stripped too, not just "a"', stripVerseParts('Matthew 5:3c'), 'Matthew 5:3')
equal('an uppercase suffix is stripped', stripVerseParts('Matthew 5:3B'), 'Matthew 5:3')
equal(
    'suffixes at both ends of a range are stripped',
    stripVerseParts('Galatians 5:22a-23b'),
    'Galatians 5:22-23',
)

console.log('\n=== References without a suffix are left exactly as they are ===')

for (const reference of [
    'John 11:25',
    'Galatians 5:22-23',
    '1 John 4:16', // the book-name digit must not be mistaken for a verse
    '2 Corinthians 4:5-6',
    'Psalm 23',
    'Revelation 1:1ff', // a multi-letter convention, not a verse part
    'Song of Songs 2:1',
]) {
    equal(`${reference} is unchanged`, stripVerseParts(reference), reference)
}

console.log('\n=== The condition the Studio warning is gated on ===')

check('it fires for Galatians 5:22-23a', hasVersePart('Galatians 5:22-23a') === true)
check('it fires for 1 John 4:16b', hasVersePart('1 John 4:16b') === true)
check('it stays silent for Galatians 5:22-23', hasVersePart('Galatians 5:22-23') === false)
check('it stays silent for Psalm 23', hasVersePart('Psalm 23') === false)

console.log('\n=== Misspelled books are rejected, never corrected ===')

// Every one of these is in the real archive, and every one of them is a
// reference some provider would have silently "fixed" for us.
for (const reference of [
    'Matthews 6:29',
    'Mattews 5:8',
    '1 Corinsians 13:6',
    'Provers 31:10',
    'Ephisians 5:26',
    'Dueteronomy 6:5',
    'Song of Solonom 8:14',
    'Colosians 2:6-7',
    'Jacob 4:7',
]) {
    const result = validateReference(reference)
    check(
        `${reference} is rejected`,
        result.valid === false && /Unrecognised book/.test(result.reason),
        result.valid ? 'it was accepted' : result.reason,
    )
}

console.log('\n=== A chapter or verse cannot be missing ===')

for (const reference of [
    'Ecclesiastes',
    'John',
    'John 3',
    'Psalms 23',
    'Psalms 91-12',
    'Glory to Jesus',
    "John & Hong's poem",
    'Justice and Grace',
]) {
    const result = validateReference(reference)
    check(
        `${reference} is rejected`,
        result.valid === false && /Incomplete reference/.test(result.reason),
        result.valid ? 'it was accepted' : result.reason,
    )
}

console.log('\n=== Chapter and verse bounds come from real versification ===')

const outOfBounds = [
    ['Ecclesiastes 14:34', /has 12 chapters/],
    ['Psalms 151:1', /has 150 chapters/],
    ['John 3:99', /has 36 verses/],
    ['Ecclesiastes 12:15', /has 14 verses/],
    ['Galatians 5:22-27', /has 26 verses/],
]

for (const [reference, expected] of outOfBounds) {
    const result = validateReference(reference)
    check(
        `${reference} is rejected`,
        result.valid === false && expected.test(result.reason),
        result.valid ? 'it was accepted' : result.reason,
    )
}

check(
    'a backwards range is rejected',
    validateReference('Galatians 5:23-22').valid === false,
)

console.log('\n=== Well-formed references are still accepted ===')

for (const reference of [
    'John 3:16',
    'John 11:25',
    'Galatians 5:22-23',
    '2 Corinthians 4:5-6',
    'Psalms 23:1',
    'Psalms 119:105',
    '1 John 4:16',
    'Song of Solomon 8:14',
    'Proverbs 31:10-12, 28-29', // a comma list is unambiguous, so it is allowed
    'Ecclesiastes 12:14', // the last verse of the last chapter
]) {
    const result = validateReference(reference)
    check(`${reference} is accepted`, result.valid === true, result.valid ? '' : result.reason)
}

// Suffixes are stripped before validation, so these must survive both steps.
for (const reference of ['Galatians 5:22-23a', '1 John 4:16b']) {
    const result = validateReference(stripVerseParts(reference))
    check(
        `${reference} is accepted once its suffix is stripped`,
        result.valid === true,
        result.valid ? '' : result.reason,
    )
}

console.log('\n=== The Studio action (source checks) ===')

const actionPath = path.join(
    import.meta.dirname,
    '..',
    'sanity',
    'actions',
    'fetchScripture.tsx',
)
const action = fs.readFileSync(actionPath, 'utf8')

check(
    'a warning is rendered when the looked-up reference differs',
    action.includes('result.lookupReference !== reference') &&
        /names only part of a verse/.test(action),
)
check(
    'the warning names no Bible service',
    !/SuperSearch|biblesupersearch|Crossway|api\.esv\.org/i.test(action),
)

// Fetching must never rewrite the citation.
const applyBlock = action.slice(
    action.indexOf('const apply'),
    action.indexOf('const chosenCount'),
)
check(
    'the patch writes only scripture.* keys, never bibleReference',
    /set\[`scripture\.\$\{field\}`\]/.test(applyBlock) && !applyBlock.includes('bibleReference'),
)

// ---------------------------------------------------------------------------

console.log('\n=== Provider unavailable vs reference not found ===')

// A local stand-in for the Chinese provider. The distinction under test is
// about how a response is *classified*, so it must be assertable without
// depending on whatever the real quota happens to be doing today.
let stubReply = {status: 200, body: {}}

const stub = http.createServer((_request, response) => {
    response.writeHead(stubReply.status, {'Content-Type': 'application/json'})
    response.end(JSON.stringify(stubReply.body))
})

await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve))

// Read at module load, so it has to be set before the provider is imported.
process.env.BIBLESUPERSEARCH_ENDPOINT = `http://127.0.0.1:${stub.address().port}/api`
const {bibleSuperSearchProvider} = await import(
    '../lib/scripture/providers/bibleSuperSearch.ts'
)

function ask() {
    return bibleSuperSearchProvider.fetchPassage('John 3:16', AbortSignal.timeout(5_000))
}

stubReply = {
    status: 429,
    body: {
        errors: ['Maximum hits has been reached for today for this domain / IP address'],
        error_level: 4,
    },
}
const spentQuota = await ask()
check(
    'a spent daily quota is reported as the provider being unavailable',
    typeof spentQuota.unavailable === 'string' && /Maximum hits/.test(spentQuota.unavailable),
    JSON.stringify(spentQuota.unavailable),
)
check(
    'it still fills in the per-field errors as before',
    Boolean(spentQuota.errors.zhTW && spentQuota.errors.zhCN) &&
        Object.keys(spentQuota.texts).length === 0,
)

stubReply = {status: 429, body: {errors: []}}
const throttled = await ask()
check(
    'a bare HTTP 429 is reported as unavailable too',
    typeof throttled.unavailable === 'string',
    JSON.stringify(throttled.unavailable),
)

stubReply = {status: 400, body: {errors: ["Book not found: 'Matthews'"], error_level: 4}}
const notFound = await ask()
check(
    'a reference that does not exist is NOT reported as unavailable',
    notFound.unavailable === undefined,
    JSON.stringify(notFound.unavailable),
)
check(
    'and it still explains itself the same way',
    /Book not found/.test(notFound.errors.zhTW ?? ''),
    JSON.stringify(notFound.errors.zhTW),
)

stubReply = {
    status: 200,
    body: {
        errors: [],
        results: [
            {
                book_name: 'John',
                chapter_verse: '3:16',
                verses_count: 1,
                verses: {
                    chinese_union_trad: {3: {16: {text: '神 愛 世 人'}}},
                    chinese_union_simp: {3: {16: {text: '神 爱 世 人'}}},
                },
            },
        ],
    },
}
const found = await ask()
check('a successful lookup is not reported as unavailable', found.unavailable === undefined)
check(
    'and normal lookup behaviour is unchanged',
    found.texts.zhTW === '神愛世人' && found.texts.zhCN === '神爱世人',
    JSON.stringify(found.texts),
)

await new Promise((resolve) => stub.close(resolve))

console.log('\n=== Live endpoint ===')

const API = process.env.SCRIPTURE_API_URL || 'http://localhost:3000/api/scripture'

async function get(reference) {
    const response = await fetch(`${API}?reference=${encodeURIComponent(reference)}`, {
        signal: AbortSignal.timeout(25_000),
    })
    return response.json()
}

let reachable = false
try {
    // A reference-less call is answered 400 by design; reachable is all we need.
    const probe = await fetch(API, {signal: AbortSignal.timeout(5_000)})
    reachable = probe.ok || probe.status === 400
} catch {
    reachable = false
}

if (!reachable) {
    skip(`${API} is not reachable — start the app to run these`)
} else {
    const suffixed = await get('Galatians 5:22-23a')

    // Provider-independent: these hold even when every provider is down.
    equal(
        'the original reference is echoed back verbatim',
        suffixed.reference,
        'Galatians 5:22-23a',
    )
    equal(
        'the providers were asked for the full range',
        suffixed.lookupReference,
        'Galatians 5:22-23',
    )

    const john = await get('1 John 4:16b')
    equal('1 John 4:16b is echoed back verbatim', john.reference, '1 John 4:16b')
    equal('1 John 4:16b is looked up as 1 John 4:16', john.lookupReference, '1 John 4:16')

    const plainReference = await get('John 11:25')
    equal(
        'an unsuffixed reference looks itself up',
        plainReference.lookupReference,
        'John 11:25',
    )

    // The endpoint must reject these itself, so no provider is ever asked.
    for (const [reference, expected] of [
        ['Matthews 6:29', /Unrecognised book/],
        ['Ecclesiastes 14:34', /has 12 chapters/],
        ['Psalms 91-12', /Incomplete reference/],
        ["John & Hong's poem", /Incomplete reference/],
    ]) {
        const result = await get(reference)
        check(
            `${reference} is refused without asking a provider`,
            expected.test(result.invalid ?? '') &&
                Object.keys(result.texts ?? {}).length === 0 &&
                result.reference === reference,
            `invalid=${JSON.stringify(result.invalid)} texts=${JSON.stringify(result.texts)}`,
        )
        // The two conditions must never be confused: no provider was consulted,
        // so none of them can be reported as unavailable.
        check(
            `${reference} reports no unavailable provider`,
            result.unavailableProviders === undefined,
            JSON.stringify(result.unavailableProviders),
        )
    }

    // Whether a real provider is currently exhausted is not something a test
    // can insist on, so this asserts the shape when present and says so when not.
    const live = await get('John 11:25')
    if (live.unavailableProviders) {
        check(
            'a live unavailable provider is reported with an id and a reason',
            live.unavailableProviders.every(
                (entry) => typeof entry.id === 'string' && typeof entry.reason === 'string',
            ),
            JSON.stringify(live.unavailableProviders),
        )
        skip(
            `a provider is currently unavailable: ${live.unavailableProviders
                .map((entry) => entry.id)
                .join(', ')}`,
        )
    } else {
        check('every provider is reachable, so none is reported unavailable', true)
    }

    if (!suffixed.texts?.en) {
        skip('providers returned no text — text assertions skipped')
    } else {
        const plain = await get('Galatians 5:22-23')

        check(
            'the suffixed lookup returns the same text as the unsuffixed one',
            suffixed.texts.en === plain.texts?.en &&
                suffixed.texts.zhTW === plain.texts?.zhTW &&
                suffixed.texts.zhCN === plain.texts?.zhCN,
            'a verse-part suffix must not crop the returned scripture',
        )
        // Only the Chinese provider reports a verse count, so this particular
        // assertion cannot run while that provider is unavailable.
        if (suffixed.unavailableProviders) {
            skip('verse count comes from a provider that is currently unavailable')
        } else {
            check(
                'the whole range came back, not just the suffixed verse',
                suffixed.verseCount === plain.verseCount && suffixed.verseCount > 1,
                `verseCount was ${suffixed.verseCount}`,
            )
        }
        check('1 John 4:16b still returns text', Boolean(john.texts?.en))
    }
}

// ---------------------------------------------------------------------------

console.log('')
if (failures > 0) {
    console.error(`${failures} check(s) failed.`)
    process.exit(1)
}
console.log(`All checks passed${skips > 0 ? ` (${skips} skipped)` : ''}.`)
