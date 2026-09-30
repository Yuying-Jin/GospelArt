/**
 * Field length limits shared by the Studio and the submissions API, which
 * writes artwork drafts without going through the Studio's inputs. Mirrored
 * byte for byte in sanity/lib/fieldLimits.ts — neither project can import
 * from the other — and fieldLimits.test.ts fails on drift.
 *
 * A localized field has one limit for both Chinese scripts and one for
 * English. Lengths count UTF-16 units, like the browser's `maxlength`; rich
 * text counts the text of all its blocks together.
 */

/**
 * Default English characters per Chinese character for the same text, for
 * fields without a limit of their own. Measured on the 299 artworks with both
 * Chinese and English scripture: median 3.6, 90th percentile 4.45.
 */
export const EN_PER_ZH = 4

export type Limit = number | {zh: number; en: number}

export const perLanguage = (zh: number, en = zh * EN_PER_ZH): Limit => ({zh, en})

/** Content-design limits for what a contributor can write to an artwork. */
export const ARTWORK_LIMITS = {
    bibleReference: 30,
    scripture: perLanguage(200, 600),
    artworkSubject: 200,
    sectionBody: perLanguage(1000),
}

const LOCALES = [
    ['zhTW', 'Traditional Chinese'],
    ['zhCN', 'Simplified Chinese'],
    ['en', 'English'],
] as const

/** The limit for one language; `locale` is a localized field's key. */
export function limitFor(limit: Limit, locale?: unknown): number {
    if (typeof limit === 'number') return limit
    return locale === 'en' ? limit.en : limit.zh
}

type Block = {_type?: string; children?: {text?: string}[]}

export function richTextLength(blocks: unknown): number {
    if (!Array.isArray(blocks)) return 0
    return (blocks as Block[]).reduce(
        (sum, block) =>
            block?._type === 'block'
                ? sum + (block.children ?? []).reduce((s, span) => s + (span.text?.length ?? 0), 0)
                : sum,
        0,
    )
}

type Measured = {label?: string; locale?: string; length: number}

function measure(value: unknown): Measured[] {
    if (typeof value === 'string') return [{length: value.length}]
    if (Array.isArray(value)) return [{length: richTextLength(value)}]
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>
        return LOCALES.flatMap(([key, label]) =>
            measure(record[key]).map((measured) => ({...measured, label, locale: key})),
        )
    }
    return []
}

/** The first language over its limit, as a message, or null when all fit. */
export function lengthProblem(value: unknown, limit: Limit): string | null {
    const over = measure(value).find((m) => m.length > limitFor(limit, m.locale))
    if (!over) return null
    const max = limitFor(limit, over.locale)
    const where = over.label ? ` ${over.label} has ${over.length}.` : ` It has ${over.length}.`
    return `Keep it to ${max} characters.${where}`
}
