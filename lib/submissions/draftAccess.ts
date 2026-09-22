import {randomUUID} from 'node:crypto'

/**
 * The single point at which a creator's write is authorized. The submissions
 * API writes with an Editor token — the lowest write role the plan offers, and it can
 * publish — so nothing below this stands between a submission and the live
 * site. Every refusal here is the whole boundary.
 */

/** Only what the decision needs, so it can be tested without reaching Sanity. */
export type DraftLoader = (draftId: string) => Promise<{createdBy?: string | null} | null>

/**
 * One error for every refusal. `reason` is for the server log; `message` is
 * what the client sees, and it stays the same whether the draft is missing or
 * belongs to someone else, so the API cannot be used to probe for ids.
 */
export class DraftAccessError extends Error {
    readonly reason: string

    constructor(reason: string) {
        super('Not found')
        this.name = 'DraftAccessError'
        this.reason = reason
    }
}

/**
 * Server-issued ids only, so a creator never chooses which document they are
 * about to write. The suffix excludes dots deliberately: `drafts.drafts.x` is
 * a legal Sanity id, and nothing here should accept one.
 */
const DRAFT_ID = /^drafts\.[A-Za-z0-9_-]+$/

export function newDraftId(): string {
    return `drafts.${randomUUID()}`
}

/**
 * What a creator may send. An allowlist, because the dangerous fields are the
 * ones nobody thinks to list: `slug` is locked to the Change gallery URL
 * action, `galleryVisibility` overrides the selection criteria outright, and
 * the curation ratings are what the criteria are derived from — a creator
 * rating their own work would walk it into the gallery the moment a reviewer
 * published it.
 */
export const CREATOR_EDITABLE_FIELDS = [
    'image',
    'bibleReference',
    'scripture',
    'date',
    'artworkSubject',
    'bibleThemes',
    'spiritualThemes',
    'sections',
] as const

const EDITABLE = new Set<string>(CREATOR_EDITABLE_FIELDS)

/** Resolves to the draft id the caller may touch, or throws. Reads and writes
 * share the rule, so both go through here. Never trusts `documentId`. */
export async function authorizeDraftAccess(
    userId: string,
    documentId: string,
    load: DraftLoader,
): Promise<string> {
    if (!userId) throw new DraftAccessError('no session user')
    // Checked before loading, so a malformed id cannot be used to probe.
    if (!DRAFT_ID.test(documentId)) throw new DraftAccessError('not a draft id')

    const doc = await load(documentId)
    if (!doc) throw new DraftAccessError('draft does not exist')
    // The 302 migrated artworks carry no createdBy and must never match.
    if (!doc.createdBy) throw new DraftAccessError('draft has no owner')
    if (doc.createdBy !== userId) throw new DraftAccessError('draft belongs to another user')

    return documentId
}

/** Throws on any field outside the allowlist, rather than dropping it quietly. */
export function assertCreatorPatch(patch: Record<string, unknown>): void {
    for (const key of Object.keys(patch)) {
        if (!EDITABLE.has(key)) throw new DraftAccessError(`field not editable: ${key}`)
    }
}
