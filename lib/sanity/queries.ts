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
 * What a news item needs before the site shows it. Mirrors
 * `sanity/lib/newsEligibility.ts` and the Studio's "Live on the site" news
 * view — keep them in sync.
 */
export const NEWS_ELIGIBLE = `defined(slug.current) &&
    defined(category) &&
    defined(publishedAt) &&
    defined(title.zhTW) && title.zhTW != "" &&
    defined(title.en) && title.en != "" &&
    (count(body.zhTW) > 0 || count(body.en) > 0) &&
    (category != "event" || (defined(event.startDate) &&
        ((defined(event.name.zhTW) && event.name.zhTW != "") || (defined(event.name.en) && event.name.en != "")))) &&
    (category != "seasonal" || defined(season)) &&
    showOnSite != false`

export const NEWS_FILTER = `_type == "news" && ${NEWS_ELIGIBLE}`

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

/** What the modal adds to a card's fields; the home page's newest artworks take it too. */
const ARTWORK_DETAIL_FIELDS = `
        "previousSlugs": coalesce(previousSlugs, []),
        "bibleThemes": bibleThemes[]->title,
        "spiritualThemes": spiritualThemes[]->title,
        "sections": sections[]{
            _key,
            "id": sectionType->key,
            "title": sectionType->title,
            body
        }`

