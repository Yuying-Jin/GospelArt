import {defineField, defineType} from 'sanity'

/**
 * A reusable heading for artwork detail sections — "Background / Inspiration",
 * "Biblical Interpretation", "Devotional Reflection", and so on.
 *
 * `key` becomes the section's `id` on the site, where it drives the accordion's
 * open/closed state and the `aria-controls` / `aria-labelledby` pairing in
 * `components/gallery/DetailsModal.tsx`. It must stay stable once in use.
 */
export default defineType({
    name: 'artworkSectionType',
    title: 'Section Type',
    type: 'document',
    fields: [
        defineField({
            name: 'key',
            title: 'Key',
            type: 'string',
            description:
                'Lowercase identifier used in the page markup, e.g. "background". Do not change once artworks use this section.',
            validation: (Rule) =>
                Rule.required()
                    .lowercase()
                    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
                        name: 'lowercase words separated by hyphens',
                    }),
        }),
        defineField({
            name: 'title',
            title: 'Heading',
            type: 'localeString',
            description: 'Shown as the collapsible heading in the artwork detail view.',
            validation: (Rule) =>
                Rule.required().custom((value?: {zhTW?: string; en?: string}) =>
                    value?.zhTW || value?.en
                        ? true
                        : 'Give the heading a title in Traditional Chinese or English.',
                ),
        }),
    ],
    preview: {
        select: {title: 'title.zhTW', fallback: 'title.en', subtitle: 'key'},
        prepare: ({title, fallback, subtitle}) => ({
            title: title || fallback || 'Untitled section type',
            subtitle: subtitle,
        }),
    },
})
