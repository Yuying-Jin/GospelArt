import {defineField, defineType} from 'sanity'
import {isUniqueArtworkSlug} from '../../lib/isUniqueSlug'
import {artworkSlugify, artworkSlugSource} from '../../lib/slugField'
import {computeSelectionCriteria} from '../../lib/selectionCriteria'
import {SelectionCriteriaInput} from '../components/SelectionCriteriaInput'

const SCORE_OPTIONS = {
    repetition: [
        {title: 'H — 5 or more', value: 'H'},
        {title: 'M — 3 to 4', value: 'M'},
        {title: 'L — 1 to 2', value: 'L'},
    ],
    quality: [
        {title: 'H — Impactful', value: 'H'},
        {title: 'M — Symbolic', value: 'M'},
        {title: 'L — Mediocre', value: 'L'},
    ],
    creativity: [
        {title: 'H — Independent', value: 'H'},
        {title: 'M — Referencing', value: 'M'},
        {title: 'L — Imitative', value: 'L'},
    ],
}

export default defineType({
    name: 'artwork',
    title: 'Artwork',
    type: 'document',
    groups: [
        {name: 'content', title: 'Content', default: true},
        {name: 'curation', title: 'Curation'},
    ],
    fields: [
        // ---------------------------------------------------------------- content
        defineField({
            name: 'image',
            title: 'Artwork Image',
            type: 'image',
            group: 'content',
            options: {hotspot: true},
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'bibleReference',
            title: 'Bible Reference',
            type: 'string',
            group: 'content',
            description:
                'The citation exactly as the ministry writes it, e.g. "John 11:25" or "2 Corinthians 4:5-6".',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'scripture',
            title: 'Scripture Text',
            type: 'localeText',
            group: 'content',
            description:
                'The verse itself. Traditional Chinese is the primary text. The site always shows Chinese and English together — the visitor language only decides which Chinese script is used.',
            validation: (Rule) =>
                Rule.required().custom((value?: {zhTW?: string}) =>
                    value?.zhTW ? true : 'Traditional Chinese scripture is required.',
                ),
        }),
        defineField({
            name: 'date',
            title: 'Date of Artwork',
            type: 'date',
            group: 'content',
            options: {dateFormat: 'YYYY-MM-DD'},
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'artworkSubject',
            title: 'Artwork Subject',
            type: 'string',
            group: 'content',
            description:
                'What the painting depicts, e.g. "Willow trees at the river bank". This is the source workbook "Artwork theme" column — free-text description, not one of the theme taxonomies below.',
        }),
        defineField({
            name: 'bibleThemes',
            title: 'Bible Themes',
            type: 'array',
            group: 'content',
            of: [{type: 'reference', to: [{type: 'bibleTheme'}]}],
            description: 'Thematic vocabulary. Not the same thing as the Bible reference above.',
        }),
        defineField({
            name: 'spiritualThemes',
            title: 'Spiritual Themes',
            type: 'array',
            group: 'content',
            of: [{type: 'reference', to: [{type: 'spiritualTheme'}]}],
        }),
        defineField({
            name: 'sections',
            title: 'Detail Sections',
            type: 'array',
            group: 'content',
            of: [{type: 'artworkSection'}],
            description: 'Expandable sections in the artwork detail view, shown in this order.',
        }),

        // -------------------------------------------------------------------- URL
        defineField({
            name: 'slug',
            title: 'Gallery URL',
            type: 'slug',
            group: 'content',
            description:
                'The ?artwork= value in shared links. Set once, then locked — use the "Change gallery URL" action to change it so the old address keeps working.',
            options: {
                source: artworkSlugSource,
                slugify: artworkSlugify,
                isUnique: isUniqueArtworkSlug,
            },
            // Editable only while empty, i.e. on a brand-new artwork. Once a slug
            // exists it can only be changed through the document action, which
            // archives the old value into `previousSlugs`.
            readOnly: ({document}) =>
                Boolean((document?.slug as {current?: string} | undefined)?.current),
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'previousSlugs',
            title: 'Previous gallery URLs',
            type: 'array',
            group: 'content',
            of: [{type: 'string'}],
            readOnly: true,
            description:
                'Addresses this artwork used to live at. They still resolve, so older shared links do not break.',
            hidden: ({document}) => {
                const previous = document?.previousSlugs as string[] | undefined
                return !previous || previous.length === 0
            },
        }),

        // --------------------------------------------------------------- curation
        defineField({
            name: 'galleryVisibility',
            title: 'Gallery Visibility',
            type: 'string',
            group: 'curation',
            initialValue: 'auto',
            options: {
                list: [
                    {title: 'Auto — follow the selection criteria', value: 'auto'},
                    {title: 'Always show — include even if the criteria fail', value: 'always'},
                    {title: 'Never show — withhold even if the criteria pass', value: 'never'},
                ],
                layout: 'radio',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'visibilityNote',
            title: 'Why was visibility overridden?',
            type: 'text',
            group: 'curation',
            rows: 2,
            hidden: ({document}) =>
                !document?.galleryVisibility || document.galleryVisibility === 'auto',
            validation: (Rule) =>
                Rule.custom((value, context) => {
                    const visibility = (
                        context.document as {galleryVisibility?: string} | undefined
                    )?.galleryVisibility
                    if (visibility && visibility !== 'auto' && !value) {
                        return 'Record why this artwork overrides the selection criteria.'
                    }
                    return true
                }),
        }),
        defineField({
            name: 'repetition',
            title: 'Repetition',
            type: 'string',
            group: 'curation',
            options: {list: SCORE_OPTIONS.repetition},
        }),
        defineField({
            name: 'quality',
            title: 'Quality',
            type: 'string',
            group: 'curation',
            options: {list: SCORE_OPTIONS.quality},
        }),
        defineField({
            name: 'creativity',
            title: 'Creativity',
            type: 'string',
            group: 'curation',
            options: {list: SCORE_OPTIONS.creativity},
        }),
        defineField({
            // Stores nothing on purpose — see SelectionCriteriaInput. The value is
            // derived from the three scores here and in GROQ, so it cannot drift.
            name: 'selectionCriteria',
            title: 'Selection Criteria (calculated)',
            type: 'string',
            group: 'curation',
            readOnly: true,
            components: {input: SelectionCriteriaInput},
        }),
        defineField({
            name: 'optimizedSelection',
            title: 'Optimized Selection',
            type: 'string',
            group: 'curation',
            description:
                'The narrower editorial pick. Always a subset of the artworks that meet the selection criteria.',
            options: {
                list: [
                    {title: 'Y — Selected', value: 'Y'},
                    {title: 'N — Unselected', value: 'N'},
                ],
            },
        }),
        defineField({
            name: 'overallSelection',
            title: 'Overall Selection',
            type: 'string',
            group: 'curation',
            options: {
                list: [
                    {title: 'S1 — 1st Tier, Likely', value: 'S1'},
                    {title: 'S2 — 2nd Tier, Unsatisfactory', value: 'S2'},
                    {title: 'S3 — 3rd Tier, Poor', value: 'S3'},
                    {title: 'N — Unselected', value: 'N'},
                ],
            },
        }),
        defineField({
            name: 'scriptureFellowship',
            title: 'Scripture Fellowship',
            type: 'text',
            group: 'curation',
            rows: 2,
        }),
        defineField({
            name: 'notes',
            title: 'Video Clip or Other Notes',
            type: 'text',
            group: 'curation',
            rows: 2,
        }),

        // ----------------------------------------------------------------- source
        defineField({
            // Import bookkeeping, deliberately not part of the editing
            // experience: Dropbox was only ever the migration source. The value
            // stays on the document so an artwork can be traced back to the row
            // it came from, but `hidden` keeps it out of the form entirely.
            //
            // Note the importer does not read this back — document identity is
            // recomputed from the workbook each run (see documentId() in
            // scripts/import-artworks.mjs), so nothing breaks if it is absent.
            name: 'dropboxPath',
            title: 'Import source (internal)',
            type: 'url',
            readOnly: true,
            hidden: true,
        }),
    ],

    orderings: [
        {
            title: 'Newest first',
            name: 'dateDesc',
            by: [
                {field: 'date', direction: 'desc'},
                {field: '_id', direction: 'asc'},
            ],
        },
        {
            title: 'Oldest first',
            name: 'dateAsc',
            by: [
                {field: 'date', direction: 'asc'},
                {field: '_id', direction: 'asc'},
            ],
        },
        {
            title: 'Bible reference',
            name: 'reference',
            by: [{field: 'bibleReference', direction: 'asc'}],
        },
    ],

    preview: {
        select: {
            title: 'bibleReference',
            date: 'date',
            media: 'image',
            repetition: 'repetition',
            quality: 'quality',
            creativity: 'creativity',
            galleryVisibility: 'galleryVisibility',
            scriptureZh: 'scripture.zhTW',
        },
        prepare({
            title,
            date,
            media,
            repetition,
            quality,
            creativity,
            galleryVisibility,
            scriptureZh,
        }) {
            const criteria = computeSelectionCriteria({repetition, quality, creativity})
            let shown = criteria === 'Y' ? 'in gallery' : 'not selected'
            if (galleryVisibility === 'always') shown = 'in gallery (forced)'
            if (galleryVisibility === 'never') shown = 'withheld'

            return {
                title: title || scriptureZh || 'Untitled artwork',
                subtitle: [date, shown].filter(Boolean).join(' · '),
                media,
            }
        },
    },
})
