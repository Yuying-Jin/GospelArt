import {defineField, defineType, type SanityDocument, type ValidationContext} from 'sanity'
import {GALLERY_ELIGIBLE_GROQ} from '../../lib/galleryEligibility'
import {hasAnyRule, type CollectionRulesValue} from '../objects/collectionRules'

const API_VERSION = '2025-02-19'

type LocaleValue = {zhTW?: string; zhCN?: string; en?: string}
type ArtworkRef = {_ref?: string}

/**
 * A named grouping of gallery artworks, and a level of gallery navigation on
 * the site. Nothing in the app knows any particular collection: the routes and
 * the menus are built from whatever documents exist here.
 *
 * Two modes, deliberately not merged. A *curated* collection is a hand-picked,
 * hand-ordered list — the order is the array order, because that judgement
 * cannot be expressed as a rule. A *dynamic* collection is a rule set
 * evaluated at query time, so new artwork joins it without anyone editing the
 * collection.
 *
 * Either way a collection only ever *narrows* the gallery: an artwork that is
 * not ready to be public does not become public by being listed here.
 */

/** English first: the slug is a URL segment, and the titles are mostly Chinese. */
function collectionSlugSource(doc: SanityDocument): string {
    const title = (doc as SanityDocument & {title?: LocaleValue}).title
    return title?.en ?? title?.zhTW ?? ''
}

function collectionSlugify(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)
}

/**
 * How many of the picked artworks the gallery would actually show. Counting the
 * eligible ones rather than the failures also catches artworks that exist only
 * as a draft, which no published-only count would notice.
 */
async function countEligible(refs: ArtworkRef[], context: ValidationContext): Promise<number> {
    const ids = refs.map((ref) => ref?._ref).filter(Boolean)
    if (!ids.length) return 0

    const client = context.getClient({apiVersion: API_VERSION})
    return client.fetch<number>(
        `count(*[_type == "artwork" && _id in $ids && (${GALLERY_ELIGIBLE_GROQ})])`,
        {ids},
    )
}

export default defineType({
    name: 'collection',
    title: 'Collection',
    type: 'document',
    groups: [
        {name: 'content', title: 'Content', default: true},
        {name: 'members', title: 'Artworks'},
        {name: 'navigation', title: 'Navigation'},
    ],
    fields: [
        // ---------------------------------------------------------------- content
        defineField({
            name: 'title',
            title: 'Name',
            type: 'localeString',
            group: 'content',
            description:
                'Shown in the gallery menu, in the collection switcher, and as the page heading.',
            validation: (Rule) =>
                Rule.required().custom((value?: LocaleValue) =>
                    value?.zhTW || value?.en
                        ? true
                        : 'Give the collection a name in Traditional Chinese or English.',
                ),
        }),
        defineField({
            name: 'slug',
            title: 'Collection URL',
            type: 'slug',
            group: 'content',
            description:
                'The address segment, e.g. "hope" for /gallery/hope. Lowercase English words separated by hyphens.',
            options: {source: collectionSlugSource, slugify: collectionSlugify},
            validation: (Rule) =>
                Rule.required().custom((value?: {current?: string}) => {
                    const current = value?.current
                    if (!current) return 'Give the collection a URL.'
                    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(current)
                        ? true
                        : 'Use lowercase English words separated by hyphens.'
                }),
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'localeText',
            group: 'content',
            description: 'Optional. Shown under the heading on the collection page.',
        }),
        defineField({
            name: 'coverImage',
            title: 'Cover Image',
            type: 'image',
            group: 'content',
            options: {hotspot: true},
            description:
                'Optional. Not shown on the site yet — kept for a future collections overview.',
        }),

        // ---------------------------------------------------------------- members
        defineField({
            name: 'mode',
            title: 'Collection type',
            type: 'string',
            group: 'members',
            initialValue: 'curated',
            // The stored values stay technical; only these labels are read by
            // collaborators, for whom "curated" and "dynamic" are jargon.
            options: {
                list: [
                    {
                        title: 'Manual selection — Select and order artworks manually',
                        value: 'curated',
                    },
                    {
                        title: 'Automatic rules — Artworks are selected automatically according to rules',
                        value: 'dynamic',
                    },
                ],
                layout: 'radio',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'artworks',
            title: 'Artworks',
            type: 'array',
            group: 'members',
            of: [{type: 'reference', to: [{type: 'artwork'}]}],
            description: 'Drag to reorder — this order is the order visitors see.',
            hidden: ({document}) => document?.mode !== 'curated',
            validation: (Rule) => [
                Rule.unique().custom((value, context) => {
                    const mode = (context.document as {mode?: string} | undefined)?.mode
                    if (mode !== 'curated') return true
                    return (value as ArtworkRef[] | undefined)?.length
                        ? true
                        : 'Add at least one artwork, or change the collection type to Automatic rules.'
                }),
                // A warning, not an error: the pick is legitimate, it just has
                // to wait for the artwork itself to be finished.
                Rule.custom(async (value, context) => {
                    const refs = (value as ArtworkRef[] | undefined) ?? []
                    if (!refs.length) return true

                    const eligible = await countEligible(refs, context)
                    const waiting = refs.length - eligible
                    if (waiting <= 0) return true

                    return `${waiting} of ${refs.length} picked artworks are not ready to be shown yet (missing scripture or image, unpublished, or withheld), and stay out of the collection until they are.`
                }).warning(),
            ],
        }),
        defineField({
            name: 'rules',
            title: 'Rules',
            type: 'collectionRules',
            group: 'members',
            hidden: ({document}) => document?.mode !== 'dynamic',
            validation: (Rule) =>
                Rule.custom((value, context) => {
                    const mode = (context.document as {mode?: string} | undefined)?.mode
                    if (mode !== 'dynamic') return true
                    return hasAnyRule(value as CollectionRulesValue | undefined)
                        ? true
                        : 'Set at least one theme or date bound — an empty rule set would just repeat the whole gallery.'
                }),
        }),

        // ------------------------------------------------------------- navigation
        defineField({
            name: 'showInNav',
            title: 'Show in the gallery menu',
            type: 'boolean',
            group: 'navigation',
            initialValue: true,
            description:
                'Off keeps the collection reachable by its URL but leaves it out of the menu and the switcher.',
        }),
        defineField({
            name: 'navOrder',
            title: 'Menu position',
            type: 'number',
            group: 'navigation',
            description: 'Lower numbers come first. Collections without one follow, by name.',
        }),
    ],

    orderings: [
        {
            title: 'Menu order',
            name: 'navOrder',
            by: [
                {field: 'navOrder', direction: 'asc'},
                {field: 'title.zhTW', direction: 'asc'},
            ],
        },
        {
            title: 'Name',
            name: 'title',
            by: [{field: 'title.zhTW', direction: 'asc'}],
        },
    ],

    preview: {
        select: {
            title: 'title.zhTW',
            fallback: 'title.en',
            mode: 'mode',
            showInNav: 'showInNav',
            media: 'coverImage',
            artworks: 'artworks',
        },
        prepare({title, fallback, mode, showInNav, media, artworks}) {
            const picked = (artworks as ArtworkRef[] | undefined)?.length ?? 0
            const shape =
                mode === 'dynamic' ? 'automatic rules' : `manual · ${picked} picked`

            return {
                title: title || fallback || 'Untitled collection',
                subtitle: [shape, showInNav === false ? 'not in menu' : null]
                    .filter(Boolean)
                    .join(' · '),
                media,
            }
        },
    },
})
