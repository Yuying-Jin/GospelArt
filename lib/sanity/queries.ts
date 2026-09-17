import {defineQuery} from 'next-sanity'

/**
 * Derived, never stored. `sanity/lib/selectionCriteria.ts` holds the same rule
 * for the Studio — keep the two in sync.
 */
const SELECTION_CRITERIA = 'repetition in ["M", "L"] && quality in ["H", "M"] && creativity in ["H", "M"]'

/** A missing `galleryVisibility` behaves as "auto" so older documents still work. */
export const GALLERY_VISIBILITY = `(
    galleryVisibility == "always" ||
    ((!defined(galleryVisibility) || galleryVisibility == "auto") && ${SELECTION_CRITERIA})
)`

/**
 * Mirrors the Studio's "Gallery — live on the site" list in
 * `sanity/structure.ts` — keep the two in sync.
 *
 * All three scripture languages are required because the card and the modal
 * show Chinese and English together; migrated artworks arrive without any
 * verse text and wait in the Studio's "Missing scripture" list. Section
 * translations are not required — they are filled in gradually.
 */
export const GALLERY_FILTER = `_type == "artwork" &&
        defined(slug.current) &&
        defined(image.asset) &&
        defined(scripture.zhTW) && scripture.zhTW != "" &&
        defined(scripture.zhCN) && scripture.zhCN != "" &&
        defined(scripture.en)   && scripture.en   != "" &&
        ${GALLERY_VISIBILITY}`

/**
 * `_id` is a tiebreaker, not a curatorial key: 20 artworks share a date with
 * another and GROQ leaves equal sort keys unordered, so without it a batch
 * boundary could repeat or skip an artwork.
 */
const GALLERY_ORDER = 'order(date desc, _id asc)'

const ARTWORK_PROJECTION = `{
        "slug": slug.current,
        "previousSlugs": coalesce(previousSlugs, []),
        bibleReference,
        date,
        scripture,
        image,
        "bibleThemes": bibleThemes[]->title,
        "spiritualThemes": spiritualThemes[]->title,
        "sections": sections[]{
            _key,
            "id": sectionType->key,
            "title": sectionType->title,
            body
        }
    }`

const ARTWORK_REF_PROJECTION = `{
        "slug": slug.current,
        "previousSlugs": coalesce(previousSlugs, [])
    }`

/**
 * The opening batch plus the slug of every gallery artwork in order. That list
 * is what lets the modal's prev/next span the whole collection, and it doubles
 * as the total, so no separate count can disagree with it.
 */
export const galleryFeedQuery = defineQuery(`{
    "artworks": *[${GALLERY_FILTER}] | ${GALLERY_ORDER} [$start...$end] ${ARTWORK_PROJECTION},
    "order": *[${GALLERY_FILTER}] | ${GALLERY_ORDER} ${ARTWORK_REF_PROJECTION}
}`)

export const galleryBatchQuery = defineQuery(
    `*[${GALLERY_FILTER}] | ${GALLERY_ORDER} [$start...$end] ${ARTWORK_PROJECTION}`,
)

/** Retired slugs resolve too, so links shared before a URL change still work. */
export const galleryArtworkBySlugQuery = defineQuery(
    `*[${GALLERY_FILTER} && (slug.current == $slug || $slug in previousSlugs)] | ${GALLERY_ORDER} [0] ${ARTWORK_PROJECTION}`,
)
