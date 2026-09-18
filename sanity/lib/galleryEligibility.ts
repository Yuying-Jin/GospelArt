import {GALLERY_VISIBILITY_GROQ} from './selectionCriteria'

/**
 * What the public gallery requires of an artwork before it can appear at all:
 * a URL, an image, all three scripture languages, and a visibility that
 * permits it.
 *
 * `lib/sanity/queries.ts` holds the app-side copy as `GALLERY_FILTER` — keep
 * the two in sync. Collections select a *subset* of these artworks and never
 * widen the set, so a curated pick that fails here stays off the site.
 */
export const GALLERY_ELIGIBLE_GROQ = `defined(slug.current) &&
    defined(image.asset) &&
    defined(scripture.zhTW) && scripture.zhTW != "" &&
    defined(scripture.zhCN) && scripture.zhCN != "" &&
    defined(scripture.en) && scripture.en != "" &&
    ${GALLERY_VISIBILITY_GROQ}`
