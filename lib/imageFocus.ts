/**
 * Where a Sanity image's hotspot falls within the picture its URL serves.
 * The hotspot is stored against the whole image, but a crop set in the Studio
 * trims what is served, so the point is re-expressed inside the crop.
 */

/** Fractions trimmed from each side, as Sanity stores them. */
export type ImageCrop = {top: number; bottom: number; left: number; right: number}

/** As Sanity stores it: the centre, 0–1 across the whole image. */
export type ImageHotspot = {x?: number; y?: number}

const NO_CROP: ImageCrop = {top: 0, bottom: 0, left: 0, right: 0}

/** One axis, as a percentage rounded to a tenth; the centre when unset. */
function within(point: number | undefined, start: number, end: number): number {
    const span = 1 - start - end
    if (typeof point !== 'number' || span <= 0) return 50
    return Math.round(Math.min(1, Math.max(0, (point - start) / span)) * 1000) / 10
}

/** CSS `object-position` percentages for the served picture. */
export function imageFocus(hotspot?: ImageHotspot | null, crop?: ImageCrop | null): {x: number; y: number} {
    const c = crop ?? NO_CROP
    return {x: within(hotspot?.x, c.left, c.right), y: within(hotspot?.y, c.top, c.bottom)}
}

/** The served picture's proportions after the crop: width over height. */
export function croppedRatio(width: number, height: number, crop?: ImageCrop | null): number {
    const c = crop ?? NO_CROP
    return (width * (1 - c.left - c.right)) / (height * (1 - c.top - c.bottom))
}
