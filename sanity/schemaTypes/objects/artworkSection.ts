import {defineField, defineType} from 'sanity'

/**
 * One expandable section in the artwork detail modal.
 *
 * The heading is a *reference* to an `artworkSectionType`, not free text: the
 * same four headings ("Background / Inspiration", "Biblical Interpretation", …)
 * repeat on every artwork in all three languages. Referencing them means a
 * collaborator picks a heading and writes only the body, instead of re-typing
 * and re-translating the same titles on all 302 artworks.
 *
 * The body is inline because it is genuinely unique to this artwork.
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
        defineField({
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
        }),
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
