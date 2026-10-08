import {defineArrayMember, defineField, defineType} from 'sanity'
import {GALLERY_ELIGIBLE_GROQ} from '../../lib/galleryEligibility'
import {perLanguage, withMaxLength} from '../../lib/maxLength'
import {BibleReferenceInput} from '../components/BibleReferenceInput'
import {ScriptureInput} from '../components/ScriptureInput'

/** The one home page document; `sanity.config.ts` keeps a second from being made. */
export const HOME_PAGE_ID = 'homePage'

/**
 * What the home page says and which artwork opens it. The latest artworks and
 * news below follow on their own; only the hero, the statement and the
 * closing verse are chosen here.
 */
export default defineType({
    name: 'homePage',
    title: 'Home page',
    type: 'document',
    groups: [
        {name: 'hero', title: 'Opening', default: true},
        {name: 'creed', title: 'Who we are'},
        {name: 'closing', title: 'Closing verse'},
    ],
    fields: [
        // ------------------------------------------------------------------- hero
        defineField({
            name: 'heroArtwork',
            title: 'Opening artwork',
            type: 'reference',
            to: [{type: 'artwork'}],
            group: 'hero',
            description:
                'The artwork that fills the first screen, with its scripture. Only artworks live in the gallery can be picked. What part of the picture shows is the hotspot on the artwork’s own image. Left empty, the newest artwork is used.',
            options: {filter: GALLERY_ELIGIBLE_GROQ, disableNew: true},
        }),
        defineField({
            name: 'heroTone',
            title: 'Opening artwork’s background',
            type: 'string',
            group: 'hero',
            description:
                'Light for a painting on white paper, so the page does not dim it grey. Dark for everything else.',
            options: {
                list: [
                    {title: 'Dark', value: 'dark'},
                    {title: 'Light (white paper)', value: 'light'},
                ],
                layout: 'radio',
                direction: 'horizontal',
            },
            initialValue: 'dark',
        }),
        defineField({
            name: 'heroZoom',
            title: 'Opening artwork’s zoom',
            type: 'number',
            group: 'hero',
            description:
                'Enlarges the picture on the home page only, towards the hotspot on the artwork’s image, e.g. to push calligraphy at one edge out of view. 1 shows it as it is. The gallery is never affected.',
            options: {list: [1, 1.1, 1.2, 1.3, 1.4, 1.5], layout: 'radio', direction: 'horizontal'},
            initialValue: 1,
            validation: (Rule) => Rule.min(1).max(1.5),
        }),
        withMaxLength(perLanguage(30), defineField({
            name: 'heroIntro',
            title: 'Introduction',
            type: 'localeText',
            group: 'hero',
            description: 'One line under the scripture saying who we are. Left empty, nothing shows.',
        })),
        withMaxLength(perLanguage(8), defineField({
            name: 'heroButton',
            title: 'Button text',
            type: 'localeString',
            group: 'hero',
            description: 'The button into the gallery. Left empty, it reads “Enter the Gallery”.',
        })),

        // ------------------------------------------------------------------ creed
        withMaxLength(perLanguage(40), defineField({
            name: 'creedLine',
            title: 'Statement',
            type: 'localeText',
            group: 'creed',
            description: 'One sentence, set large under the opening. Left empty, with no items either, the whole section is hidden.',
        })),
        defineField({
            name: 'creedItems',
            title: 'Items',
            type: 'array',
            group: 'creed',
            description: 'Up to three, e.g. our purpose, our art, our ministry. Each a heading and one sentence.',
            validation: (Rule) => Rule.max(3),
            of: [
                defineArrayMember({
                    name: 'creedItem',
                    title: 'Item',
                    type: 'object',
                    fields: [
                        withMaxLength(perLanguage(10), defineField({
                            name: 'title',
                            title: 'Heading',
                            type: 'localeString',
                            validation: (Rule) => Rule.required(),
                        })),
                        withMaxLength(perLanguage(60), defineField({
                            name: 'body',
                            title: 'Sentence',
                            type: 'localeText',
                            validation: (Rule) => Rule.required(),
                        })),
                    ],
                    preview: {select: {title: 'title.zhTW', subtitle: 'title.en'}},
                }),
            ],
        }),

        // ---------------------------------------------------------------- closing
        // The reference first: the verse is fetched from it, as on an artwork.
        defineField({
            name: 'closingReference',
            title: 'Closing verse reference',
            type: 'string',
            group: 'closing',
            description:
                'Use "Pick a passage", then fetch the verse below. In English, as on artworks, e.g. "Numbers 6:24-26"; the site shows it in the reader’s language.',
            components: {input: BibleReferenceInput},
        }),
        withMaxLength(perLanguage(200, 600), defineField({
            name: 'closingScripture',
            title: 'Closing verse',
            type: 'localeText',
            group: 'closing',
            description: 'The verse the page ends on, in all three languages. Fetch fills it from 和合本 and the ESV. Left empty, the section is hidden.',
            components: {input: ScriptureInput},
            options: {referenceField: 'closingReference'},
        })),
        defineField({
            name: 'closingEsv',
            title: 'The English is from the ESV',
            type: 'boolean',
            group: 'closing',
            description:
                'Crossway asks for the ESV mark, linked to esv.org, wherever ESV text is shown. Untick it for a verse from the KJV or another version, and the mark is not shown.',
            initialValue: true,
        }),
    ],
    preview: {prepare: () => ({title: 'Home page'})},
})
