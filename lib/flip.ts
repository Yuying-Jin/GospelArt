/**
 * FLIP between two boxes showing the same picture. Returns the transform and
 * clip that make an element laid out at `to` look exactly like the one at
 * `from`: a uniform scale large enough to cover `from`, and a clip trimming
 * the rest, so a picture cropped by `object-fit: cover` grows out uncropped
 * instead of being squashed. Boxes of the same shape get no clip.
 */

type Box = {left: number; top: number; width: number; height: number}

export const UNCLIPPED = 'inset(0px 0px)'

export function flip(from: Box, to: Box): {transform: string; clipPath: string} {
    const scale = Math.max(from.width / to.width, from.height / to.height)
    const x = (from.left + from.width / 2) - (to.left + to.width / 2)
    const y = (from.top + from.height / 2) - (to.top + to.height / 2)
    // In the element's own pixels, before the scale applies.
    const insetX = Math.max(0, (to.width - from.width / scale) / 2)
    const insetY = Math.max(0, (to.height - from.height / scale) / 2)
    return {
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        clipPath: `inset(${insetY}px ${insetX}px)`,
    }
}
