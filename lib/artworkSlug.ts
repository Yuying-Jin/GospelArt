/**
 * The `?artwork=` URL value, e.g. "2025-08-01_john-11-25". `_` joins the date
 * and reference and `-` is used only inside each part, so the two segments
 * stay distinguishable. `sanity/lib/artworkSlug.ts` copies this — keep in sync.
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
