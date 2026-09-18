import type {Collection, NavCollection} from '@/types/collection'
import {ARTWORK_CACHE_TAG, cacheOptions, COLLECTION_CACHE_TAG} from './cache'
import {getSanityClient} from './client'
import {buildDynamicQuery, type CollectionRules} from './collectionFilter'
import type {GalleryArtworkRef} from './getGalleryArtworks'
import type {AppLocale} from './mapArtwork'
import {
    mapCollection,
    mapNavCollections,
    type SanityCollection,
    type SanityNavCollection,
} from './mapCollection'
import {collectionBySlugQuery, GALLERY_FILTER, GALLERY_ORDERS, navCollectionsQuery} from './queries'

/** Collection reads move with artworks too — see `cache.ts`. */
const COLLECTION_TAGS = [ARTWORK_CACHE_TAG, COLLECTION_CACHE_TAG]

/**
 * Which artworks a gallery page shows, and in what order.
 *
 * Two kinds, because ordering has two sources. A rule set — and the whole
 * gallery — is an ordering GROQ can express, so it is windowed with the same
 * offset slice the gallery has always used. A curated collection's order is
 * the order of its document's array, which GROQ cannot sort by, so the order
 * is resolved once up front and each window is fetched by slug.
 */
export type GallerySource =
    | {kind: 'query'; filter: string; order: string; params: Record<string, string>; limit?: number}
    | {kind: 'list'; refs: GalleryArtworkRef[]}

/** The default: everything the gallery shows, newest first. */
export const ALL_ARTWORKS: GallerySource = {
    kind: 'query',
    filter: GALLERY_FILTER,
    order: GALLERY_ORDERS.dateDesc,
    params: {},
}

type CollectionDoc = SanityCollection & {rules?: CollectionRules | null}

/**
 * The document behind a collection URL. Both the page (for its heading) and
 * the feed (for its members) need it; the fetch is identical and cached, so
 * asking twice in one request costs one round trip.
 */
async function fetchCollectionDoc(slug: string): Promise<CollectionDoc | null> {
    const client = getSanityClient()
    if (!client || !slug) return null

    return client.fetch<CollectionDoc | null>(
        collectionBySlugQuery,
        {slug},
        cacheOptions(COLLECTION_TAGS),
    )
}

/**
 * The gallery menu and the collection switcher. An empty list — no
 * collections, or no CMS — leaves the gallery exactly as it was before
 * collections existed.
 */
export async function getNavCollections(locale: AppLocale): Promise<NavCollection[]> {
    const client = getSanityClient()
    if (!client) return []

    try {
        const docs = await client.fetch<SanityNavCollection[] | null>(
            navCollectionsQuery,
            {},
            cacheOptions(COLLECTION_TAGS),
        )

        return mapNavCollections(docs, locale)
    } catch (error) {
        // The menu loses its collections; every other link still works.
        console.error('[gallery] Sanity collection menu query failed:', error)
        return []
    }
}

/** `null` means there is no such collection, which the route turns into a 404. */
export async function getCollection(
    locale: AppLocale,
    slug: string,
): Promise<Collection | null> {
    try {
        const doc = await fetchCollectionDoc(slug)
        return doc ? mapCollection(doc, locale) : null
    } catch (error) {
        console.error('[gallery] Sanity collection lookup failed:', error)
        return null
    }
}

/**
 * `null` means the collection does not exist. Callers must not fall back to
 * the whole gallery in that case: a collection URL showing the entire archive
 * would be a quietly wrong page rather than a missing one.
 */
export async function resolveGallerySource(
    collectionSlug?: string,
): Promise<GallerySource | null> {
    if (!collectionSlug) return ALL_ARTWORKS

    const doc = await fetchCollectionDoc(collectionSlug)
    if (!doc) return null

    if (doc.mode === 'dynamic') {
        const {filter, order, params, limit} = buildDynamicQuery(doc.rules)
        return {kind: 'query', filter, order, params, limit}
    }

    // Members arrive in the document's own order, each carrying whether the
    // gallery would show it. Dropping the rest here is what keeps a pick that
    // is not ready yet from leaving a hole in the batches.
    const refs = (doc.members ?? [])
        .filter((member) => member?.slug && member.eligible)
        .map((member) => ({
            slug: member!.slug as string,
            previousSlugs: (member!.previousSlugs ?? []).filter(Boolean),
        }))

    return {kind: 'list', refs}
}
