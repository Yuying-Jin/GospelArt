import imageUrlBuilder from '@sanity/image-url'
import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import {dataset, projectId} from './client'

/**
 * Card images render ~330px wide, so 700 covers a 2x display. The modal and
 * the fullscreen viewer keep the full-size URL: fullscreen reaches ~1170
 * physical pixels, and it must already be cached when the zoom animation
 * starts or it grows as an empty box.
 */
export const CARD_IMAGE_WIDTH = 700

/**
 * Cards and the modal render plain `<img>` tags rather than `next/image`, so
 * resizing has to happen in the URL. `auto('format')` still serves WebP/AVIF
 * where the browser supports it.
 */
export function artworkImageUrl(source: SanityImageSource, width = 1400): string | null {
    if (!projectId || !dataset || !source) return null

    return imageUrlBuilder({projectId, dataset})
        .image(source)
        .width(width)
        .fit('max')
        .auto('format')
        .url()
}
