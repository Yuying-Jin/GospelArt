/**
 * Cache tags for the site's Sanity reads, cleared by the publish webhook in
 * `app/api/revalidate/route.ts`.
 *
 * Collection reads carry both tags. A curated collection's member list is
 * projected with an eligibility flag read off each artwork, and a dynamic
 * collection's membership is a rule evaluated over artworks, so editing an
 * artwork can change a collection page without the collection document being
 * touched at all.
 */
export const ARTWORK_CACHE_TAG = 'artwork'
export const COLLECTION_CACHE_TAG = 'collection'
export const NEWS_CACHE_TAG = 'news'

/**
 * The webhook only reaches the deployed site, so a cached read in `next dev`
 * would never expire and a Studio edit would stay invisible until the cache
 * folder was deleted by hand. Development reads fresh every time instead.
 */
export function cacheOptions(tags: string[] = [ARTWORK_CACHE_TAG]) {
    if (process.env.NODE_ENV === 'development') return {cache: 'no-store' as const}
    return {cache: 'force-cache' as const, next: {tags}}
}
