import type {SanityDocument} from 'sanity'
import type {IframeOptions} from 'sanity-plugin-iframe-pane'
import {SCRIPTURE_API_URL} from './bibleVersions'

/** The site serves both /api/scripture and the preview, so one setting names it. */
const SITE_ORIGIN = new URL(SCRIPTURE_API_URL).origin

/**
 * The news Preview tab: the article page as the site renders it, from the
 * draft. Traditional Chinese first, as it is authored; the site's language
 * switcher works inside the preview.
 */
export const NEWS_PREVIEW: IframeOptions = {
    url: {
        origin: SITE_ORIGIN,
        draftMode: '/api/draft-mode/enable',
        preview: (document: SanityDocument | null) => {
            const slug = (document?.slug as {current?: string} | undefined)?.current
            if (!slug) return new Error('No page URL yet: add the English title and the publication date.')
            return `/zh-TW/news/${slug}`
        },
    },
    reload: {button: true},
    showDisplayUrl: true,
}
