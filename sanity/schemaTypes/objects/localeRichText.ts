import {defineArrayMember, defineField, defineType} from 'sanity'
import {LOCALE_OBJECT_OPTIONS, withMaxLength} from '../../lib/maxLength'
import {
    BoldIcon,
    HighlightDecorator,
    HighlightIcon,
    ItalicIcon,
    StrikeIcon,
    UnderlineIcon,
} from '../components/richTextMarks'
import {SiteSurfaceInput} from '../components/SiteSurfaceInput'

/**
 * Portable Text counterpart of `localeString`, for long-form bodies. No text
 * colours or embeds, so the site controls how it looks.
 */
const blockContent = [
    defineArrayMember({
        type: 'block',
        styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading', value: 'h2'},
            {title: 'Subheading', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
        ],
        lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
        ],
        marks: {
            decorators: [
                {title: 'Bold', value: 'strong', icon: BoldIcon},
                {title: 'Italic', value: 'em', icon: ItalicIcon},
                {title: 'Underline', value: 'underline', icon: UnderlineIcon},
                {title: 'Strikethrough', value: 'strike-through', icon: StrikeIcon},
                {
                    title: 'Highlight',
                    value: 'highlight',
                    icon: HighlightIcon,
                    component: HighlightDecorator,
                },
            ],
            annotations: [
                {
                    name: 'link',
                    title: 'Link',
                    type: 'object',
                    fields: [
                        withMaxLength(2048, defineField({
                            name: 'href',
                            title: 'URL',
                            type: 'url',
                            validation: (Rule) =>
                                Rule.required().uri({scheme: ['http', 'https', 'mailto']}),
                        })),
                    ],
                },
            ],
        },
    }),
    defineArrayMember({
        type: 'image',
        options: {hotspot: true},
        fields: [
            withMaxLength(200, defineField({
                // Plain string: the body is already one language.
                name: 'caption',
                title: 'Caption',
                type: 'string',
            })),
        ],
    }),
]

export default defineType({
    name: 'localeRichText',
    title: 'Localized rich text',
    type: 'object',
    options: LOCALE_OBJECT_OPTIONS,
    fields: [
        defineField({
            name: 'zhTW',
            title: '繁體中文 · Traditional Chinese (primary)',
            type: 'array',
            of: blockContent,
            components: {input: SiteSurfaceInput},
        }),
        defineField({
            name: 'zhCN',
            title: '简体中文 · Simplified Chinese',
            type: 'array',
            of: blockContent,
            components: {input: SiteSurfaceInput},
        }),
        defineField({
            name: 'en',
            title: 'English',
            type: 'array',
            of: blockContent,
            components: {input: SiteSurfaceInput},
        }),
    ],
})
