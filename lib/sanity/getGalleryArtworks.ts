import mockArtworks from '@/data/artworks.json'
import type {Artwork} from '@/types/artwork'
import {getSanityClient} from './client'
import {mapArtwork, type AppLocale, type SanityArtwork} from './mapArtwork'
import {galleryArtworksQuery} from './queries'

/** Revalidated by `app/api/revalidate/route.ts` when the Studio publishes. */
export const ARTWORK_CACHE_TAG = 'artwork'

export type GalleryData = {
    artworks: Artwork[]
    source: 'sanity' | 'mock'
}

/**
 * `data/artworks.json` stays useful as a development fixture. Its last record
 * is blank — the same artifact the source workbook's Summary footer produces —
 * so anything without an image or a slug is dropped.
 */
function mockFallback(): Artwork[] {
    return (mockArtworks as Artwork[]).filter((artwork) => artwork.image_path && artwork.slug)
}

export async function getGalleryArtworks(locale: AppLocale): Promise<GalleryData> {
    const client = getSanityClient()

    if (!client) {
        return {artworks: mockFallback(), source: 'mock'}
    }

    try {
        const docs = await client.fetch<SanityArtwork[]>(
            galleryArtworksQuery,
            {},
            {
                // Cached until the publish webhook invalidates the tag, so a
                // collaborator's change is live in seconds without a rebuild.
                cache: 'force-cache',
                next: {tags: [ARTWORK_CACHE_TAG]},
            },
        )

        if (!docs?.length) {
            return {artworks: mockFallback(), source: 'mock'}
        }

        return {artworks: docs.map((doc) => mapArtwork(doc, locale)), source: 'sanity'}
    } catch (error) {
        // A CMS outage should not take the gallery down with it.
        console.error('[gallery] Sanity query failed, serving fixture data instead:', error)
        return {artworks: mockFallback(), source: 'mock'}
    }
}
