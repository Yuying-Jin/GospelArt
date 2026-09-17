import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import type {Artwork, ArtworkSection, ArtworkSectionText} from '@/types/artwork'
import {artworkImageUrl, CARD_IMAGE_WIDTH} from './image'

export type AppLocale = 'en' | 'zh-CN' | 'zh-TW'

/**
 * Sanity field names must be alphanumeric, so locales are stored as `en` /
 * `zhCN` / `zhTW`. This module is the only place that knows about that.
 */
type SanityLocaleValue = {
    en?: string | null
    zhCN?: string | null
    zhTW?: string | null
} | null

type SanityArtworkSection = {
    _key: string
    id?: string | null
    title?: SanityLocaleValue
    body?: SanityLocaleValue
}

export type SanityArtwork = {
    slug?: string | null
    previousSlugs?: string[] | null
    bibleReference?: string | null
    date?: string | null
    scripture?: SanityLocaleValue
    image?: SanityImageSource | null
    bibleThemes?: SanityLocaleValue[] | null
    spiritualThemes?: SanityLocaleValue[] | null
    sections?: SanityArtworkSection[] | null
}

function clean(value?: string | null): string {
    return typeof value === 'string' ? value.trim() : ''
}

/**
 * Traditional Chinese is the authored language and the last resort for the
 * others, since most artworks are not translated yet and the modal renders a
 * missing locale as nothing. Render-time only: nothing is written back.
 */
const FALLBACK_ORDER: Record<AppLocale, ('zhTW' | 'zhCN' | 'en')[]> = {
    'zh-TW': ['zhTW', 'zhCN', 'en'],
    'zh-CN': ['zhCN', 'zhTW', 'en'],
    en: ['en', 'zhTW', 'zhCN'],
}

function resolveLocale(value: SanityLocaleValue, locale: AppLocale): string {
    for (const key of FALLBACK_ORDER[locale]) {
        const candidate = clean(value?.[key])
        if (candidate) return candidate
    }
    return ''
}

function toSectionText(value: SanityLocaleValue): ArtworkSectionText {
    return {
        en: resolveLocale(value, 'en'),
        'zh-CN': resolveLocale(value, 'zh-CN'),
        'zh-TW': resolveLocale(value, 'zh-TW'),
    }
}

function toThemeList(values: SanityLocaleValue[] | null | undefined, locale: AppLocale): string[] {
    return (values ?? []).map((value) => resolveLocale(value, locale)).filter(Boolean)
}

function toSections(
    sections: SanityArtworkSection[] | null | undefined,
): ArtworkSection[] {
    return (sections ?? [])
        .filter((section) => section?.title || section?.body)
        .map((section) => ({
            id: clean(section.id) || section._key,
            title: toSectionText(section.title ?? null),
            body: toSectionText(section.body ?? null),
        }))
}

export function mapArtwork(doc: SanityArtwork, locale: AppLocale): Artwork {
    const scripture = doc.scripture ?? null

    // Scripture always renders bilingually; the locale only picks the script.
    const chinese =
        locale === 'zh-CN'
            ? clean(scripture?.zhCN) || clean(scripture?.zhTW)
            : clean(scripture?.zhTW) || clean(scripture?.zhCN)

    return {
        scripture_chinese: chinese,
        // Never falls back to Chinese: the modal appends "(ESV)" to this.
        scripture_english: clean(scripture?.en),
        image_path: (doc.image ? artworkImageUrl(doc.image) : null) ?? '',
        thumbnail_path: (doc.image ? artworkImageUrl(doc.image, CARD_IMAGE_WIDTH) : null) ?? '',
        date: clean(doc.date),
        bible_reference: clean(doc.bibleReference),
        slug: clean(doc.slug),
        previousSlugs: (doc.previousSlugs ?? []).filter(Boolean),
        bibleThemes: toThemeList(doc.bibleThemes, locale),
        spiritualThemes: toThemeList(doc.spiritualThemes, locale),
        sections: toSections(doc.sections),
    }
}
