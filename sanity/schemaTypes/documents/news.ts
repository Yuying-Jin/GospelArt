import {defineField, defineType, type SanityDocument} from 'sanity'
import {perLanguage, withMaxLength} from '../../lib/maxLength'
import {isNewsSlugTaken, isUniqueNewsSlug} from '../../lib/isUniqueSlug'
import {buildNewsSlug, newsSlugProblem} from '../../lib/newsSlug'
import {autoSlugInput} from '../components/AutoSlugInput'

type LocaleValue = {zhTW?: string; zhCN?: string; en?: string}
type NewsDocument = SanityDocument & {category?: string; event?: {startDate?: string}}

/**
 * The code depends on these values (conditional fields, future filters), so
 * they are a fixed list rather than a taxonomy document. New artwork releases
 * are deliberately not a category — they live in the gallery and the newsletter.
 */
export const NEWS_CATEGORIES = [
    {title: 'Ministry Updates · 事工動態', value: 'ministry'},
    {title: 'Spiritual Reflections · 屬靈分享', value: 'reflection'},
    {title: 'Events & Exhibitions · 活動展覽', value: 'event'},
    {title: 'Seasonal Features · 節期專題', value: 'seasonal'},
]

const SEASONS = [
    {title: 'Lent · 大齋期', value: 'lent'},
    {title: 'Easter · 復活節', value: 'easter'},
    {title: 'Pentecost · 五旬節', value: 'pentecost'},
    {title: 'Thanksgiving · 感恩節', value: 'thanksgiving'},
    {title: 'Advent · 將臨期', value: 'advent'},
    {title: 'Christmas · 聖誕節', value: 'christmas'},
    {title: 'Other · 其他', value: 'other'},
]

const categoryOf = (document: unknown) => (document as NewsDocument | undefined)?.category

/** Required only while the field's category is selected, since it is hidden otherwise. */
function requiredFor(category: string, message: string) {
    return (value: unknown, context: {document?: unknown}) =>
        categoryOf(context.document) !== category || value ? true : message
}

const hasTitle = (value?: LocaleValue) => Boolean(value?.zhTW || value?.en)

const NewsSlugInput = autoSlugInput({
    build: buildNewsSlug,
    isTaken: isNewsSlugTaken,
    waitingHint: 'Fills in once the English title and the publication date are set.',
    frozenHint: 'Fixed since first published. Use the "Change page URL" action to change it; the old address keeps working.',
})

const today = () => new Date().toISOString().slice(0, 10)

