/**
 * The cover a news item shows when it has no image: overlapping translucent
 * pentagons over a two-tone gradient, like stained glass. Seeded by the slug,
 * so an item always gets the same picture and neighbours differ.
 */

/** The four palettes, as the base hue of each. */
const HUES = [38, 150, 205, 268]

const WIDTH = 640
const HEIGHT = 480
const SHAPES = 26

function hash(text: string): number {
    let h = 2166136261
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

const round = (n: number) => Math.round(n * 10) / 10

/** An SVG document; `newsPlaceholderUrl` wraps it for an `<img>`. */
export function newsPlaceholderSvg(seedText: string): string {
    const seed0 = hash(seedText)
    const hue = HUES[seed0 % HUES.length]
    const glow = `hsl(${hue} 90% 80%)`
    let seed = seed0 % 233280
    const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280

    const shapes: string[] = []
    for (let i = 0; i < SHAPES; i++) {
        const x = random() * WIDTH
        const y = random() * HEIGHT
        const r = 40 + random() * 120
        const points: string[] = []
        for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2 + random()
            points.push(`${round(x + Math.cos(a) * r)},${round(y + Math.sin(a) * r)}`)
        }
        const shapeHue = Math.round((hue + random() * 80 - 40 + 360) % 360)
        const light = Math.round(30 + random() * 35)
        shapes.push(`<polygon points="${points.join(' ')}" fill="hsl(${shapeHue} 60% ${light}%)" fill-opacity="0.55"/>`)
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice">`
        + '<defs>'
        + `<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 45% 18%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 50% 30%)"/></linearGradient>`
        // The light from above takes the palette's own hue, so it does not warm every picture towards yellow.
        + `<radialGradient id="g" cx="320" cy="150" r="320" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${glow}" stop-opacity="0.35"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>`
        + '</defs>'
        + `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#b)"/>`
        + `<g stroke="rgb(10,10,15)" stroke-opacity="0.8" stroke-width="4" stroke-linejoin="round">${shapes.join('')}</g>`
        + `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>`
        + '</svg>'
}

export function newsPlaceholderUrl(seedText: string): string {
    return `data:image/svg+xml,${encodeURIComponent(newsPlaceholderSvg(seedText))}`
}
