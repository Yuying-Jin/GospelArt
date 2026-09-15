/**
 * Strict pre-flight validation of a Bible reference.
 *
 * A reference is only sent to a provider when it names a real book, a chapter
 * that book has, and verses that chapter has. Anything else is reported for
 * correction in the Studio instead.
 *
 * The rule exists because the providers are *lenient*, and quietly so:
 *   "Dueteronomy 6:5"     -> silently corrected to Deuteronomy 6:5
 *   "Ecclesiastes 14:34"  -> silently answered with Ecclesiastes 12:14
 *   "Psalms 91-12"        -> silently read as Psalms 12-42, 47,000 characters
 *   "John & Hong's poem"  -> silently answered with the whole of John 1
 *
 * Every one of those writes plausible-looking scripture that nobody asked for,
 * which is far worse than an empty field. So no guessing here either: a
 * misspelling fails rather than being mapped to the book it resembles.
 */
import versification from './versification.json' with {type: 'json'}

/** Canonical book name -> verse count of each chapter, chapter 1 at index 0. */
const BOOK_VERSES = versification.books as Record<string, number[]>

/** Normalised citable name -> canonical book name. */
const BOOK_NAMES = versification.names as Record<string, string>

export type VerseRange = {start: number; end: number}

export type ReferenceValidation =
    | {valid: true; book: string; chapter: number; verses: VerseRange[]}
    | {valid: false; reason: string}

/** Matches the key format used by the generated name table. */
export function normalizeBookName(name: string): string {
    return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Book, chapter, verses — none of them optional. A chapter-only citation such
 * as "Psalms 23" does not match, which is deliberate: the collection cites
 * verses, and a whole chapter is more likely a dropped verse number than an
 * intent to quote 176 of them.
 */
const REFERENCE = /^(.+?)\s+(\d{1,3})\s*:\s*([\d\s,–-]+)$/

/** A single verse or an ascending range: "16", "22-23". */
const VERSE_SPEC = /^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/

export function validateReference(reference: string): ReferenceValidation {
    const match = REFERENCE.exec(reference.trim())

    if (!match) {
        return {
            valid: false,
            reason:
                'Incomplete reference — it needs a book, a chapter and a verse, like "John 3:16".',
        }
    }

    const [, rawBook, rawChapter, rawVerses] = match
    const book = BOOK_NAMES[normalizeBookName(rawBook)]

    if (!book) {
        return {valid: false, reason: `Unrecognised book "${rawBook.trim()}" — check the spelling.`}
    }

    const chapterVerses = BOOK_VERSES[book]
    const chapter = Number(rawChapter)

    if (chapter < 1 || chapter > chapterVerses.length) {
        return {
            valid: false,
            reason: `${book} has ${chapterVerses.length} chapters, so chapter ${chapter} does not exist.`,
        }
    }

    const lastVerse = chapterVerses[chapter - 1]
    const verses: VerseRange[] = []

    // A comma-separated list is legitimate and unambiguous: "31:10-12, 28-29".
    for (const part of rawVerses.split(',')) {
        const spec = VERSE_SPEC.exec(part.trim())

        if (!spec) {
            return {valid: false, reason: `Could not read the verse "${part.trim()}".`}
        }

        const start = Number(spec[1])
        const end = spec[2] === undefined ? start : Number(spec[2])

        if (start < 1) {
            return {valid: false, reason: `There is no verse ${start}.`}
        }
        if (end < start) {
            return {valid: false, reason: `Verse range ${start}-${end} runs backwards.`}
        }
        if (end > lastVerse) {
            return {
                valid: false,
                reason: `${book} ${chapter} has ${lastVerse} verses, so verse ${end} does not exist.`,
            }
        }

        verses.push({start, end})
    }

    return {valid: true, book, chapter, verses}
}
