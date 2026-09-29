/**
 * Regenerates lib/scripture/versification.json and its Studio mirror,
 * sanity/lib/scripture/versification.json.
 *
 *   node scripts/generate-versification.mjs
 *
 * Versification never changes, so the output is committed and the validator
 * runs entirely offline — the whole point is to reject a bad reference without
 * asking a provider anything. This script exists so the table's provenance is
 * auditable rather than typed in from memory.
 *
 * Source: Bible SuperSearch's /api/books, which returns every book with its
 * chapter count and a per-chapter verse count. Only the numbers are taken; the
 * validator has no runtime knowledge of any provider.
 */
import fs from 'node:fs'
import path from 'node:path'

const ENDPOINT = 'https://api.biblesupersearch.com/api/books?language=en'
const OUTPUTS = [
    path.join(import.meta.dirname, '..', 'lib', 'scripture', 'versification.json'),
    path.join(import.meta.dirname, '..', 'sanity', 'lib', 'scripture', 'versification.json'),
]

/**
 * Further *legitimate* names for the same book. Not typo corrections: a
 * misspelling must fail validation so a person fixes the citation, so this list
 * only holds names actually used in English Bibles.
 */
const ALTERNATES = {
    Psalms: ['Psalm'],
    'Song of Solomon': ['Song of Songs', 'Canticles'],
    Ecclesiastes: ['Qoheleth'],
}

/**
 * Canon order, with a stable OSIS id and the abbreviations the Studio's book
 * picker shows: SBL for English, the 和合本's own for Chinese. Every name here is
 * also citable, so "約 3:16" or "约翰福音 3:16" normalises to "John 3:16".
 * Columns: name, id, English, 繁 abbreviation, 繁 full, 简 abbreviation, 简 full.
 */
