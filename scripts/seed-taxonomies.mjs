/**
 * Seeds the reusable taxonomy documents: section types, Bible Themes and
 * Spiritual Themes.
 *
 *   node scripts/seed-taxonomies.mjs [--dry-run]
 *
 * Values are read out of data/artworks.json rather than typed in here, so the
 * section headings land in Sanity exactly as the site already renders them in
 * all three languages.
 *
 * Theme names only exist in English in the fixture, so `title.en` is seeded and
 * the Chinese fields are left empty for collaborators to fill — nothing is
 * machine-translated. Until then the site falls back to English, which is what
 * it already shows today.
 *
 * Uses createIfNotExists, so re-running never overwrites translations or edits
 * made in the Studio.
 */
import fs from 'node:fs'
import path from 'node:path'
import {getWriteClient} from './lib/scriptClient.mjs'

const DRY_RUN = process.argv.includes('--dry-run')

const SECTION_TYPE_ID = (key) => `section-type-${key}`
const BIBLE_THEME_ID = (name) => `bible-theme-${slugifyName(name)}`
const SPIRITUAL_THEME_ID = (name) => `spiritual-theme-${slugifyName(name)}`

function slugifyName(name) {
    return String(name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

function readFixture() {
    const file = path.join(process.cwd(), 'data', 'artworks.json')
    return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function collect(fixture) {
    const sectionTypes = new Map()
    const bibleThemes = new Set()
    const spiritualThemes = new Set()

    for (const artwork of fixture) {
        for (const section of artwork.sections ?? []) {
            if (!section?.id || sectionTypes.has(section.id)) continue
            sectionTypes.set(section.id, section.title ?? {})
        }
        for (const theme of artwork.bibleThemes ?? []) {
            if (theme) bibleThemes.add(theme)
        }
        for (const theme of artwork.spiritualThemes ?? []) {
            if (theme) spiritualThemes.add(theme)
        }
    }

    return {sectionTypes, bibleThemes, spiritualThemes}
}

function toLocaleString(title) {
    return {
        _type: 'localeString',
        en: title.en ?? '',
        zhCN: title['zh-CN'] ?? '',
        zhTW: title['zh-TW'] ?? '',
    }
}

async function main() {
    const fixture = readFixture()
    const {sectionTypes, bibleThemes, spiritualThemes} = collect(fixture)

    const documents = []

    for (const [key, title] of sectionTypes) {
        documents.push({
            _id: SECTION_TYPE_ID(key),
            _type: 'artworkSectionType',
            key,
            title: toLocaleString(title),
        })
    }

    for (const name of bibleThemes) {
        documents.push({
            _id: BIBLE_THEME_ID(name),
            _type: 'bibleTheme',
            title: {_type: 'localeString', en: name, zhCN: '', zhTW: ''},
        })
    }

    for (const name of spiritualThemes) {
        documents.push({
            _id: SPIRITUAL_THEME_ID(name),
            _type: 'spiritualTheme',
            title: {_type: 'localeString', en: name, zhCN: '', zhTW: ''},
        })
    }

    console.log(
        `Seeding ${sectionTypes.size} section type(s), ${bibleThemes.size} Bible Theme(s), ${spiritualThemes.size} Spiritual Theme(s).`,
    )
    for (const doc of documents) {
        console.log(`  ${doc._type.padEnd(19)} ${doc._id}`)
    }

    if (DRY_RUN) {
        console.log('\n--dry-run: nothing written.')
        return
    }

    const client = getWriteClient()
    const transaction = client.transaction()
    for (const doc of documents) {
        transaction.createIfNotExists(doc)
    }
    await transaction.commit()

    console.log('\nDone. Existing documents were left untouched.')
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
