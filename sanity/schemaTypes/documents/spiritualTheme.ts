import {defineField, defineType} from 'sanity'
import {isSingleTheme} from '../../lib/singleTheme'
import {perLanguage, withMaxLength} from '../../lib/maxLength'

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
        withMaxLength(perLanguage(15), defineField({
            name: 'title',
            title: 'Name',
            type: 'localeString',
            validation: (Rule) =>
                Rule.required().custom((value?: {zhTW?: string; en?: string}) =>
                    value?.zhTW || value?.en
                        ? true
                        : 'Give the theme a name in Traditional Chinese or English.',
                ).custom(isSingleTheme),
            description: 'One theme per entry, e.g. "Grace". Several themes are separate entries.',
        })),
        withMaxLength(perLanguage(150), defineField({
            name: 'description',
            title: 'Description',
            type: 'localeText',
            description: 'Optional. Internal note, or copy for a future themes page.',
        })),
    ],
    preview: {
        select: {title: 'title.zhTW', fallback: 'title.en', subtitle: 'title.en'},
        prepare: ({title, fallback, subtitle}) => ({
            title: title || fallback || 'Untitled theme',
            subtitle: title && subtitle && title !== subtitle ? subtitle : undefined,
        }),
    },
})
