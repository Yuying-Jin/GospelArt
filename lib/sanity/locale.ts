/* Pure, so `node --test` can load it without the image helpers mapArtwork.ts pulls in. */

export type AppLocale = 'en' | 'zh-CN' | 'zh-TW'

/**
 * Sanity field names must be alphanumeric, so locales are stored as `en` /
 * `zhCN` / `zhTW`. This module is the only place that knows about that;
 * `mapCollection.ts` reads its localized fields through `resolveLocale` below
 * rather than naming them again.
 */
export type SanityLocaleValue = {
    en?: string | null
    zhCN?: string | null
    zhTW?: string | null
} | null

export function clean(value?: string | null): string {
    return typeof value === 'string' ? value.trim() : ''
}

/**
 * Traditional Chinese is the authored language and the last resort for the
 * others, since most artworks are not translated yet and the modal renders a
 * missing locale as nothing. Render-time only: nothing is written back.
 */
export const FALLBACK_ORDER: Record<AppLocale, ('zhTW' | 'zhCN' | 'en')[]> = {
    'zh-TW': ['zhTW', 'zhCN', 'en'],
    'zh-CN': ['zhCN', 'zhTW', 'en'],
    en: ['en', 'zhTW', 'zhCN'],
}

export function resolveLocale(value: SanityLocaleValue, locale: AppLocale): string {
    for (const key of FALLBACK_ORDER[locale]) {
        const candidate = clean(value?.[key])
        if (candidate) return candidate
    }
    return ''
}
