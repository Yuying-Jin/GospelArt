import {defineField, defineType} from 'sanity'
import {ARTWORK_LIMITS} from '../../lib/fieldLimits'
import {withMaxLength} from '../../lib/maxLength'
import {buildArtworkSlug} from '../../lib/artworkSlug'
import {isArtworkSlugTaken, isUniqueArtworkSlug} from '../../lib/isUniqueSlug'
import {normalizeReference} from '../../lib/scripture/normalize'
import {stripVerseParts} from '../../lib/scripture/reference'
import {validateReference} from '../../lib/scripture/validate'
import {computeSelectionCriteria} from '../../lib/selectionCriteria'
import {autoSlugInput} from '../components/AutoSlugInput'
import {BibleReferenceInput} from '../components/BibleReferenceInput'
import {ScriptureInput} from '../components/ScriptureInput'
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

const ArtworkSlugInput = autoSlugInput({
    build: (doc) => {
        const {date, bibleReference} = doc as typeof doc & {date?: string; bibleReference?: string}
        return buildArtworkSlug(date ?? '', bibleReference ?? '')
    },
    isTaken: isArtworkSlugTaken,
    waitingHint: 'Fills in once the date and the Bible reference are set.',
    frozenHint: 'Fixed since first published. Use the "Change gallery URL" action to change it; the old address keeps working.',
})

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
        withMaxLength(ARTWORK_LIMITS.bibleReference, defineField({
            name: 'bibleReference',
            title: 'Bible Reference',
            type: 'string',
            group: 'content',
            description:
                'Use "Pick a passage" to fill it in, e.g. "John 11:25", "2 Corinthians 4:5-6" or "Psalms 23". Type it by hand only for a list of verses or half a verse ("1 John 4:16b").',
            components: {input: BibleReferenceInput},
            // A warning, not an error: the 305 imported references predate the
            // picker, and a handful are titles rather than citations.
            validation: (Rule) => [
                Rule.required(),
                Rule.custom((value?: string) => {
                    if (!value) return true
                    const normalized = normalizeReference(value)
                    const result = validateReference(stripVerseParts(normalized))
                    if (!result.valid) return result.reason
                    return normalized === value || `Not in the standard format — should be "${normalized}".`
                }).warning(),
            ],
        })),
        withMaxLength(ARTWORK_LIMITS.scripture, defineField({
            name: 'scripture',
            title: 'Scripture Text',
            type: 'localeText',
            group: 'content',
            description:
                'The Bible verse associated with the artwork. Traditional Chinese is the primary Chinese text; Simplified Chinese and English versions are also provided.',
            // On the field, not on `localeText` — four other fields share that
            // type and have no reference to fetch from.
            components: {input: ScriptureInput},
            validation: (Rule) =>
                Rule.required().custom((value?: {zhTW?: string}) =>
                    value?.zhTW ? true : 'Traditional Chinese scripture is required.',
                ),
        })),
        defineField({
            name: 'date',
            title: 'Date of Artwork',
            type: 'date',
            group: 'content',
            options: {dateFormat: 'YYYY-MM-DD'},
            validation: (Rule) => Rule.required(),
        }),
        withMaxLength(ARTWORK_LIMITS.artworkSubject, defineField({
            name: 'artworkSubject',
            title: 'Artwork Subject',
            type: 'string',
            group: 'content',
            description:
                'What the artwork depicts, e.g. "Willow trees along a riverbank."',
        })),
        defineField({
            name: 'bibleThemes',
            title: 'Bible Themes',
            type: 'array',
            group: 'content',
            of: [{type: 'reference', to: [{type: 'bibleTheme'}]}],
            description: 'Bible-related keywords directly connected to the artwork, e.g. "Psalms," "Gospels," or "Revelation."',
        }),
        defineField({
            name: 'spiritualThemes',
            title: 'Spiritual Themes',
            type: 'array',
            group: 'content',
            of: [{type: 'reference', to: [{type: 'spiritualTheme'}]}],
            description: 'Spiritual qualities or concepts expressed in the artwork, e.g. "Love," "Holiness," or "Mercy."',
        }),
        defineField({
            name: 'sections',
            title: 'Detail Sections',
            type: 'array',
            group: 'content',
            of: [{type: 'artworkSection'}],
            description: 'Expandable sections in the artwork detail view for additional content about the artwork, such as Background / Inspiration, Devotional Notes, or Reflection.',
        }),

        // -------------------------------------------------------------------- URL
        defineField({
            name: 'slug',
            title: 'Gallery URL',
            type: 'slug',
            group: 'content',
            description:
                'The ?artwork= value in shared links, generated from the date and the Bible reference.',
            // Follows its sources until first published; after that only the
            // document action changes it, archiving the old value.
            components: {input: ArtworkSlugInput},
            options: {isUnique: isUniqueArtworkSlug},
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
        withMaxLength(500, defineField({
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
        })),
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
            // Stores nothing: derived from the three scores here and in GROQ,
            // so it cannot drift. See SelectionCriteriaInput.
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
        withMaxLength(2000, defineField({
            name: 'scriptureFellowship',
            title: 'Scripture Fellowship',
            type: 'text',
            group: 'curation',
            rows: 2,
        })),
        withMaxLength(1000, defineField({
            name: 'notes',
            title: 'Video Clip or Other Notes',
            type: 'text',
            group: 'curation',
            rows: 2,
        })),

        // ----------------------------------------------------------------- source
        defineField({
            // Import bookkeeping, hidden from the form: it traces an artwork
            // back to its workbook row. The importer never reads it back —
            // document identity is recomputed each run — so it may be absent.
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
