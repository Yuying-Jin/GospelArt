import mockArtworks from '@/data/artworks.json'
import type {Artwork} from '@/types/artwork'
import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import {croppedRatio, imageFocus, type ImageCrop, type ImageHotspot} from '@/lib/imageFocus'
import {ARTWORK_CACHE_TAG, cacheOptions} from './cache'
import {getSanityClient} from './client'
import {artworkImageUrl} from './image'
import {clean, type AppLocale, type SanityLocaleValue} from './locale'
import {GALLERY_FILTER, GALLERY_ORDERS} from './queries'

/** One artwork to show on its own, such as in the 404 page's window. */
export type FeaturedArtwork = {
    slug: string
    reference: string
    /** Shown bilingually, as everywhere: the locale only picks the Chinese script. */
    scriptureChinese: string
    /** ESV, so it is shown with the ESV mark. */
    scriptureEnglish: string
    imageUrl: string
    /** The served picture's width over its height, so it can be placed to cover the window. */
    ratio: number
    /** Where the picture's subject sits, as percentages across and down. */
    focus: {x: number; y: number}
    /** The picture's own colour, for the light behind it. */
    glow: string
}

/** How far back the choice reaches: the newest few, so the window shows recent work. */
const NEWEST = 5
/** The window is about 340px wide, so 900 covers a 2x display. */
const IMAGE_WIDTH = 900
/** Gold, as on the home page, for an image whose palette has not been extracted. */
const DEFAULT_GLOW = '#edc95b'

type Candidate = {
    slug?: string | null
    bibleReference?: string | null
    scripture?: SanityLocaleValue
    dimensions?: {width?: number; height?: number} | null
    image?: (SanityImageSource & {hotspot?: ImageHotspot; crop?: ImageCrop}) | null
    glow?: string | null
}

/** The newest gallery artworks, in the gallery's own order, cached like any gallery read. */
const candidatesQuery = `*[${GALLERY_FILTER}] | ${GALLERY_ORDERS.dateDesc} [0...${NEWEST}]{
    "slug": slug.current,
    bibleReference,
    scripture,
    image,
    "dimensions": image.asset->metadata.dimensions,
    "glow": coalesce(
        image.asset->metadata.palette.lightVibrant.background,
        image.asset->metadata.palette.vibrant.background,
        image.asset->metadata.palette.dominant.background
    )
}`

const pick = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)]

function chineseFor(scripture: SanityLocaleValue | undefined, locale: AppLocale): string {
    return locale === 'zh-CN'
        ? clean(scripture?.zhCN) || clean(scripture?.zhTW)
        : clean(scripture?.zhTW) || clean(scripture?.zhCN)
}

function fromFixture(): FeaturedArtwork | null {
    const newest = (mockArtworks as Artwork[])
        .filter((a) => a.image_path && a.slug)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, NEWEST)
    const artwork = pick(newest)
    if (!artwork?.slug) return null
    return {
        slug: artwork.slug,
        reference: artwork.bible_reference,
        scriptureChinese: artwork.scripture_chinese,
        scriptureEnglish: artwork.scripture_english,
        imageUrl: artwork.image_path,
        ratio: artwork.image_width && artwork.image_height ? artwork.image_width / artwork.image_height : 1,
        focus: {x: 50, y: 50},
        glow: DEFAULT_GLOW,
    }
}

/**
 * One of the newest gallery artworks, chosen afresh on each request; the list
 * itself is cached. Falls back to the fixture, as the gallery does, when
 * Sanity is unconfigured, empty or failing.
 */
export async function getRandomArtwork(locale: AppLocale): Promise<FeaturedArtwork | null> {
    const client = getSanityClient()
    if (!client) return fromFixture()
    try {
        const candidates = await client.fetch<Candidate[]>(candidatesQuery, {}, cacheOptions([ARTWORK_CACHE_TAG]))
        const chosen = pick(candidates.filter((c) => c.slug && c.image))
        const imageUrl = chosen?.image ? artworkImageUrl(chosen.image, IMAGE_WIDTH) : null
        if (!chosen?.slug || !imageUrl) return fromFixture()
        return {
            slug: chosen.slug,
            reference: chosen.bibleReference ?? '',
            scriptureChinese: chineseFor(chosen.scripture, locale),
            // Never falls back to Chinese: it is shown with the ESV mark.
            scriptureEnglish: clean(chosen.scripture?.en),
            imageUrl,
            ratio:
                chosen.dimensions?.width && chosen.dimensions?.height
                    ? croppedRatio(chosen.dimensions.width, chosen.dimensions.height, chosen.image?.crop)
                    : 1,
            focus: imageFocus(chosen.image?.hotspot, chosen.image?.crop),
            glow: chosen.glow?.trim() || DEFAULT_GLOW,
        }
    } catch (error) {
        console.error('[404] Sanity query failed, showing a fixture artwork instead:', error)
        return fromFixture()
    }
}