const CATALOG = [
    ['Genesis', 'Gen', 'Gen', '創', '創世記', '创', '创世记'],
    ['Exodus', 'Exod', 'Exod', '出', '出埃及記', '出', '出埃及记'],
    ['Leviticus', 'Lev', 'Lev', '利', '利未記', '利', '利未记'],
    ['Numbers', 'Num', 'Num', '民', '民數記', '民', '民数记'],
    ['Deuteronomy', 'Deut', 'Deut', '申', '申命記', '申', '申命记'],
    ['Joshua', 'Josh', 'Josh', '書', '約書亞記', '书', '约书亚记'],
    ['Judges', 'Judg', 'Judg', '士', '士師記', '士', '士师记'],
    ['Ruth', 'Ruth', 'Ruth', '得', '路得記', '得', '路得记'],
    ['1 Samuel', '1Sam', '1 Sam', '撒上', '撒母耳記上', '撒上', '撒母耳记上'],
    ['2 Samuel', '2Sam', '2 Sam', '撒下', '撒母耳記下', '撒下', '撒母耳记下'],
    ['1 Kings', '1Kgs', '1 Kgs', '王上', '列王紀上', '王上', '列王纪上'],
    ['2 Kings', '2Kgs', '2 Kgs', '王下', '列王紀下', '王下', '列王纪下'],
    ['1 Chronicles', '1Chr', '1 Chr', '代上', '歷代志上', '代上', '历代志上'],
    ['2 Chronicles', '2Chr', '2 Chr', '代下', '歷代志下', '代下', '历代志下'],
    ['Ezra', 'Ezra', 'Ezra', '拉', '以斯拉記', '拉', '以斯拉记'],
    ['Nehemiah', 'Neh', 'Neh', '尼', '尼希米記', '尼', '尼希米记'],
    ['Esther', 'Esth', 'Esth', '斯', '以斯帖記', '斯', '以斯帖记'],
    ['Job', 'Job', 'Job', '伯', '約伯記', '伯', '约伯记'],
    ['Psalms', 'Ps', 'Ps', '詩', '詩篇', '诗', '诗篇'],
    ['Proverbs', 'Prov', 'Prov', '箴', '箴言', '箴', '箴言'],
    ['Ecclesiastes', 'Eccl', 'Eccl', '傳', '傳道書', '传', '传道书'],
    ['Song of Solomon', 'Song', 'Song', '歌', '雅歌', '歌', '雅歌'],
    ['Isaiah', 'Isa', 'Isa', '賽', '以賽亞書', '赛', '以赛亚书'],
    ['Jeremiah', 'Jer', 'Jer', '耶', '耶利米書', '耶', '耶利米书'],
    ['Lamentations', 'Lam', 'Lam', '哀', '耶利米哀歌', '哀', '耶利米哀歌'],
    ['Ezekiel', 'Ezek', 'Ezek', '結', '以西結書', '结', '以西结书'],
    ['Daniel', 'Dan', 'Dan', '但', '但以理書', '但', '但以理书'],
    ['Hosea', 'Hos', 'Hos', '何', '何西阿書', '何', '何西阿书'],
    ['Joel', 'Joel', 'Joel', '珥', '約珥書', '珥', '约珥书'],
    ['Amos', 'Amos', 'Amos', '摩', '阿摩司書', '摩', '阿摩司书'],
    ['Obadiah', 'Obad', 'Obad', '俄', '俄巴底亞書', '俄', '俄巴底亚书'],
    ['Jonah', 'Jonah', 'Jonah', '拿', '約拿書', '拿', '约拿书'],
    ['Micah', 'Mic', 'Mic', '彌', '彌迦書', '弥', '弥迦书'],
    ['Nahum', 'Nah', 'Nah', '鴻', '那鴻書', '鸿', '那鸿书'],
    ['Habakkuk', 'Hab', 'Hab', '哈', '哈巴谷書', '哈', '哈巴谷书'],
    ['Zephaniah', 'Zeph', 'Zeph', '番', '西番雅書', '番', '西番雅书'],
    ['Haggai', 'Hag', 'Hag', '該', '哈該書', '该', '哈该书'],
    ['Zechariah', 'Zech', 'Zech', '亞', '撒迦利亞書', '亚', '撒迦利亚书'],
    ['Malachi', 'Mal', 'Mal', '瑪', '瑪拉基書', '玛', '玛拉基书'],
    ['Matthew', 'Matt', 'Matt', '太', '馬太福音', '太', '马太福音'],
    ['Mark', 'Mark', 'Mark', '可', '馬可福音', '可', '马可福音'],
    ['Luke', 'Luke', 'Luke', '路', '路加福音', '路', '路加福音'],
    ['John', 'John', 'John', '約', '約翰福音', '约', '约翰福音'],
    ['Acts', 'Acts', 'Acts', '徒', '使徒行傳', '徒', '使徒行传'],
    ['Romans', 'Rom', 'Rom', '羅', '羅馬書', '罗', '罗马书'],
    ['1 Corinthians', '1Cor', '1 Cor', '林前', '哥林多前書', '林前', '哥林多前书'],
    ['2 Corinthians', '2Cor', '2 Cor', '林後', '哥林多後書', '林后', '哥林多后书'],
    ['Galatians', 'Gal', 'Gal', '加', '加拉太書', '加', '加拉太书'],
    ['Ephesians', 'Eph', 'Eph', '弗', '以弗所書', '弗', '以弗所书'],
    ['Philippians', 'Phil', 'Phil', '腓', '腓立比書', '腓', '腓立比书'],
    ['Colossians', 'Col', 'Col', '西', '歌羅西書', '西', '歌罗西书'],
    ['1 Thessalonians', '1Thess', '1 Thess', '帖前', '帖撒羅尼迦前書', '帖前', '帖撒罗尼迦前书'],
    ['2 Thessalonians', '2Thess', '2 Thess', '帖後', '帖撒羅尼迦後書', '帖后', '帖撒罗尼迦后书'],
    ['1 Timothy', '1Tim', '1 Tim', '提前', '提摩太前書', '提前', '提摩太前书'],
    ['2 Timothy', '2Tim', '2 Tim', '提後', '提摩太後書', '提后', '提摩太后书'],
    ['Titus', 'Titus', 'Titus', '多', '提多書', '多', '提多书'],
    ['Philemon', 'Phlm', 'Phlm', '門', '腓利門書', '门', '腓利门书'],
    ['Hebrews', 'Heb', 'Heb', '來', '希伯來書', '来', '希伯来书'],
    ['James', 'Jas', 'Jas', '雅', '雅各書', '雅', '雅各书'],
    ['1 Peter', '1Pet', '1 Pet', '彼前', '彼得前書', '彼前', '彼得前书'],
    ['2 Peter', '2Pet', '2 Pet', '彼後', '彼得後書', '彼后', '彼得后书'],
    ['1 John', '1John', '1 John', '約壹', '約翰一書', '约壹', '约翰一书'],
    ['2 John', '2John', '2 John', '約貳', '約翰二書', '约贰', '约翰二书'],
    ['3 John', '3John', '3 John', '約參', '約翰三書', '约叁', '约翰三书'],
    ['Jude', 'Jude', 'Jude', '猶', '猶大書', '犹', '犹大书'],
    ['Revelation', 'Rev', 'Rev', '啟', '啟示錄', '启', '启示录'],
]

