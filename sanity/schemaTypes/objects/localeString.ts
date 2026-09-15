import {defineField, defineType} from 'sanity'

/**
 * Field-level localization: one field holding all three language versions
 * side by side.
 *
 * Language ownership is explicit and must stay that way:
 * zhTW — the primary, original content. Authored first.
 * zhCN — a Simplified Chinese translation of the Traditional original.
 * en   — an English version.
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
