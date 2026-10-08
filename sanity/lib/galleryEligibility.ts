import {computeSelectionCriteria, GALLERY_VISIBILITY_GROQ} from './selectionCriteria'

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

export type GalleryStatus = 'live' | 'incomplete' | 'not-selected' | 'hidden'

/**
 * The same rule as `GALLERY_ELIGIBLE_GROQ`, for the artwork list's subtitle,
 * with the reason an artwork is not live. Keep the two in sync.
 */
export function galleryStatus(doc: {
    galleryVisibility?: string
    repetition?: string
    quality?: string
    creativity?: string
    slug?: string
    image?: unknown
    scriptureZhTW?: string
    scriptureZhCN?: string
    scriptureEn?: string
}): GalleryStatus {
    if (doc.galleryVisibility === 'never') return 'hidden'
    if (doc.galleryVisibility !== 'always' && computeSelectionCriteria(doc) !== 'Y') return 'not-selected'
    const complete = Boolean(doc.slug && doc.image && doc.scriptureZhTW && doc.scriptureZhCN && doc.scriptureEn)
    return complete ? 'live' : 'incomplete'
}
