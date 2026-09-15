import {defineField, defineType} from 'sanity'

/** Multi-line counterpart of `localeString` — see that file for the rationale. */
export default defineType({
    name: 'localeText',
    title: 'Localized text (multi-line)',
    type: 'object',
    options: {collapsible: true, collapsed: false},
    fields: [
        defineField({
            name: 'zhTW',
            title: '繁體中文 · Traditional Chinese (primary)',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'zhCN',
            title: '简体中文 · Simplified Chinese',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'en',
            title: 'English',
            type: 'text',
            rows: 4,
        }),
    ],
})