const ARTWORK_PROJECTION = `{
        "slug": slug.current,
        bibleReference,
        date,
        scripture,
        image,
        // Lets a card reserve its height before the image loads. Most artworks
        // are ~1:2 portraits, so an unsized <img> shifts the grid by ~600px.
        "imageWidth": image.asset->metadata.dimensions.width,
        "imageHeight": image.asset->metadata.dimensions.height,${ARTWORK_DETAIL_FIELDS}
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

/** A dynamic collection's rules, theme references as ids, for `buildDynamicQuery`. */
const COLLECTION_RULES_PROJECTION = `rules{
        "bibleThemes": bibleThemes[]._ref,
        "spiritualThemes": spiritualThemes[]._ref,
        match,
        dateFrom,
        dateTo,
        sort,
        limit
    }`

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
    "rules": ${COLLECTION_RULES_PROJECTION},
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

/**
 * One page of the news list and the size of the whole list. `$category` is
 * compared only when the caller adds it to the filter, so the unfiltered list
 * needs no null parameter. The summary falls back to the body's plain text.
 */
const NEWS_LIST_PROJECTION = `{
        "slug": slug.current,
        category,
        publishedAt,
        title,
        summary,
        "bodyText": {
            "en": pt::text(body.en),
            "zhCN": pt::text(body.zhCN),
            "zhTW": pt::text(body.zhTW)
        },
        coverImage,
        "event": select(category == "event" => event{startDate, endDate, location})
    }`

export function buildNewsListQuery(filter: string): string {
    return `{
    "total": count(*[${filter}]),
    "items": *[${filter}] | order(publishedAt desc, _id asc) [$start...$end] ${NEWS_LIST_PROJECTION}
}`
}

const newsBodyLanguage = (lang: string) => `"${lang}": ${lang}[]{
            ...,
            _type == "image" => {
                ...,
                "width": asset->metadata.dimensions.width,
                "height": asset->metadata.dimensions.height
            }
        }`

const NEWS_ARTICLE_PROJECTION = `{
    _id,
    "slug": slug.current,
    category,
    publishedAt,
    title,
    summary,
    coverImage,
    "coverWidth": coverImage.asset->metadata.dimensions.width,
    "coverHeight": coverImage.asset->metadata.dimensions.height,
    event{name, startDate, endDate, location, organizer, externalUrl},
    "collection": relatedCollection->{title, "slug": slug.current},
    body{
        ${newsBodyLanguage('en')},
        ${newsBodyLanguage('zhCN')},
        ${newsBodyLanguage('zhTW')}
    }
}`

/**
 * One article, by its slug or a retired one, so links shared before a
 * Change page URL still land; the page then redirects to the current slug.
 */
export const newsArticleBySlugQuery = defineQuery(`*[${NEWS_FILTER} && (slug.current == $slug || $slug in previousSlugs)] | order(publishedAt desc, _id asc) [0] ${NEWS_ARTICLE_PROJECTION}`)

/** The Studio's preview: any news item by its slug, shown or not. */
export const newsArticlePreviewQuery = defineQuery(`*[_type == "news" && slug.current == $slug] | order(publishedAt desc, _id asc) [0] ${NEWS_ARTICLE_PROJECTION}`)

/**
 * The articles either side of one, in the list's own order (newest first,
 * `_id` breaking ties): `older` follows it, `newer` precedes it. Within its
 * category, or across all news for a reader who came from All News.
 */
function buildNewsNeighboursQuery(filter: string): string {
    return `{
    "older": *[${filter} && (publishedAt < $publishedAt || (publishedAt == $publishedAt && _id > $id))] | order(publishedAt desc, _id asc) [0] {"slug": slug.current, title},
    "newer": *[${filter} && (publishedAt > $publishedAt || (publishedAt == $publishedAt && _id < $id))] | order(publishedAt asc, _id desc) [0] {"slug": slug.current, title}
}`
}

export const newsNeighboursInCategoryQuery = defineQuery(buildNewsNeighboursQuery(`${NEWS_FILTER} && category == $category`))

export const newsNeighboursQuery = defineQuery(buildNewsNeighboursQuery(NEWS_FILTER))

/**
 * What the home page shows of an artwork: the image with its hotspot, for
 * where the opening picture is cropped, and the palette its light is tinted
 * from.
 */
const HOME_ARTWORK_FIELDS = `
        "slug": slug.current,
        bibleReference,
        date,
        scripture,
        image,
        "imageWidth": image.asset->metadata.dimensions.width,
        "imageHeight": image.asset->metadata.dimensions.height,
        "glow": coalesce(
            image.asset->metadata.palette.lightVibrant.background,
            image.asset->metadata.palette.vibrant.background,
            image.asset->metadata.palette.dominant.background
        )`

/**
 * Everything the home page reads in one request. The chosen opening artwork
 * carries a flag rather than being filtered, for the same reason as a curated
 * collection's members: a filter on a dereference resolves to null. Without a
 * chosen artwork, or with one no longer in the gallery, the caller opens with
 * the newest.
 */
const HOME_PAGE_PROJECTION = `{
        heroTone,
        heroZoom,
        heroIntro,
        heroButton,
        creedLine,
        "creedItems": creedItems[]{_key, title, body},
        closingScripture,
        closingReference,
        closingEsv,
        "worksCollection": worksCollection._ref,
        "hero": heroArtwork->{"eligible": ${GALLERY_ELIGIBLE}, ${HOME_ARTWORK_FIELDS}}
    }`

export const homePageQuery = defineQuery(`{
    "page": *[_id == "homePage"][0]${HOME_PAGE_PROJECTION},
    "latest": *[${GALLERY_FILTER}] | ${GALLERY_ORDER} [0...5] {${HOME_ARTWORK_FIELDS},${ARTWORK_DETAIL_FIELDS}},
    "news": *[${NEWS_FILTER}] | order(publishedAt desc, _id asc) [0...3] ${NEWS_LIST_PROJECTION}
}`)

/**
 * The collection chosen for the home page's row of artworks: a curated one's
 * members in array order with the eligibility flag, a dynamic one's rules for
 * `buildHomeWorksQuery`.
 */
export const homeWorksCollectionQuery = defineQuery(`*[_type == "collection" && _id == $id][0]{
    "slug": slug.current,
    title,
    mode,
    "rules": ${COLLECTION_RULES_PROJECTION},
    "members": artworks[]->{"eligible": ${GALLERY_ELIGIBLE}, ${HOME_ARTWORK_FIELDS},${ARTWORK_DETAIL_FIELDS}}
}`)

/** A dynamic collection's first artworks, for the home page's row. */
export function buildHomeWorksQuery(filter: string, order: string, limit: number): string {
    return `*[${filter}] | ${order} [0...${limit}] {${HOME_ARTWORK_FIELDS},${ARTWORK_DETAIL_FIELDS}}`
}

/** The Studio's preview: the home page document as drafted, before it is published. */
export const homePageDraftQuery = defineQuery(`*[_id == "homePage"][0]${HOME_PAGE_PROJECTION}`)
