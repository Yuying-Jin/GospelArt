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
 * Sanity's built-in slugify would rewrite the `_` that separates the date from
 * the reference (`2025-08-01_john-11-25`) into a `-`, which would not match any
 * link already shared. This keeps `_` intact and otherwise mirrors
 * `slugifyBibleReference`.
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
