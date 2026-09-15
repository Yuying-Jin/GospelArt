import type {SanityDocument, SlugSourceContext} from 'sanity'
import {buildArtworkSlug} from './artworkSlug'

/** Seeds the slug from date + Bible reference, matching the app's format. */
export function artworkSlugSource(doc: SanityDocument, _context: SlugSourceContext): string {
    const {date, bibleReference} = doc as SanityDocument & {
        date?: string
        bibleReference?: string
    }
    return buildArtworkSlug(date ?? '', bibleReference ?? '')
}

/**
 * Sanity's built-in slugify converts `_` to `-`, but the artwork slug uses
 * `_` to separate the date from the Bible reference
 * (`2025-08-01_john-11-25`). Therefore, a custom slugify is used here to
 * preserve `_` while otherwise following the same normalization rules as
 * `slugifyBibleReference`.
 *
 * Bible reference format: book-chapter-verse[-endVerse]
 */

export function artworkSlugify(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[:.]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}
