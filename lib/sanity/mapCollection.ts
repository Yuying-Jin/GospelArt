import type {Collection, NavCollection} from '@/types/collection'
import {resolveLocale, type AppLocale, type SanityLocaleValue} from './mapArtwork'

/**
 * Sanity's collection shape turned into the app's. The counterpart of
 * `mapArtwork.ts`, and like it the only place the two shapes meet.
 */

export type SanityCollectionMember = {
    slug?: string | null
    previousSlugs?: string[] | null
    eligible?: boolean | null
} | null

export type SanityCollection = {
    slug?: string | null
    title?: SanityLocaleValue
    description?: SanityLocaleValue
    mode?: string | null
    rules?: unknown
    members?: SanityCollectionMember[] | null
}

export type SanityNavCollection = {
    slug?: string | null
    title?: SanityLocaleValue
    navOrder?: number | null
}

export function mapCollection(doc: SanityCollection, locale: AppLocale): Collection {
    const title = resolveLocale(doc.title ?? null, locale)

    return {
        slug: doc.slug ?? '',
        // A collection with no name in any language would be an invisible menu
        // entry, so fall back to its URL rather than to nothing.
        title: title || (doc.slug ?? ''),
        description: resolveLocale(doc.description ?? null, locale),
        mode: doc.mode === 'dynamic' ? 'dynamic' : 'curated',
    }
}

/**
 * Menu order: `navOrder` ascending, then by name. Sorted here because the
 * field is optional — collections without one follow the rest instead of
 * landing wherever GROQ happens to put a null.
 */
export function mapNavCollections(
    docs: SanityNavCollection[] | null | undefined,
    locale: AppLocale,
): NavCollection[] {
    return (docs ?? [])
        .map((doc) => ({
            slug: doc?.slug ?? '',
            title: resolveLocale(doc?.title ?? null, locale) || (doc?.slug ?? ''),
            navOrder: typeof doc?.navOrder === 'number' ? doc.navOrder : Number.POSITIVE_INFINITY,
        }))
        .filter((collection) => collection.slug)
        .sort((a, b) => a.navOrder - b.navOrder || a.title.localeCompare(b.title, locale))
        .map(({slug, title}) => ({slug, title}))
}
