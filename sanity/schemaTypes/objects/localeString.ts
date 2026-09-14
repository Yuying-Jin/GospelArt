import {defineField, defineType} from 'sanity'

/**
 * Field-level localization: one field holding all three locales side by side.
 *
 * Language ownership is explicit and must stay that way:
 *   zhTW — the primary, original content. Authored first.
 *   zhCN — a Simplified *translation* of the Traditional original.
 *   en   — an English translation.
 *
 * Traditional content is never written into `zhCN` just because `zhCN` is
 * empty. The site may fall back at render time so a card is never blank, but
 * nothing is ever persisted into the wrong field.
 *
 * Deliberately NOT document-level internationalization. Scripture is displayed
 * bilingually (Chinese and English together, never one or the other), so the
 * locales have to be readable from a single document; and one artwork is one
 * image, one date and one set of curation scores, which would be triplicated by
 * a document-per-locale split.
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
            description: 'The original text. Write this first.',
        }),
        defineField({
            name: 'zhCN',
            title: '简体中文 · Simplified Chinese',
            type: 'string',
            description:
                'Simplified translation of the Traditional original above. Leave empty and the site shows the Traditional text instead.',
        }),
        defineField({
            name: 'en',
            title: 'English',
            type: 'string',
        }),
    ],
})
