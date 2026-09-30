import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import type {PortableTextBlock} from 'next-sanity'
import {markEsv} from '@/lib/esvCredit'
import {NEWS_CATEGORY_IDS, type NewsCategory} from '@/lib/newsCategories'
import type {NewsArticle, NewsBodyImage, NewsImage, NewsLink, NewsListItem} from '@/types/news'
import {artworkImageUrl, newsCoverUrl} from './image'
import {FALLBACK_ORDER, resolveLocale, type AppLocale, type SanityLocaleValue} from './mapArtwork'

export type SanityNewsListItem = {
    slug?: string | null
    category?: string | null
    publishedAt?: string | null
    title?: SanityLocaleValue
    summary?: SanityLocaleValue
    bodyText?: SanityLocaleValue
    coverImage?: SanityImageSource | null
    event?: {
        startDate?: string | null
        endDate?: string | null
        location?: SanityLocaleValue
    } | null
}

const isCategory = (value: unknown): value is NewsCategory =>
    NEWS_CATEGORY_IDS.includes(value as NewsCategory)

/** `NEWS_FILTER` already guarantees the required fields; this only guards the types. */
export function mapNewsListItem(doc: SanityNewsListItem, locale: AppLocale): NewsListItem | null {
    if (!doc.slug || !doc.publishedAt || !isCategory(doc.category)) return null

    return {
        slug: doc.slug,
        category: doc.category,
        publishedAt: doc.publishedAt,
        title: resolveLocale(doc.title ?? null, locale),
        summary: resolveLocale(doc.summary ?? null, locale) || resolveLocale(doc.bodyText ?? null, locale),
        coverUrl: doc.coverImage ? newsCoverUrl(doc.coverImage) : null,
        event: doc.event?.startDate
            ? {
                  startDate: doc.event.startDate,
                  endDate: doc.event.endDate || null,
                  location: resolveLocale(doc.event.location ?? null, locale),
              }
            : null,
    }
}

/** The article column is ~680px wide, so 1360 covers a 2x display. */
const ARTICLE_IMAGE_WIDTH = 1360
const FULLSCREEN_IMAGE_WIDTH = 2400

type SanityBodyImage = {
    _type: 'image'
    _key: string
    asset?: unknown
    caption?: string | null
    width?: number | null
    height?: number | null
}
type SanityBodyBlock = PortableTextBlock | SanityBodyImage

export type SanityNewsArticle = {
    _id: string
    slug?: string | null
    category?: string | null
    publishedAt?: string | null
    title?: SanityLocaleValue
    summary?: SanityLocaleValue
    coverImage?: SanityImageSource | null
    coverWidth?: number | null
    coverHeight?: number | null
    event?: {
        name?: SanityLocaleValue
        startDate?: string | null
        endDate?: string | null
        location?: SanityLocaleValue
        organizer?: SanityLocaleValue
        externalUrl?: string | null
    } | null
    collection?: {title?: SanityLocaleValue; slug?: string | null} | null
    body?: {en?: SanityBodyBlock[] | null; zhCN?: SanityBodyBlock[] | null; zhTW?: SanityBodyBlock[] | null} | null
}

export type SanityNewsLink = {slug?: string | null; title?: SanityLocaleValue} | null

function image(source: SanityImageSource, width?: number | null, height?: number | null): NewsImage | null {
    const url = artworkImageUrl(source, ARTICLE_IMAGE_WIDTH)
    const fullUrl = artworkImageUrl(source, FULLSCREEN_IMAGE_WIDTH)
    if (!url || !fullUrl) return null
    return {url, fullUrl, width: width ?? undefined, height: height ?? undefined}
}

export function mapNewsLink(doc: SanityNewsLink, locale: AppLocale): NewsLink | null {
    return doc?.slug ? {slug: doc.slug, title: resolveLocale(doc.title ?? null, locale)} : null
}

/** The first language with any body, in the same fallback order as the text fields. */
function pickBody(body: SanityNewsArticle['body'], locale: AppLocale): SanityBodyBlock[] {
    for (const key of FALLBACK_ORDER[locale]) {
        const blocks = body?.[key]
        if (blocks?.length) return blocks
    }
    return []
}

export function mapNewsArticle(
    doc: SanityNewsArticle,
    locale: AppLocale,
    neighbours: {older: SanityNewsLink; newer: SanityNewsLink},
): NewsArticle | null {
    if (!doc.slug || !doc.publishedAt || !isCategory(doc.category)) return null

    const blocks = pickBody(doc.body, locale).flatMap((block): (PortableTextBlock | NewsBodyImage)[] => {
        if (block._type !== 'image') return [block as PortableTextBlock]
        const {_key, caption, width, height} = block as SanityBodyImage
        const resolved = image(block as SanityImageSource, width, height)
        return resolved ? [{...resolved, _type: 'image', _key, caption: caption?.trim() ?? ''}] : []
    })

    const event = doc.event?.startDate ? doc.event : null

    return {
        slug: doc.slug,
        category: doc.category,
        publishedAt: doc.publishedAt,
        title: resolveLocale(doc.title ?? null, locale),
        summary: resolveLocale(doc.summary ?? null, locale),
        cover: doc.coverImage ? image(doc.coverImage, doc.coverWidth, doc.coverHeight) : null,
        event: event
            ? {
                  name: resolveLocale(event.name ?? null, locale),
                  startDate: event.startDate as string,
                  endDate: event.endDate || null,
                  location: resolveLocale(event.location ?? null, locale),
                  organizer: resolveLocale(event.organizer ?? null, locale),
                  externalUrl: event.externalUrl || null,
              }
            : null,
        collection: doc.collection?.slug
            ? {slug: doc.collection.slug, title: resolveLocale(doc.collection.title ?? null, locale)}
            : null,
        body: markEsv(blocks as {_type?: string}[]) as (PortableTextBlock | NewsBodyImage)[],
        older: mapNewsLink(neighbours.older, locale),
        newer: mapNewsLink(neighbours.newer, locale),
    }
}
