/**
 * The news categories, in display order. The Studio's category list, help
 * text and views, and the site's filters, labels and category pages all read
 * this, so adding a category starts here. `id` is the stored value and
 * `segment` the /news/<segment> page; neither may change once in use.
 *
 * Byte-identical in `lib/` and `sanity/lib/`, since neither project can import
 * the other; `lib/newsCategories.test.ts` compares them.
 */
export const NEWS_CATEGORY_CONFIG = [
    {
        id: 'ministry',
        segment: 'updates',
        label: {en: 'Ministry Updates', 'zh-TW': '事工動態', 'zh-CN': '事工动态'},
        guide: 'Noteworthy developments, progress and milestones in the ministry that the public should know about. Not for routine administration or minor updates.',
    },
    {
        id: 'reflection',
        segment: 'reflections',
        label: {en: 'Spiritual Reflections', 'zh-TW': '屬靈分享', 'zh-CN': '属灵分享'},
        guide: 'Sharing centred on Scripture: Bible reflections, spiritual insights, devotional thoughts, by ministry workers or invited contributors. A brief introduction to the writer is welcome; the focus stays on Scripture, not on personal life.',
    },
    {
        id: 'event',
        segment: 'events',
        label: {en: 'Events & Exhibitions', 'zh-TW': '活動展覽', 'zh-CN': '活动展览'},
        guide: 'A written record of, or reflection on, a meaningful event or exhibition, past or ongoing, kept as part of the ministry’s history and testimony. Not for registration or scheduling.',
    },
    {
        id: 'seasonal',
        segment: 'seasonal',
        label: {en: 'Seasonal Features', 'zh-TW': '節期專題', 'zh-CN': '节期专题'},
        guide: 'Themed writing for a Christian season or holiday, such as Lent, Easter, Pentecost, Thanksgiving, Advent or Christmas, rather than ordinary ministry news.',
    },
] as const

export type NewsCategory = (typeof NEWS_CATEGORY_CONFIG)[number]['id']

export type NewsCategoryConfig = (typeof NEWS_CATEGORY_CONFIG)[number]

export type NewsCategoryLocale = keyof NewsCategoryConfig['label']

export const NEWS_CATEGORY_IDS: readonly NewsCategory[] = NEWS_CATEGORY_CONFIG.map((category) => category.id)

export function newsCategory(id: string): NewsCategoryConfig | null {
    return NEWS_CATEGORY_CONFIG.find((category) => category.id === id) ?? null
}

export function categoryForSegment(segment: string): NewsCategoryConfig | null {
    return NEWS_CATEGORY_CONFIG.find((category) => category.segment === segment) ?? null
}
