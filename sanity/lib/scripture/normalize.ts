/**
 * Rewrites a typed Bible reference into the one format the collection stores:
 * the canonical English book name, the chapter, then the verses —
 * "1 John 4:16b", "Proverbs 31:10-12, 28-29", "Psalms 23".
 *
 * Only the spelling changes, never which passage is named. A reference it
 * cannot read comes back with just its punctuation and spacing cleaned, for a
 * person to correct; bounds are `validate.ts`'s job, not this one's.
 *
 * Mirrored byte for byte in sanity/lib/scripture/, which cannot import from
 * here — `mirror.test.ts` fails when the copies differ.
 */
import versification from './versification.json' with {type: 'json'}

/** Normalised citable name -> canonical book name, 和合本 names included. */
const BOOK_NAMES = versification.names as Record<string, string>

/** Every dash a keyboard or IME produces, and the tildes Chinese text uses for ranges. */
const DASHES = /[‐-―−﹘﹣~〜]/g

/** Zero-width characters and soft hyphens, which paste in unseen. */
const INVISIBLE = /[​-‍⁠﻿­]/g

/** Book, a single space, chapter, then optionally a colon and the verses. */
const REFERENCE = /^(.+?) (\d{1,3})(?::(.+))?$/

/** "16", "16b", "10-12", "22-23a". */
const VERSE = /^(\d{1,3})([a-z]?)(?:-(\d{1,3})([a-z]?))?$/i

/** Punctuation and spacing only; the words are left as typed. */
export function cleanReference(raw: string): string {
    // NFKC folds full-width forms to ASCII: ：，－～ ０-９ and the ideographic space.
    let text = raw
        .normalize('NFKC')
        .replace(INVISIBLE, '')
        .replace(DASHES, '-')
        .replace(/、/g, ',')
        .replace(/\s+/g, ' ')
        .trim()

    // "John 3.16": between two digits a full stop can only part chapter and verse.
    if (!text.includes(':')) text = text.replace(/(\d)\.(\d)/, '$1:$2')

    return text
        .replace(/\s*([:-])\s*/g, '$1')
        .replace(/\s*,\s*/g, ', ')
        .replace(/^([1-3])(?=[A-Za-z])/, '$1 ')
        .replace(/([A-Za-z.一-鿿])(?=\d)/, '$1 ')
}

export function normalizeReference(raw: string): string {
    const text = cleanReference(raw)
    const match = REFERENCE.exec(text)
    if (!match) return text

    const [, rawBook, rawChapter, rawVerses] = match
    const book = BOOK_NAMES[rawBook.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()]
    if (!book) return text

    const chapter = Number(rawChapter)
    if (rawVerses === undefined) return `${book} ${chapter}`

    const verses: string[] = []
    for (const part of rawVerses.split(', ')) {
        const verse = VERSE.exec(part)
        if (!verse) return text

        const [, start, startPart, end, endPart] = verse
        const first = `${Number(start)}${startPart.toLowerCase()}`
        verses.push(end === undefined ? first : `${first}-${Number(end)}${endPart.toLowerCase()}`)
    }

    return `${book} ${chapter}:${verses.join(', ')}`
}
