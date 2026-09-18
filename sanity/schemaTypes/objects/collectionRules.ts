import {defineField, defineType} from 'sanity'

/**
 * The rule set behind a dynamic collection. Never materialised: the site
 * translates these fields into a GROQ filter at query time
 * (`lib/sanity/collectionFilter.ts`), the same way Selection Criteria is
 * derived rather than stored, so membership cannot drift from the rules.
 *
 * Whatever the rules say, the result is always intersected with the gallery's
 * own requirements — a rule cannot surface an artwork that is not ready.
 */

export type CollectionRulesValue = {
    bibleThemes?: {_ref?: string}[]
    spiritualThemes?: {_ref?: string}[]
    match?: 'any' | 'all'
    dateFrom?: string
    dateTo?: string
    sort?: 'dateDesc' | 'dateAsc' | 'reference'
    limit?: number
}

/** Themes across both lists count together, so one tag each still means two. */
function themeCount(rules?: CollectionRulesValue): number {
    return (rules?.bibleThemes?.length ?? 0) + (rules?.spiritualThemes?.length ?? 0)
}

export function hasAnyRule(rules?: CollectionRulesValue): boolean {
    return themeCount(rules) > 0 || Boolean(rules?.dateFrom) || Boolean(rules?.dateTo)
}

export default defineType({
    name: 'collectionRules',
    title: 'Rules',
    type: 'object',
    options: {collapsible: false},
    fields: [
        defineField({
            name: 'bibleThemes',
            title: 'Bible Themes',
            type: 'array',
            of: [{type: 'reference', to: [{type: 'bibleTheme'}]}],
            validation: (Rule) => Rule.unique(),
        }),
        defineField({
            name: 'spiritualThemes',
            title: 'Spiritual Themes',
            type: 'array',
            of: [{type: 'reference', to: [{type: 'spiritualTheme'}]}],
            validation: (Rule) => Rule.unique(),
        }),
        defineField({
            name: 'match',
            title: 'When several themes are selected',
            type: 'string',
            initialValue: 'any',
            description:
                'Bible and Spiritual themes count together: "any" includes an artwork carrying at least one of them, "all" requires every one.',
            options: {
                list: [
                    {title: 'Any — include artworks matching at least one theme', value: 'any'},
                    {title: 'All — include only artworks matching every theme', value: 'all'},
                ],
                layout: 'radio',
            },
            // A single theme makes the two settings identical.
            hidden: ({parent}) => themeCount(parent as CollectionRulesValue) < 2,
        }),
        defineField({
            name: 'dateFrom',
            title: 'Painted on or after',
            type: 'date',
            options: {dateFormat: 'YYYY-MM-DD'},
        }),
        defineField({
            name: 'dateTo',
            title: 'Painted on or before',
            type: 'date',
            options: {dateFormat: 'YYYY-MM-DD'},
            validation: (Rule) =>
                Rule.custom((value, context) => {
                    const from = (context.parent as CollectionRulesValue | undefined)?.dateFrom
                    if (value && from && value < from) {
                        return 'The end of the range comes before its start.'
                    }
                    return true
                }),
        }),
        defineField({
            name: 'sort',
            title: 'Order',
            type: 'string',
            initialValue: 'dateDesc',
            options: {
                list: [
                    {title: 'Newest first', value: 'dateDesc'},
                    {title: 'Oldest first', value: 'dateAsc'},
                    {title: 'Bible reference', value: 'reference'},
                ],
            },
        }),
        defineField({
            name: 'limit',
            title: 'Maximum number of artworks',
            type: 'number',
            description:
                'Optional. Leave empty to include every match; set it for a collection like "the twelve most recent".',
            validation: (Rule) => Rule.integer().positive(),
        }),
    ],
})
