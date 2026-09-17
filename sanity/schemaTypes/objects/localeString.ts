import {defineField, defineType} from 'sanity'

/**
 * Field-level localization: one field holds all three versions.
 * zhTW is the original and is authored first; zhCN and en are translations.
 */

export default defineType({
    name: 'localeString',
    title: 'Localized text',
    type: 'object',
    options: {collapsible: true, collapsed: false},
    fields: [
        defineField({
            name: 'zhTW',
            title: '繁體中文 · Traditional Chinese (primary)',
            type: 'string',
        }),
        defineField({
            name: 'zhCN',
            title: '简体中文 · Simplified Chinese',
            type: 'string',
        }),
        defineField({
            name: 'en',
            title: 'English',
            type: 'string',
        }),
    ],
})
