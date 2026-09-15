/**
 * Scripture lookup is used *only* by the Studio's "Fetch Scripture" action, at
 * editing time. The public website never calls it: it reads scripture out of
 * Sanity like any other field. No provider is therefore a runtime dependency of
 * the site, and none may become one.
 *
 * Each provider is isolated behind this interface so it can be swapped for
 * another source without touching the route, the action, or the data model.
 */

/** The scripture fields on an artwork. Mirrors the `localeText` object's keys. */
export type ScriptureField = 'zhTW' | 'zhCN' | 'en'

export type ProviderResult = {
    /** Normalised, ready-to-store text, keyed by the field it belongs to. */
    texts: Partial<Record<ScriptureField, string>>
    /** Per-field explanation for anything this provider could not supply. */
    errors: Partial<Record<ScriptureField, string>>
    /** The reference as the provider understood it, e.g. "Psalm 121:2". */
    canonical?: string
    verseCount?: number
    /**
     * Set when the provider cannot serve *any* request right now — a spent
     * quota, a rejected key — as opposed to this one reference not being found.
     *
     * The distinction is what lets a bulk caller stop instead of repeating the
     * same failure for every remaining reference and reporting a quota problem
     * as if it were bad data.
     */
    unavailable?: string
}

export interface ScriptureProvider {
    /** Stable identifier used in logs and error messages. */
    readonly id: string
    /** Human-readable translation name, shown to editors. */
    readonly label: string
    /** Which fields this provider is responsible for. */
    readonly fields: readonly ScriptureField[]
    /**
     * False when the provider cannot be used at all in this environment — a
     * missing API key, say. Distinct from a request-time failure.
     */
    readonly available: boolean
    /** Reason the provider is unavailable, when `available` is false. */
    readonly unavailableReason?: string

    fetchPassage(reference: string, signal: AbortSignal): Promise<ProviderResult>
}

export type LookupResult = {
    /** The reference as asked for, verbatim — verse-part suffix and all. */
    reference: string
    /**
     * What the providers were actually asked for. Differs from `reference` only
     * when a verse-part suffix was stripped, which is the signal the Studio
     * warns on.
     */
    lookupReference: string
    canonical: string
    /**
     * Why the reference was rejected before any provider was asked. Set only
     * when validation failed, in which case `texts` is empty by construction.
     */
    invalid?: string
    /**
     * Providers that reported they cannot serve any request. Present only when
     * at least one did, so a bulk caller can stop early — an empty or absent
     * list means every provider was reachable, whatever it answered.
     */
    unavailableProviders?: {id: string; reason: string}[]
    verseCount: number
    texts: Partial<Record<ScriptureField, string>>
    errors: Partial<Record<ScriptureField, string>>
}
