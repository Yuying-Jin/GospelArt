import {GALLERY_FILTER, GALLERY_ORDERS} from './queries'

/**
 * The only place a dynamic collection's rules become a query. Rules are never
 * materialised into the document, exactly as Selection Criteria is never
 * stored, so membership cannot drift from the rules that define it.
 *
 * Every filter is intersected with `GALLERY_FILTER`: a rule narrows the
 * gallery and can never widen it, so no rule can put an unfinished artwork on
 * the site.
 */

/** As projected by `collectionBySlugQuery` — theme references arrive as ids. */
export type CollectionRules = {
    bibleThemes?: (string | null)[] | null
    spiritualThemes?: (string | null)[] | null
    match?: 'any' | 'all' | null
    dateFrom?: string | null
    dateTo?: string | null
    sort?: keyof typeof GALLERY_ORDERS | null
    limit?: number | null
}

export type DynamicQuery = {
    filter: string
    order: string
    params: Record<string, string>
    /** How many artworks the collection stops at, if the rules say so. */
    limit?: number
}

/**
 * One clause per theme, each holding its id in its own bound parameter rather
 * than being interpolated into the query text. Checking `$id in themes[]._ref`
 * from the rule's side also means a duplicate tag on an artwork cannot make it
 * look like a match for two different themes.
 */
function themeClauses(rules: CollectionRules, params: Record<string, string>): string | null {
    const themes = [
        ...(rules.bibleThemes ?? []).map((id) => ({id, field: 'bibleThemes'})),
        ...(rules.spiritualThemes ?? []).map((id) => ({id, field: 'spiritualThemes'})),
    ].filter((theme): theme is {id: string; field: string} => Boolean(theme.id))

    if (!themes.length) return null

    const clauses = themes.map((theme, index) => {
        const name = `collectionTheme${index}`
        params[name] = theme.id
        return `$${name} in ${theme.field}[]._ref`
    })

    // Bible and Spiritual themes count together, so "all" means every tag the
    // collection names, whichever list it came from.
    return `(${clauses.join(rules.match === 'all' ? ' && ' : ' || ')})`
}

export function buildDynamicQuery(rules: CollectionRules | null | undefined): DynamicQuery {
    const params: Record<string, string> = {}
    const clauses: string[] = []

    if (rules) {
        const themes = themeClauses(rules, params)
        if (themes) clauses.push(themes)

        if (rules.dateFrom) {
            params.collectionDateFrom = rules.dateFrom
            clauses.push('date >= $collectionDateFrom')
        }

        if (rules.dateTo) {
            params.collectionDateTo = rules.dateTo
            clauses.push('date <= $collectionDateTo')
        }
    }

    // An empty rule set is rejected in the Studio, so reaching this with no
    // clauses means the whole gallery — the same set `/gallery` already shows.
    const filter = clauses.length
        ? `${GALLERY_FILTER} && ${clauses.join(' && ')}`
        : GALLERY_FILTER

    const limit = typeof rules?.limit === 'number' && rules.limit > 0 ? rules.limit : undefined

    return {
        filter,
        order: GALLERY_ORDERS[rules?.sort ?? 'dateDesc'] ?? GALLERY_ORDERS.dateDesc,
        params,
        limit,
    }
}
