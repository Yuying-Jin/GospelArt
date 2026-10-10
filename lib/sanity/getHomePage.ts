import type {HomePage} from '@/types/home'
import {ARTWORK_CACHE_TAG, cacheOptions, COLLECTION_CACHE_TAG, HOME_CACHE_TAG, NEWS_CACHE_TAG} from './cache'
import {draftMode} from 'next/headers'
import {getPreviewClient, getSanityClient} from './client'
import {buildDynamicQuery, type CollectionRules} from './collectionFilter'
import type {AppLocale} from './mapArtwork'
import {mapHomePage, type SanityHomePage, type SanityHomeWork, type SanityHomeWorks} from './mapHome'
import {buildHomeWorksQuery, homePageDraftQuery, homePageQuery, homeWorksCollectionQuery} from './queries'

/** The most the row of artworks shows of a collection. */
const HOME_COLLECTION_LIMIT = 12

type WorksCollectionDoc = {
    slug?: string | null
    title?: NonNullable<SanityHomeWorks>['title']
    mode?: string | null
    rules?: CollectionRules | null
    members?: (SanityHomeWork & {eligible?: boolean | null})[] | null
} | null

/**
 * The chosen collection's first artworks, always from the published dataset,
 * even in preview, where only the choice itself comes from the draft.
 */
async function getWorksCollection(id: string): Promise<SanityHomeWorks> {
    const client = getSanityClient()
    if (!client) return null
    const tags = cacheOptions([HOME_CACHE_TAG, ARTWORK_CACHE_TAG, COLLECTION_CACHE_TAG])

    const doc = await client.fetch<WorksCollectionDoc>(homeWorksCollectionQuery, {id}, tags)
    if (!doc?.slug) return null

    let works: SanityHomeWork[]
    if (doc.mode === 'dynamic') {
        const {filter, order, params, limit} = buildDynamicQuery(doc.rules)
        const query = buildHomeWorksQuery(filter, order, Math.min(limit ?? HOME_COLLECTION_LIMIT, HOME_COLLECTION_LIMIT))
        works = (await client.fetch<SanityHomeWork[] | null>(query, params, tags)) ?? []
    } else {
        works = (doc.members ?? []).filter((member) => member?.eligible).slice(0, HOME_COLLECTION_LIMIT)
    }

    return {slug: doc.slug, title: doc.title, works}
}

/**
 * The home page in one request. Without the CMS, or when it fails, the page
 * still renders: an opening with no picture and no lists, rather than an error.
 */
export async function getHomePage(locale: AppLocale): Promise<HomePage> {
    const client = getSanityClient()
    let doc: SanityHomePage = null

    if (client) {
        try {
            doc = await client.fetch<SanityHomePage>(
                homePageQuery,
                {},
                cacheOptions([HOME_CACHE_TAG, ARTWORK_CACHE_TAG, NEWS_CACHE_TAG]),
            )
        } catch (error) {
            console.error('[home] Sanity home page query failed:', error)
        }
    }

    // The Studio's Preview tab: the page's own words and opening artwork from
    // the draft, uncached. The artworks and news it lists stay published.
    if ((await draftMode()).isEnabled) {
        const preview = getPreviewClient()
        if (preview) {
            try {
                const page = await preview.fetch<NonNullable<SanityHomePage>['page']>(homePageDraftQuery, {}, {cache: 'no-store'})
                doc = {...(doc ?? {}), page}
            } catch (error) {
                console.error('[home] Sanity home page draft query failed:', error)
            }
        }
    }

    const worksId = doc?.page?.worksCollection
    if (worksId) {
        try {
            doc = {...doc, collection: await getWorksCollection(worksId)}
        } catch (error) {
            // The row falls back to the newest artworks.
            console.error('[home] Sanity works collection query failed:', error)
        }
    }

    return mapHomePage(doc, locale)
}
