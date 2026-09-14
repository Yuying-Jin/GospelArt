import imageUrlBuilder from '@sanity/image-url'
import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import {dataset, projectId} from './client'

/**
 * Builds a sized, format-optimised URL for a Sanity image asset.
 *
 * `Card.tsx` and `DetailsModal.tsx` render plain `<img>` tags rather than
 * `next/image`, so the transformation has to happen in the URL. `auto('format')`
 * still serves WebP/AVIF where the browser supports it.
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
