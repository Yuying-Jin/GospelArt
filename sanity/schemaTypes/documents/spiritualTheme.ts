import {defineField, defineType} from 'sanity'

/**
 * Spiritual Themes — the devotional / experiential vocabulary
 * ("Life", "Hope", "Trust"). Separate from Bible Themes and from
 * `bibleReference`; the three are unrelated concepts.
 */
export default defineType({
    name: 'spiritualTheme',
    title: 'Spiritual Theme',
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
