import {ARTWORK_CACHE_TAG, cacheOptions, COLLECTION_CACHE_TAG} from './cache'
import {getSanityClient} from './client'

export type SitemapContent = {
    collections: {slug: string; updatedAt?: string}[]
}

type Fetched = {
    collections?: {slug?: string | null; updatedAt?: string | null}[]
}

/**
 * The collections in the menu, the only content the sitemap lists for now.
 * Pages only, no artwork images: listing them would hand out the pictures the
 * site keeps from being saved.
 */
const sitemapQuery = `{
    "collections": *[_type == "collection" && showInNav != false && defined(slug.current)]{
        "slug": slug.current,
        "updatedAt": _updatedAt
    }
}`

/** Read through the same cache tags as the pages, so the publish webhook refreshes it too; empty when Sanity is unavailable. */
export async function getSitemapContent(): Promise<SitemapContent> {
    const client = getSanityClient()
    if (!client) return {collections: []}
    try {
        const doc = await client.fetch<Fetched>(sitemapQuery, {}, cacheOptions([ARTWORK_CACHE_TAG, COLLECTION_CACHE_TAG]))
        return {
            collections: (doc.collections ?? []).flatMap((c) =>
                c.slug ? [{slug: c.slug, updatedAt: c.updatedAt ?? undefined}] : [],
            ),
        }
    } catch (error) {
        console.error('[sitemap] Sanity query failed, listing the fixed pages only:', error)
        return {collections: []}
    }
}