export default defineType({
    name: 'news',
    title: 'News',
    type: 'document',
    groups: [
        {name: 'content', title: 'Content', default: true},
        {name: 'details', title: 'Category details'},
    ],
    fields: [
        // ---------------------------------------------------------------- content
        defineField({
            name: 'category',
            title: 'Category',
            type: 'string',
            group: ['content', 'details'],
            options: {list: NEWS_CATEGORIES, layout: 'radio'},
            validation: (Rule) => Rule.required(),
        }),
        withMaxLength(perLanguage(25, 80), defineField({
            name: 'title',
            title: 'Title',
            type: 'localeString',
            group: 'content',
            validation: (Rule) =>
                Rule.required().custom((value?: LocaleValue) =>
                    hasTitle(value) ? true : 'Give the item a title in Traditional Chinese or English.',
                ),
        })),
        defineField({
            name: 'slug',
            title: 'Page URL',
            type: 'slug',
            group: 'content',
            description: 'Generated from the English title and the publication date.',
            components: {input: NewsSlugInput},
            options: {isUnique: isUniqueNewsSlug},
            validation: (Rule) =>
                Rule.required()
                    .error('Add an English title and a publication date to generate the URL.')
                    .custom((value?: {current?: string}) =>
                        value?.current ? (newsSlugProblem(value.current) ?? true) : true,
                    ),
        }),
        defineField({
            name: 'previousSlugs',
            title: 'Previous page URLs',
            type: 'array',
            group: 'content',
            of: [{type: 'string'}],
            readOnly: true,
            description: 'Addresses this item used to live at. They still redirect here, so older shared links do not break.',
            hidden: ({document}) => !(document?.previousSlugs as string[] | undefined)?.length,
        }),
        defineField({
            name: 'publishedAt',
            title: 'Publication Date',
            type: 'date',
            group: 'content',
            options: {dateFormat: 'YYYY-MM-DD'},
            initialValue: today,
            description:
                'The date shown on the site and used for ordering. For an event, this is when the item is posted, not when the event took place.',
            validation: (Rule) => Rule.required(),
        }),
        withMaxLength(perLanguage(120, 300), defineField({
            name: 'summary',
            title: 'Summary',
            type: 'localeText',
            group: 'content',
            description: 'One or two sentences for the news list and link previews.',
        })),
        defineField({
            name: 'coverImage',
            title: 'Cover Image',
            type: 'image',
            group: 'content',
            options: {hotspot: true},
            description: 'Optional. Shown on the news list and at the top of the page.',
        }),
        withMaxLength(perLanguage(5000), defineField({
            name: 'body',
            title: 'Body',
            type: 'localeRichText',
            group: 'content',
            validation: (Rule) =>
                Rule.required().custom((value?: {zhTW?: unknown[]; en?: unknown[]}) =>
                    value?.zhTW?.length || value?.en?.length
                        ? true
                        : 'Write the body in Traditional Chinese or English.',
                ),
        })),
        defineField({
            name: 'relatedCollection',
            title: 'Related Collection',
            type: 'reference',
            group: 'content',
            to: [{type: 'collection'}],
            description:
                'Optional. Create the collection first, then pick it here. A collection made only for this item can have "Show in the gallery menu" turned off.',
        }),

        // ----------------------------------------------------------- event only
        defineField({
            name: 'event',
            title: 'Event details',
            type: 'object',
            group: 'details',
            description: 'Kept as a record of the ministry’s history.',
            hidden: ({document}) => categoryOf(document) !== 'event',
            fields: [
                withMaxLength(perLanguage(40), defineField({
                    name: 'name',
                    title: 'Event / Exhibition Name',
                    type: 'localeString',
                    validation: (Rule) =>
                        Rule.custom((value: LocaleValue | undefined, context) =>
                            categoryOf(context.document) !== 'event' || hasTitle(value)
                                ? true
                                : 'Give the event’s name in Traditional Chinese or English.',
                        ),
                })),
                defineField({
                    name: 'startDate',
                    title: 'Start Date',
                    type: 'date',
                    options: {dateFormat: 'YYYY-MM-DD'},
                    validation: (Rule) =>
                        Rule.custom(requiredFor('event', 'Give the date the event started.')),
                }),
                defineField({
                    name: 'endDate',
                    title: 'End Date',
                    type: 'date',
                    options: {dateFormat: 'YYYY-MM-DD'},
                    description: 'Leave empty for a one-day event.',
                    validation: (Rule) =>
                        Rule.custom((value: string | undefined, context) => {
                            const start = (context.document as NewsDocument | undefined)?.event
                                ?.startDate
                            return !value || !start || value >= start
                                ? true
                                : 'The end date is before the start date.'
                        }),
                }),
                withMaxLength(perLanguage(40), defineField({
                    name: 'location',
                    title: 'Location',
                    type: 'localeString',
                    description: 'Venue and city, e.g. "Grace Church, Boston".',
                })),
                withMaxLength(perLanguage(30), defineField({
                    name: 'organizer',
                    title: 'Organizer',
                    type: 'localeString',
                    description: 'Optional. Who hosted the event, if not the ministry itself.',
                })),
                withMaxLength(2048, defineField({
                    name: 'externalUrl',
                    title: 'External Link',
                    type: 'url',
                    description:
                        'Optional. The exhibition’s own page. Such pages often disappear after an event ends, so the details above should stand without it.',
                    validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
                })),
            ],
        }),

        // -------------------------------------------------------- seasonal only
        defineField({
            name: 'season',
            title: 'Season',
            type: 'string',
            group: 'details',
            options: {list: SEASONS},
            hidden: ({document}) => categoryOf(document) !== 'seasonal',
            validation: (Rule) =>
                Rule.custom(requiredFor('seasonal', 'Pick the season this feature is for.')),
        }),
    ],

    orderings: [
        {
            title: 'Newest first',
            name: 'publishedAtDesc',
            by: [
                {field: 'publishedAt', direction: 'desc'},
                {field: '_id', direction: 'asc'},
            ],
        },
    ],

    preview: {
        select: {
            title: 'title.zhTW',
            fallback: 'title.en',
            category: 'category',
            publishedAt: 'publishedAt',
            media: 'coverImage',
        },
        prepare({title, fallback, category, publishedAt, media}) {
            const label = NEWS_CATEGORIES.find((item) => item.value === category)?.title
            return {
                title: title || fallback || 'Untitled news',
                subtitle: [publishedAt, label?.split(' · ')[0]].filter(Boolean).join(' · '),
                media,
            }
        },
    },
})
