import {defineField, defineType} from 'sanity'
import {ARTWORK_LIMITS} from '../../lib/fieldLimits'
import {withMaxLength} from '../../lib/maxLength'

/**
 * One expandable section in the artwork detail modal.
 *
 * The heading references an `artworkSectionType` rather than being free text:
 * the same four headings repeat on every artwork in three languages, so a
 * collaborator picks one and writes only the body, which is inline because it
 * is unique to the artwork.
 */
export default defineType({
    name: 'artworkSection',
    title: 'Section',
    type: 'object',
    fields: [
        defineField({
            name: 'sectionType',
            title: 'Section',
            type: 'reference',
            to: [{type: 'artworkSectionType'}],
            validation: (Rule) => Rule.required(),
        }),
        withMaxLength(ARTWORK_LIMITS.sectionBody, defineField({
            name: 'body',
            title: 'Body',
            type: 'localeText',
            validation: (Rule) =>
                Rule.custom((value?: {zhTW?: string; zhCN?: string; en?: string}) => {
                    if (!value?.zhTW && !value?.zhCN && !value?.en) {
                        return 'Write the body in at least one language, or remove the section.'
                    }
                    return true
                }),
        })),
    ],
    preview: {
        select: {
            title: 'sectionType.title.zhTW',
            fallbackTitle: 'sectionType.title.en',
            subtitle: 'body.zhTW',
            fallbackSubtitle: 'body.en',
        },
        prepare({title, fallbackTitle, subtitle, fallbackSubtitle}) {
            const text = subtitle || fallbackSubtitle || ''
            return {
                title: title || fallbackTitle || 'Section',
                subtitle: text.length > 80 ? `${text.slice(0, 80)}…` : text,
            }
        },
    },
})
