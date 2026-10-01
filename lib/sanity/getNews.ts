import {draftMode} from 'next/headers'
import type {NewsArticle, NewsCategory, NewsPage} from '@/types/news'
import {cacheOptions, COLLECTION_CACHE_TAG, NEWS_CACHE_TAG} from './cache'
import {getPreviewClient, getSanityClient} from './client'
import type {AppLocale} from './mapArtwork'
import {
    mapNewsArticle,
    mapNewsListItem,
    type SanityNewsArticle,
    type SanityNewsLink,
    type SanityNewsListItem,
} from './mapNews'
import {
    buildNewsListQuery,
    NEWS_FILTER,
    newsArticleBySlugQuery,
    newsArticlePreviewQuery,
    newsNeighboursInCategoryQuery,
    newsNeighboursQuery,
} from './queries'

export const NEWS_PAGE_SIZE = 10

/**
 * The Studio's Preview tab turns on Draft Mode: news then reads drafts,
 * uncached. Only news; the gallery stays published.
 */
async function newsSource(tags: string[]) {
    if ((await draftMode()).isEnabled) {
        const client = getPreviewClient()
        if (client) return {client, preview: true, options: {cache: 'no-store' as const}}
    }
    return {client: getSanityClient(), preview: false, options: cacheOptions(tags)}
}

/**
 * One page of the news list, optionally one category. With no CMS, or when
 * it fails, the list is empty: there is no fixture for news.
 */
export async function getNewsPage(
    locale: AppLocale,
    page: number,
    category?: NewsCategory,
): Promise<NewsPage> {
    const {client, options} = await newsSource([NEWS_CACHE_TAG])
    if (!client) return {items: [], total: 0}

    const filter = category ? `${NEWS_FILTER} && category == $category` : NEWS_FILTER
    const start = (page - 1) * NEWS_PAGE_SIZE

    try {
        const result = await client.fetch<{total?: number; items?: SanityNewsListItem[]} | null>(
            buildNewsListQuery(filter),
            {start, end: start + NEWS_PAGE_SIZE, ...(category ? {category} : {})},
            options,
        )

        return {
            items: (result?.items ?? [])
                .map((doc) => mapNewsListItem(doc, locale))
                .filter((item) => item !== null),
            total: result?.total ?? 0,
        }
    } catch (error) {
        console.error('[news] Sanity news list query failed:', error)
        return {items: [], total: 0}
    }
}

/** An article carries its related collection's title, so collection edits reach it too. */
const ARTICLE_TAGS = [NEWS_CACHE_TAG, COLLECTION_CACHE_TAG]

/** Which list an article's previous and next come from: its category, or all news. */
export type NewsScope = 'category' | 'all'

/**
 * One article by its current or a retired slug; `null` is a 404. Unlike the
 * list, a failed fetch throws: a missing article and an outage are not the
 * same page. A preview finds hidden and incomplete items too, so an editor
 * can see one before it qualifies.
 */
export async function getNewsArticle(
    locale: AppLocale,
    slug: string,
    scope: NewsScope = 'category',
): Promise<NewsArticle | null> {
    const {client, preview, options} = await newsSource(ARTICLE_TAGS)
    if (!client) return null

    const doc = await client.fetch<SanityNewsArticle | null>(
        preview ? newsArticlePreviewQuery : newsArticleBySlugQuery,
        {slug},
        options,
    )
    if (!doc?.category || !doc.publishedAt) return null

    const neighbours = await client.fetch<{older: SanityNewsLink; newer: SanityNewsLink} | null>(
        scope === 'all' ? newsNeighboursQuery : newsNeighboursInCategoryQuery,
        {id: doc._id, publishedAt: doc.publishedAt, ...(scope === 'all' ? {} : {category: doc.category})},
        preview ? options : cacheOptions([NEWS_CACHE_TAG]),
    )

    return mapNewsArticle(doc, locale, neighbours ?? {older: null, newer: null})
}
