import {defineField, defineType} from 'sanity'

/**
 * Bible Themes — a thematic vocabulary the ministry controls.
 *
 * Deliberately NOT a Bible book / canon index, and not derived from
 * `bibleReference`. Which book a verse sits in and what the artwork is
 * thematically about are separate questions; a book taxonomy would be its own
 * document type if it is ever wanted.
 *
 * A document type rather than free-text strings so that the tag renders in the
 * visitor's language and so the same theme cannot drift into several spellings
 * across hundreds of hand-typed entries.
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
