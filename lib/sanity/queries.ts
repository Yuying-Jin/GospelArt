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
 * What the gallery requires of an artwork, without the type check, so it can
 * also be asked of an artwork reached by dereference — which is how a curated
 * collection's members are checked. `sanity/lib/galleryEligibility.ts` holds
 * the Studio's copy; keep the two in sync.
 *
 * All three scripture languages are required because the card and the modal
 * show Chinese and English together; migrated artworks arrive without any
 * verse text and wait in the Studio's "Missing scripture" list. Section
 * translations are not required — they are filled in gradually.
 */
export const GALLERY_ELIGIBLE = `defined(slug.current) &&
        defined(image.asset) &&
        defined(scripture.zhTW) && scripture.zhTW != "" &&
        defined(scripture.zhCN) && scripture.zhCN != "" &&
        defined(scripture.en)   && scripture.en   != "" &&
        ${GALLERY_VISIBILITY}`

/**
 * Mirrors the Studio's "Gallery — live on the site" list in
 * `sanity/structure.ts` — keep the two in sync.
 */
export const GALLERY_FILTER = `_type == "artwork" && ${GALLERY_ELIGIBLE}`

/**
 * `_id` is a tiebreaker, not a curatorial key: 20 artworks share a date with
 * another and GROQ leaves equal sort keys unordered, so without it a batch
 * boundary could repeat or skip an artwork. Every ordering here needs one for
 * the same reason, including the reference ordering a collection can ask for.
 */
export const GALLERY_ORDERS = {
    dateDesc: 'order(date desc, _id asc)',
    dateAsc: 'order(date asc, _id asc)',
    reference: 'order(bibleReference asc, date desc, _id asc)',
} as const

const GALLERY_ORDER = GALLERY_ORDERS.dateDesc

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
 * The opening batch plus the slug of every artwork in order. That list is what
 * lets the modal's prev/next span the whole set, and it doubles as the total,
 * so no separate count can disagree with it.
 *
 * `orderSlice` caps the list for a dynamic collection that sets a maximum. The
 * batch stays `[$start...$end]`, clamped to the same cap by the caller, so the
 * artworks are always a prefix of the order.
 */
export function buildGalleryFeedQuery(filter: string, order: string, orderSlice = ''): string {
    return `{
    "artworks": *[${filter}] | ${order} [$start...$end] ${ARTWORK_PROJECTION},
    "order": *[${filter}] | ${order}${orderSlice} ${ARTWORK_REF_PROJECTION}
}`
}

export function buildGalleryBatchQuery(filter: string, order: string): string {
    return `*[${filter}] | ${order} [$start...$end] ${ARTWORK_PROJECTION}`
}

export const galleryFeedQuery = defineQuery(buildGalleryFeedQuery(GALLERY_FILTER, GALLERY_ORDER))

export const galleryBatchQuery = defineQuery(buildGalleryBatchQuery(GALLERY_FILTER, GALLERY_ORDER))

/**
 * A window of a curated collection. Its order is the order of the document's
 * array, which GROQ cannot sort by, so the caller passes the slugs it wants
 * and restores the order itself.
 */
export const galleryBySlugsQuery = defineQuery(
    `*[${GALLERY_FILTER} && slug.current in $slugs] ${ARTWORK_PROJECTION}`,
)

/** Retired slugs resolve too, so links shared before a URL change still work. */
export const galleryArtworkBySlugQuery = defineQuery(
    `*[${GALLERY_FILTER} && (slug.current == $slug || $slug in previousSlugs)] | ${GALLERY_ORDER} [0] ${ARTWORK_PROJECTION}`,
)

/**
 * One collection, with everything needed to decide which artworks it holds:
 * the rules for a dynamic one, and for a curated one the members in array
 * order, each carrying whether the gallery would show it. The flag is read
 * here rather than filtered in GROQ because a filter applied to a
 * dereferenced array is not an array filter — it resolves to null.
 */
export const collectionBySlugQuery = defineQuery(`*[_type == "collection" && slug.current == $slug][0]{
    "slug": slug.current,
    title,
    description,
    mode,
    "rules": rules{
        "bibleThemes": bibleThemes[]._ref,
        "spiritualThemes": spiritualThemes[]._ref,
        match,
        dateFrom,
        dateTo,
        sort,
        limit
    },
    "members": artworks[]->{
        "slug": slug.current,
        "previousSlugs": coalesce(previousSlugs, []),
        "eligible": ${GALLERY_ELIGIBLE}
    }
}`)

/**
 * The gallery menu. Sorted by the caller: `navOrder` is optional, and GROQ's
 * placement of documents without one is not worth depending on.
 */
export const navCollectionsQuery = defineQuery(`*[_type == "collection" &&
        showInNav != false &&
        defined(slug.current)
] {
    "slug": slug.current,
    title,
    navOrder
}`)
