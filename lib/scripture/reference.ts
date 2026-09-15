/**
 * Verse-part suffixes — the "b" in "1 John 4:16b" — are how the ministry cites
 * half a verse. No Bible API accepts them, so they are removed before lookup
 * and the whole verse is fetched instead.
 *
 * The suffix is deliberately *not* applied to the returned text. Where "16b"
 * begins inside a verse is an editorial judgement that varies by translation,
 * so the full verse is handed to the collaborator to trim in the Studio.
 *
 * Kept in its own module so it can be imported without pulling in any provider.
 */

/**
 * A single letter directly after a digit, directly before the end of the
 * reference or a range/list separator.
 *
 * The narrowness is the point: it matches the "a" in "5:22-23a" but leaves book
 * names ("1 John") and multi-letter conventions ("Rev 1:1ff") alone.
 */
const VERSE_PART = /(\d)[a-z](?=$|[-–,;])/gi

/** Strips verse-part suffixes. Returns the input unchanged when there are none. */
export function stripVerseParts(reference: string): string {
    return reference.replace(VERSE_PART, '$1')
}

/** True when the reference cites part of a verse rather than whole verses. */
export function hasVersePart(reference: string): boolean {
    return stripVerseParts(reference) !== reference
}
