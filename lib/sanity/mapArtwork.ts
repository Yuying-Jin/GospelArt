import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import type {Artwork, ArtworkSection, ArtworkSectionText} from '@/types/artwork'
import {artworkImageSize, artworkImageUrl, CARD_IMAGE_WIDTH} from './image'
import {clean, resolveLocale, type AppLocale, type SanityLocaleValue} from './locale'

export {FALLBACK_ORDER, resolveLocale, type AppLocale, type SanityLocaleValue} from './locale'

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
    imageWidth?: number | null
    imageHeight?: number | null
    bibleThemes?: SanityLocaleValue[] | null
    spiritualThemes?: SanityLocaleValue[] | null
    sections?: SanityArtworkSection[] | null
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

    // Both or neither: a lone dimension tells an <img> nothing. The size is of
    // what `image_path` serves, not of the asset — the card only needs the
    // ratio, but the modal sizes itself from these.
    const served =
        doc.imageWidth && doc.imageHeight
            ? artworkImageSize(doc.imageWidth, doc.imageHeight)
            : null

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
        ...(served ? {image_width: served.width, image_height: served.height} : {}),
        date: clean(doc.date),
        bible_reference: clean(doc.bibleReference),
        slug: clean(doc.slug),
        previousSlugs: (doc.previousSlugs ?? []).filter(Boolean),
        bibleThemes: toThemeList(doc.bibleThemes, locale),
        spiritualThemes: toThemeList(doc.spiritualThemes, locale),
        sections: toSections(doc.sections),
    }
}
