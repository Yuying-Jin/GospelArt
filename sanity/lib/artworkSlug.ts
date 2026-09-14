/**
 * DUPLICATE OF `lib/artworkSlug.ts` IN THE NEXT.JS APP — keep the two in sync.
 *
 * The app's copy is canonical. The Studio is a standalone project with its own
 * lockfile and no path alias into the app, and a shared workspace package for
 * ~15 lines of string munging would cost more than it saves — so this is a
 * deliberate copy rather than an import.
 *
 * Both sides must produce byte-identical slugs: the app resolves `?artwork=`
 * links against stored slugs, and the Studio seeds/validates them.
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
