import {defineField, defineType} from 'sanity'

/**
 * A thematic vocabulary the ministry controls — not a book/canon index and not
 * derived from `bibleReference`; a book taxonomy would be its own type.
 *
 * A document type rather than free text so tags render in the visitor's
 * language and the same theme cannot drift into several spellings.
 */
export default defineType({
    name: 'bibleTheme',
    title: 'Bible Theme',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Name',
            type: 'localeString',
            validation: (Rule) =>
                Rule.required().custom((value?: {zhTW?: string; en?: string}) =>
                    value?.zhTW || value?.en
                        ? true
                        : 'Give the theme a name in Traditional Chinese or English.',
                ),
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'localeText',
            description: 'Optional. Internal note, or copy for a future themes page.',
        }),
    ],
    preview: {
        select: {title: 'title.zhTW', fallback: 'title.en', subtitle: 'title.en'},
        prepare: ({title, fallback, subtitle}) => ({
            title: title || fallback || 'Untitled theme',
            subtitle: title && subtitle && title !== subtitle ? subtitle : undefined,
        }),
    },
})
