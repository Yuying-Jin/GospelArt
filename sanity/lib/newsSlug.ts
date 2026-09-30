import type {SanityDocument} from 'sanity'
import {NEWS_CATEGORY_CONFIG} from './newsCategories'

/**
 * Each category's page is /news/<segment>. Article pages share that
 * namespace: a generated slug ends in its date so cannot collide, but one
 * changed by hand could, so the segments are refused as article slugs.
 */
const RESERVED = new Set<string>(NEWS_CATEGORY_CONFIG.map((category) => category.segment))

export function newsSlugify(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/** `<english-title>-<publication-date>`, e.g. `christmas-exhibition-2026-12-20`. */
export function buildNewsSlug(doc: SanityDocument): string {
    const {title, publishedAt} = doc as SanityDocument & {title?: {en?: string}; publishedAt?: string}
    const words = newsSlugify(title?.en ?? '').slice(0, 60).replace(/-+$/, '')
    return words && publishedAt ? `${words}-${publishedAt}` : ''
}

/** A format problem with a news slug, or null when it is usable. */
export function newsSlugProblem(slug: string): string | null {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'Use lowercase English words separated by hyphens.'
    if (RESERVED.has(slug)) return `"${slug}" is the address of a news category page.`
    return null
}
