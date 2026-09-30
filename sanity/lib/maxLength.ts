import {lengthProblem, type Limit} from './fieldLimits'

/**
 * Maximum lengths for free-text fields. A limit is set once per field with
 * `withMaxLength`, which does two things: `options.maxLength` is what
 * `MaxLengthInput` enforces while typing, and the validation rule catches what
 * arrives any other way (imports, older content). The limits and how they are
 * counted live in `fieldLimits.ts`, shared with the submissions API.
 */
export {perLanguage, limitFor, richTextLength, type Limit} from './fieldLimits'

/** The localized object types' own options, shared with `withMaxLength`. */
export const LOCALE_OBJECT_OPTIONS = {collapsible: true, collapsed: false}
const LOCALE_TYPES = ['localeString', 'localeText', 'localeRichText']

type Validator = (value: unknown) => true | string
type RuleLike = {custom: (fn: Validator) => unknown}
type FieldLike = {name: string; type?: string; options?: object; validation?: unknown}

/**
 * Adds `max` to a field definition, keeping its own options and validation.
 * A field's `options` replace its type's rather than merging, so a localized
 * field re-adds the type's own.
 */
export function withMaxLength<T extends FieldLike>(max: Limit, field: T): T {
    const previous = field.validation as ((rule: RuleLike) => unknown) | undefined
    const inherited = LOCALE_TYPES.includes(field.type ?? '') ? LOCALE_OBJECT_OPTIONS : {}
    const tooLong: Validator = (value) => lengthProblem(value, max) ?? true
    return {
        ...field,
        options: {...inherited, ...field.options, maxLength: max},
        validation: (rule: RuleLike) => {
            const base = previous ? previous(rule) : []
            return [...(Array.isArray(base) ? base : [base]), rule.custom(tooLong)]
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
