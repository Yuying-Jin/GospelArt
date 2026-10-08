import type {HomePage} from '@/types/home'
import {ARTWORK_CACHE_TAG, cacheOptions, HOME_CACHE_TAG, NEWS_CACHE_TAG} from './cache'
import {draftMode} from 'next/headers'
import {getPreviewClient, getSanityClient} from './client'
import type {AppLocale} from './mapArtwork'
import {mapHomePage, type SanityHomePage} from './mapHome'
import {homePageDraftQuery, homePageQuery} from './queries'

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

    return mapHomePage(doc, locale)
}
