import mockArtworks from '@/data/artworks.json'
import type {Artwork} from '@/types/artwork'
import {getSanityClient} from './client'
import {mapArtwork, type AppLocale, type SanityArtwork} from './mapArtwork'
import {galleryArtworkBySlugQuery, galleryBatchQuery, galleryFeedQuery} from './queries'

/** Revalidated by `app/api/revalidate/route.ts` when the Studio publishes. */
export const ARTWORK_CACHE_TAG = 'artwork'

/** Network batch size, not a user-visible page. 18 fills whole rows in the
 * 3- and 2-column grids. */
export const GALLERY_BATCH_SIZE = 18

/**
 * Identity without content. The whole ordered list is sent to the browser so
 * the modal's prev/next can span the collection rather than stopping at the
 * last loaded batch.
 */
export type GalleryArtworkRef = {
    slug: string
    previousSlugs: string[]
}

export type GalleryFeed = {
    artworks: Artwork[]
    order: GalleryArtworkRef[]
    source: 'sanity' | 'mock'
}

function cacheOptions() {
    return {cache: 'force-cache' as const, next: {tags: [ARTWORK_CACHE_TAG]}}
}

/** The fixture's last record is blank — an artifact of the workbook's Summary footer. */
function mockFallback(): Artwork[] {
    return (mockArtworks as Artwork[]).filter((artwork) => artwork.image_path && artwork.slug)
}

function toRef(artwork: {slug?: string | null; previousSlugs?: string[] | null}): GalleryArtworkRef {
    return {
        slug: artwork.slug ?? '',
        previousSlugs: (artwork.previousSlugs ?? []).filter(Boolean),
    }
}

function mockFeed(): GalleryFeed {
    const all = mockFallback()
    return {
        artworks: all.slice(0, GALLERY_BATCH_SIZE),
        order: all.map(toRef),
        source: 'mock',
    }
}

export async function getGalleryFeed(locale: AppLocale): Promise<GalleryFeed> {
    const client = getSanityClient()

    if (!client) {
        return mockFeed()
    }

    try {
        const result = await client.fetch<{
            artworks: SanityArtwork[] | null
            order: GalleryArtworkRef[] | null
        }>(galleryFeedQuery, {start: 0, end: GALLERY_BATCH_SIZE}, cacheOptions())

        if (!result?.order?.length) {
            return mockFeed()
        }

        return {
            artworks: (result.artworks ?? []).map((doc) => mapArtwork(doc, locale)),
            order: result.order.map(toRef).filter((ref) => ref.slug),
            source: 'sanity',
        }
    } catch (error) {
        // A CMS outage should not take the gallery down with it.
        console.error('[gallery] Sanity query failed, serving fixture data instead:', error)
        return mockFeed()
    }
}

/** An offset past the end returns nothing, which is how the feed ends. */
export async function getGalleryBatch(
    locale: AppLocale,
    offset: number,
    limit: number = GALLERY_BATCH_SIZE,
): Promise<Artwork[]> {
    const client = getSanityClient()

    if (!client) {
        return mockFallback().slice(offset, offset + limit)
    }

    const docs = await client.fetch<SanityArtwork[] | null>(
        galleryBatchQuery,
        {start: offset, end: offset + limit},
        cacheOptions(),
    )

    return (docs ?? []).map((doc) => mapArtwork(doc, locale))
}

export async function getGalleryArtwork(locale: AppLocale, slug: string): Promise<Artwork | null> {
    if (!slug) return null

    const client = getSanityClient()

    if (!client) {
        return (
            mockFallback().find(
                (artwork) => artwork.slug === slug || artwork.previousSlugs?.includes(slug),
            ) ?? null
        )
    }

    try {
        const doc = await client.fetch<SanityArtwork | null>(
            galleryArtworkBySlugQuery,
            {slug},
            cacheOptions(),
        )

        return doc ? mapArtwork(doc, locale) : null
    } catch (error) {
        // Only the deep-linked modal is lost; the gallery itself still renders.
        console.error('[gallery] Sanity artwork lookup failed:', error)
        return null
    }
}
