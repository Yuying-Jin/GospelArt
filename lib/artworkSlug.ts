/**
 * Builds the shareable artwork slug used as the `?artwork=` URL value, e.g.
 * "2025-08-01_john-11-25". Keeping the date and Bible-reference parts joined
 * by `_` (with `-` only inside each part) keeps the two segments visually
 * distinguishable in the URL.
 *
 * This slug is meant to stay stable across the eventual migration to Sanity:
 * as long as a future artwork document exposes the same `date` +
 * `bible_reference` (or a value that produces the same slug), links built
 * against the mock data keep resolving.
 */

export function slugifyBibleReference(bibleReference: string): string {
    return bibleReference
        .toLowerCase()
        .trim()
        .replace(/[:.]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function buildArtworkSlug(date: string, bibleReference: string): string {
    if (!date || !bibleReference) return '';
    return `${date}_${slugifyBibleReference(bibleReference)}`;
}