/** Genesis to Malachi. */
const OLD_TESTAMENT_BOOKS = 39

/** Matches the normalisation the validator applies before looking a name up. */
function normalize(name) {
    return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

const ORDINALS = [
    ['1', 'i', 'first'],
    ['2', 'ii', 'second'],
    ['3', 'iii', 'third'],
]

/** "1 John" is also written "I John" and "First John". */
function ordinalForms(name) {
    const match = name.match(/^([123])\s+(.*)$/)
    if (!match) return []

    const [, digit, rest] = match
    const forms = ORDINALS.find((group) => group[0] === digit) ?? []
    return forms.slice(1).map((prefix) => `${prefix} ${rest}`)
}

const response = await fetch(ENDPOINT, {signal: AbortSignal.timeout(30_000)})
if (!response.ok) {
    console.error(`Book metadata request failed: HTTP ${response.status}`)
    process.exit(1)
}

const {results} = await response.json()
if (!Array.isArray(results) || results.length !== 66) {
    console.error(`Expected 66 books, got ${results?.length}`)
    process.exit(1)
}

const verses = {}
const lookup = new Map()

function addAlias(alias, canonical) {
    const key = normalize(alias)
    const existing = lookup.get(key)
    if (existing && existing !== canonical) {
        console.error(`Alias collision: "${alias}" -> ${existing} and ${canonical}`)
        process.exit(1)
    }
    lookup.set(key, canonical)
}

for (const book of results) {
    const {name, shortname, chapters, chapter_verses: chapterVerses} = book

    const counts = []
    for (let chapter = 1; chapter <= chapters; chapter += 1) {
        const count = chapterVerses?.[String(chapter)]
        if (!Number.isInteger(count) || count < 1) {
            console.error(`${name} chapter ${chapter}: bad verse count ${count}`)
            process.exit(1)
        }
        counts.push(count)
    }

    verses[name] = counts

    addAlias(name, name)
    if (shortname) addAlias(shortname, name)
    for (const form of ordinalForms(name)) addAlias(form, name)
    for (const alternate of ALTERNATES[name] ?? []) {
        addAlias(alternate, name)
        for (const form of ordinalForms(alternate)) addAlias(form, name)
    }
}

if (results.some((book, index) => book.name !== CATALOG[index][0])) {
    console.error("CATALOG is out of step with the provider's book list")
    process.exit(1)
}

for (const [name, , english, ...chinese] of CATALOG) {
    addAlias(english, name)
    for (const form of ordinalForms(english)) addAlias(form, name)
    for (const alias of chinese) addAlias(alias, name)
}

const catalog = CATALOG.map(([name, id, en, zhTW], index) => ({
    id,
    name,
    testament: index < OLD_TESTAMENT_BOOKS ? 'OT' : 'NT',
    en,
    zhTW,
}))

const totalChapters = Object.values(verses).reduce((n, list) => n + list.length, 0)

const sortedNames = Object.fromEntries(
    [...lookup].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
)

const payload = {
    _comment:
        'GENERATED by scripts/generate-versification.mjs — do not edit by hand. ' +
        'Protestant canon versification, which both the 和合本 and the ESV follow; a ' +
        'translation numbering verses differently would need its own table. Only names ' +
        'real Bibles use are listed, English and 和合本 — misspellings are deliberately ' +
        'absent so that an unrecognised reference is left for a person to correct.',
    _books: results.length,
    _chapters: totalChapters,
    /** Canonical book name -> verse count of each chapter, chapter 1 first. */
    books: verses,
    /** Normalised citable name -> canonical book name. */
    names: sortedNames,
    /** Canon order, for the Studio's book picker. */
    catalog,
}

for (const output of OUTPUTS) {
    fs.mkdirSync(path.dirname(output), {recursive: true})
    fs.writeFileSync(output, `${JSON.stringify(payload, null, 1)}\n`)
    console.log(`Wrote ${path.relative(process.cwd(), output)}`)
}
console.log(`  ${results.length} books, ${totalChapters} chapters, ${lookup.size} citable names`)
