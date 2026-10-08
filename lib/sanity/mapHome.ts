import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import {croppedRatio, imageFocus, type ImageCrop, type ImageHotspot} from '@/lib/imageFocus'
import {localizeReference} from '@/lib/scripture/citation'
import type {HomeArtwork, HomePage} from '@/types/home'
import {artworkImageUrl} from './image'
import {resolveLocale, type AppLocale, type SanityLocaleValue} from './mapArtwork'
import {mapNewsListItem, type SanityNewsListItem} from './mapNews'

export type SanityHomeArtwork = {
    eligible?: boolean | null
    slug?: string | null
    bibleReference?: string | null
    date?: string | null
    scripture?: SanityLocaleValue
    image?: (SanityImageSource & {hotspot?: ImageHotspot | null; crop?: ImageCrop | null}) | null
    imageWidth?: number | null
    imageHeight?: number | null
    glow?: string | null
} | null

export type SanityHomePage = {
    page?: {
        heroTone?: string | null
        heroZoom?: number | null
        heroIntro?: SanityLocaleValue
        heroButton?: SanityLocaleValue
        creedLine?: SanityLocaleValue
        creedItems?: {_key: string; title?: SanityLocaleValue; body?: SanityLocaleValue}[] | null
        closingScripture?: SanityLocaleValue
        closingReference?: string | null
        closingEsv?: boolean | null
        hero?: SanityHomeArtwork
    } | null
    latest?: SanityHomeArtwork[] | null
    news?: SanityNewsListItem[] | null
} | null

/** The opening picture fills a desktop screen, so it is served larger than the rest. */
export const HERO_IMAGE_WIDTH = 2000
export const WORK_IMAGE_WIDTH = 1000

/** Gold, for an image whose palette has not been extracted. */
const DEFAULT_GLOW = '#edc95b'

const clean = (value?: string | null) => (typeof value === 'string' ? value.trim() : '')

export function mapHomeArtwork(doc: SanityHomeArtwork, locale: AppLocale, width: number): HomeArtwork | null {
    if (!doc?.slug || !doc.image || !doc.imageWidth || !doc.imageHeight) return null
    const imageUrl = artworkImageUrl(doc.image, width)
    if (!imageUrl) return null

    const crop = doc.image.crop ?? null
    const cropWidth = doc.imageWidth * (1 - (crop?.left ?? 0) - (crop?.right ?? 0))
    const served = Math.min(Math.round(cropWidth), width)
    const {x, y} = imageFocus(doc.image.hotspot, crop)
    const scripture = doc.scripture ?? null

    return {
        slug: doc.slug,
        reference: localizeReference(clean(doc.bibleReference), locale),
        date: clean(doc.date),
        chinese:
            locale === 'zh-CN'
                ? clean(scripture?.zhCN) || clean(scripture?.zhTW)
                : clean(scripture?.zhTW) || clean(scripture?.zhCN),
        english: clean(scripture?.en),
        imageUrl,
        width: served,
        height: Math.round(served / croppedRatio(doc.imageWidth, doc.imageHeight, crop)),
        focusX: x,
        focusY: y,
        glow: clean(doc.glow) || DEFAULT_GLOW,
    }
}

export function mapHomePage(doc: SanityHomePage, locale: AppLocale): HomePage {
    const page = doc?.page ?? null
    const latestDocs = doc?.latest ?? []

    // The chosen artwork while it is still in the gallery, else the newest.
    const heroDoc = page?.hero?.eligible ? page.hero : latestDocs[0] ?? null

    const closing = page?.closingScripture ?? null
    const closingZh =
        locale === 'zh-CN'
            ? clean(closing?.zhCN) || clean(closing?.zhTW)
            : clean(closing?.zhTW) || clean(closing?.zhCN)
    const closingEn = clean(closing?.en)
    const hasClosing = Boolean(closingZh || closingEn)

    return {
        hero: {
            artwork: mapHomeArtwork(heroDoc, locale, HERO_IMAGE_WIDTH),
            tone: page?.heroTone === 'light' ? 'light' : 'dark',
            // Only for the chosen artwork: the zoom was set with its picture in mind.
            zoom: page?.hero?.eligible ? Math.min(1.5, Math.max(1, page.heroZoom ?? 1)) : 1,
            intro: resolveLocale(page?.heroIntro ?? null, locale),
            button: resolveLocale(page?.heroButton ?? null, locale),
        },
        creed: {
            line: resolveLocale(page?.creedLine ?? null, locale),
            items: (page?.creedItems ?? [])
                .map((item) => ({
                    key: item._key,
                    title: resolveLocale(item.title ?? null, locale),
                    body: resolveLocale(item.body ?? null, locale),
                }))
                .filter((item) => item.title && item.body),
        },
        latest: latestDocs
            .map((artwork) => mapHomeArtwork(artwork, locale, WORK_IMAGE_WIDTH))
            .filter((artwork) => artwork !== null),
        news: (doc?.news ?? [])
            .map((item) => mapNewsListItem(item, locale))
            .filter((item) => item !== null),
        closing: hasClosing
            ? {
                  // The page's own language only; the other when it has none.
                  primary: locale === 'en' ? closingEn || closingZh : closingZh || closingEn,
                  reference: localizeReference(clean(page?.closingReference), locale),
                  // Only where the English is what is shown. Unset counts as ESV, as Fetch fills it from the ESV.
                  esv: locale === 'en' && Boolean(closingEn) && page?.closingEsv !== false,
              }
            : null,
    }
}
