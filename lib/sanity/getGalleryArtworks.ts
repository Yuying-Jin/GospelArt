import mockArtworks from '@/data/artworks.json'
import type {Artwork} from '@/types/artwork'
import {cacheOptions} from './cache'
import {getSanityClient} from './client'
import {resolveGallerySource, type GallerySource} from './getCollections'
import {mapArtwork, type AppLocale, type SanityArtwork} from './mapArtwork'
import {
    buildGalleryBatchQuery,
    buildGalleryFeedQuery,
    galleryArtworkBySlugQuery,
    galleryBatchQuery,
    galleryBySlugsQuery,
    galleryFeedQuery,
} from './queries'

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

/**
 * A collection that holds nothing yet, or whose CMS read failed. The fixture is
 * never substituted here: it is the whole archive, and showing the archive
 * under a collection's URL would be a quietly wrong page.
 */
function emptyFeed(): GalleryFeed {
    return {artworks: [], order: [], source: 'sanity'}
}

/** A dynamic collection can cap itself, and no window may reach past the cap. */
function windowEnd(source: GallerySource, end: number): number {
    if (source.kind === 'query' && source.limit) return Math.min(end, source.limit)
    return end
}

/**
 * A window of a hand-ordered collection. GROQ returns the artworks in its own
 * order, so the requested slugs put them back into the collection's.
 *
 * A member unpublished since the order was resolved drops out and shortens the
 * batch, the same way the offset-sliced path shifts when the underlying set
 * changes mid-session.
 */
async function fetchArtworksBySlugs(
    locale: AppLocale,
    refs: GalleryArtworkRef[],
): Promise<Artwork[]> {
    const client = getSanityClient()
    if (!client || !refs.length) return []

    const slugs = refs.map((ref) => ref.slug)
    const docs = await client.fetch<SanityArtwork[] | null>(
        galleryBySlugsQuery,
        {slugs},
        cacheOptions(),
    )

    const bySlug = new Map((docs ?? []).map((doc) => [doc.slug ?? '', doc]))

    return slugs
        .map((slug) => bySlug.get(slug))
        .filter((doc): doc is SanityArtwork => Boolean(doc))
        .map((doc) => mapArtwork(doc, locale))
}

/**
 * The opening batch and the order of the set behind it: the whole gallery, or
 * one collection's slice of it.
 */
export async function getGalleryFeed(
    locale: AppLocale,
    collectionSlug?: string,
): Promise<GalleryFeed> {
    const client = getSanityClient()

    if (!client) {
        return collectionSlug ? emptyFeed() : mockFeed()
    }

    try {
        const source = await resolveGallerySource(collectionSlug)

        // No such collection. The route 404s on its own lookup; this only keeps
        // the archive from standing in for it.
        if (!source) return emptyFeed()

        if (source.kind === 'list') {
            return {
                artworks: await fetchArtworksBySlugs(
                    locale,
                    source.refs.slice(0, GALLERY_BATCH_SIZE),
                ),
                order: source.refs,
                source: 'sanity',
            }
        }

        const result = await client.fetch<{
            artworks: SanityArtwork[] | null
            order: GalleryArtworkRef[] | null
        }>(
            collectionSlug
                ? buildGalleryFeedQuery(
                      source.filter,
                      source.order,
                      source.limit ? '[0...$limit]' : '',
                  )
                : galleryFeedQuery,
            {
                start: 0,
                end: windowEnd(source, GALLERY_BATCH_SIZE),
                ...source.params,
                ...(source.limit ? {limit: source.limit} : {}),
            },
            cacheOptions(),
        )

        if (!result?.order?.length) {
            return collectionSlug ? emptyFeed() : mockFeed()
        }

        return {
            artworks: (result.artworks ?? []).map((doc) => mapArtwork(doc, locale)),
            order: result.order.map(toRef).filter((ref) => ref.slug),
            source: 'sanity',
        }
    } catch (error) {
        // A CMS outage should not take the gallery down with it.
        console.error('[gallery] Sanity query failed, serving fixture data instead:', error)
        return collectionSlug ? emptyFeed() : mockFeed()
    }
}

/** An offset past the end returns nothing, which is how the feed ends. */
export async function getGalleryBatch(
    locale: AppLocale,
    offset: number,
    limit: number = GALLERY_BATCH_SIZE,
    collectionSlug?: string,
): Promise<Artwork[]> {
    const client = getSanityClient()

    if (!client) {
        return collectionSlug ? [] : mockFallback().slice(offset, offset + limit)
    }

    const source = await resolveGallerySource(collectionSlug)
    if (!source) return []

    if (source.kind === 'list') {
        return fetchArtworksBySlugs(locale, source.refs.slice(offset, offset + limit))
    }

    const docs = await client.fetch<SanityArtwork[] | null>(
        collectionSlug ? buildGalleryBatchQuery(source.filter, source.order) : galleryBatchQuery,
        {
            start: offset,
            end: windowEnd(source, offset + limit),
            ...source.params,
        },
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
