/**
 * Downloads and decodes an image, resolving once it can be painted without a
 * blank frame. One request per URL however often it is asked for; it never
 * rejects, since a picture that fails to load is simply shown as it is.
 */
const pending = new Map<string, Promise<void>>()

export function preloadImage(url: string): Promise<void> {
    const known = pending.get(url)
    if (known) return known

    const img = new Image()
    img.decoding = 'async'
    img.src = url
    const ready = img.decode().catch(() => undefined)
    pending.set(url, ready)
    return ready
}

/** Resolves after `ms`, for racing a preload against a deadline. */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
