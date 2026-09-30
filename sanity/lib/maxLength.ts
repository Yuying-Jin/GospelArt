/**
 * Maximum lengths for free-text fields. A limit is set once per field with
 * `withMaxLength`, which does two things: `options.maxLength` is what
 * `MaxLengthInput` enforces while typing, and the validation rule catches what
 * arrives any other way (imports, the API, older content).
 *
 * A localized field takes `perLanguage(zh, en)`: both Chinese scripts share
 * one limit and English has its own. Where a limit is a display decision
 * (News cards, Scripture beside an artwork) both are given explicitly;
 * otherwise English defaults to `EN_PER_ZH` times the Chinese. Lengths are counted in UTF-16 units like the
 * browser's own `maxlength`; rich text counts the text of all its blocks.
 */

/**
 * English characters per Chinese character for the same text. Measured on the
 * 299 artworks with both Chinese and English scripture: median 3.6, 90th
 * percentile 4.45.
 */
export const EN_PER_ZH = 4

export type Limit = number | {zh: number; en: number}

export const perLanguage = (zh: number, en = zh * EN_PER_ZH): Limit => ({zh, en})

const LOCALES = [
    ['zhTW', 'Traditional Chinese'],
    ['zhCN', 'Simplified Chinese'],
    ['en', 'English'],
] as const

/** The limit for one input: `locale` is the last segment of its path. */
export function limitFor(limit: Limit, locale?: unknown): number {
    if (typeof limit === 'number') return limit
    return locale === 'en' ? limit.en : limit.zh
}

type Measured = {label?: string; locale?: string; length: number}
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

function tooLong(limit: Limit) {
    return (value: unknown) => {
        const over = measure(value).find((m) => m.length > limitFor(limit, m.locale))
        if (!over) return true
        const max = limitFor(limit, over.locale)
        const where = over.label ? ` ${over.label} has ${over.length}.` : ` It has ${over.length}.`
        return `Keep it to ${max} characters.${where}`
    }
}

/** The localized object types' own options, shared with `withMaxLength`. */
export const LOCALE_OBJECT_OPTIONS = {collapsible: true, collapsed: false}
const LOCALE_TYPES = ['localeString', 'localeText', 'localeRichText']

type RuleLike = {custom: (fn: ReturnType<typeof tooLong>) => unknown}
type FieldLike = {name: string; type?: string; options?: object; validation?: unknown}

/**
 * Adds `max` to a field definition, keeping its own options and validation.
 * A field's `options` replace its type's rather than merging, so a localized
 * field re-adds the type's own.
 */
export function withMaxLength<T extends FieldLike>(max: Limit, field: T): T {
    const previous = field.validation as ((rule: RuleLike) => unknown) | undefined
    const inherited = LOCALE_TYPES.includes(field.type ?? '') ? LOCALE_OBJECT_OPTIONS : {}
    return {
        ...field,
        options: {...inherited, ...field.options, maxLength: max},
        validation: (rule: RuleLike) => {
            const base = previous ? previous(rule) : []
            return [...(Array.isArray(base) ? base : [base]), rule.custom(tooLong(max))]
        },
    }
}

export function maxLengthOf(options: unknown): Limit | undefined {
    const max = (options as {maxLength?: unknown} | undefined)?.maxLength
    if (typeof max === 'number') return max
    const pair = max as {zh?: unknown; en?: unknown} | undefined
    return typeof pair?.zh === 'number' && typeof pair.en === 'number'
        ? {zh: pair.zh, en: pair.en}
        : undefined
}
