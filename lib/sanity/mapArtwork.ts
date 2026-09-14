import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import type {Artwork, ArtworkSection, ArtworkSectionText} from '@/types/artwork'
import {artworkImageUrl} from './image'

export type AppLocale = 'en' | 'zh-CN' | 'zh-TW'

/**
 * Sanity field names must be alphanumeric, so the locale keys are stored as
 * `en` / `zhCN` / `zhTW` and converted back to the app's `en` / `zh-CN` /
 * `zh-TW` here. This module is the only place that knows about that difference,
 * which is why `Card.tsx` and `DetailsModal.tsx` need no changes at all.
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
 * Traditional Chinese is the primary, authored language, so it is what
 * everything else falls back to: translating 302 artworks three times before
 * launch is not realistic, and `DetailsModal` selects a locale with no fallback
 * of its own, so a missing translation would otherwise render as nothing.
 *
 * This is a **render-time** fallback only. Nothing is ever written into the
 * wrong field — see `sanity/schemaTypes/objects/localeString.ts`.
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

/** Fills all three locales so the existing `ArtworkSectionText` shape holds. */
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

    // Scripture is shown bilingually — Chinese and English together, never one
    // or the other. The UI locale only decides which Chinese script is used.
    const chinese =
        locale === 'zh-CN'
            ? clean(scripture?.zhCN) || clean(scripture?.zhTW)
            : clean(scripture?.zhTW) || clean(scripture?.zhCN)

    return {
        scripture_chinese: chinese,
        // Never falls back to Chinese: the modal appends "(ESV)" to whatever is
        // here, and already hides the line when it is empty.
        scripture_english: clean(scripture?.en),
        image_path: (doc.image ? artworkImageUrl(doc.image) : null) ?? '',
        date: clean(doc.date),
        bible_reference: clean(doc.bibleReference),
        slug: clean(doc.slug),
        previousSlugs: (doc.previousSlugs ?? []).filter(Boolean),
        bibleThemes: toThemeList(doc.bibleThemes, locale),
        spiritualThemes: toThemeList(doc.spiritualThemes, locale),
        sections: toSections(doc.sections),
    }
}
