/**
 * Duplicate of `lib/artworkSlug.ts`, which is canonical — keep the two in
 * sync. The Studio is a standalone project with no path alias into the app,
 * and both sides must produce byte-identical slugs: the app resolves
 * `?artwork=` against stored slugs and the Studio seeds and validates them.
 */

export function slugifyBibleReference(bibleReference: string): string {
    return bibleReference
        .toLowerCase()
        .trim()
        .replace(/[:.]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export function buildArtworkSlug(date: string, bibleReference: string): string {
    if (!date || !bibleReference) return ''
    return `${date}_${slugifyBibleReference(bibleReference)}`
}
