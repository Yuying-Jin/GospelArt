import {ARTWORK_CACHE_TAG, cacheOptions, COLLECTION_CACHE_TAG} from './cache'
import {getSanityClient} from './client'
import {GALLERY_ELIGIBLE} from './queries'

export type SitemapContent = {
    collections: {slug: string; updatedAt?: string; images: string[]}[]
}

type Fetched = {
    collections?: {
        slug?: string | null
        updatedAt?: string | null
        members?: {eligible?: boolean | null; imageUrl?: string | null}[] | null
    }[]
}

/**
 * The collections in the menu, the only content the sitemap lists for now. A
 * curated collection also lists its artworks' images, for image
 * search; members carry an eligibility flag rather than being filtered, since
 * a filter on a dereferenced array resolves to null. Each image is the
 * original file's URL: a resized one carries `&` in its query, which Next
 * writes into the XML unescaped.
 */
const sitemapQuery = `{
    "collections": *[_type == "collection" && showInNav != false && defined(slug.current)]{
        "slug": slug.current,
        "updatedAt": _updatedAt,
        "members": select(mode == "curated" => artworks[]->{"eligible": ${GALLERY_ELIGIBLE}, "imageUrl": image.asset->url})
    }
}`

/** Read through the same cache tags as the pages, so the publish webhook refreshes it too; empty when Sanity is unavailable. */
export async function getSitemapContent(): Promise<SitemapContent> {
    const client = getSanityClient()
    if (!client) return {collections: []}
    try {
        const doc = await client.fetch<Fetched>(
            sitemapQuery,
            {},
            cacheOptions([ARTWORK_CACHE_TAG, COLLECTION_CACHE_TAG]),
        )
        return {
            collections: (doc.collections ?? []).flatMap((c) =>
                c.slug
                    ? [{
                          slug: c.slug,
                          updatedAt: c.updatedAt ?? undefined,
                          images: (c.members ?? []).flatMap((m) => (m?.eligible && m.imageUrl ? [m.imageUrl] : [])),
                      }]
                    : [],
            ),
        }
    } catch (error) {
        console.error('[sitemap] Sanity query failed, listing the fixed pages only:', error)
        return {collections: []}
    }
}
