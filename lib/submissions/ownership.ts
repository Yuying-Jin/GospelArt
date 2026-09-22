import type {DraftLoader} from './draftAccess.ts'

/**
 * Who submitted which draft.
 *
 * Deliberately not a field on the artwork. The dataset is public and the
 * Studio can inspect any document, so an identity kept there is readable by
 * the reviewer and by anyone else who asks — and review is meant to be blind.
 * Sanity holds the work; this holds who it came from.
 *
 * It will be a table in the app's own database, which is not chosen yet, so
 * every function here throws. The routes answer 401 before reaching them
 * (see `session.ts`), so nothing is reachable in the meantime; wiring the
 * database up means implementing this file and nothing else.
 */
const PENDING = 'The submissions ownership store is not wired up yet'

/** Shaped for `authorizeDraftAccess`, which never knew where this came from. */
export const loadDraftOwner: DraftLoader = async () => {
    throw new Error(PENDING)
}

/** The drafts a contributor may see, newest first. */
export async function listOwnedDraftIds(_userId: string): Promise<string[]> {
    throw new Error(PENDING)
}

/**
 * Record ownership *before* creating the draft. The reverse order can leave a
 * draft nobody owns, which no route can then reach or clean up; this order can
 * only leave a row pointing at nothing, which is harmless and collectable.
 */
export async function claimDraft(_draftId: string, _userId: string): Promise<void> {
    throw new Error(PENDING)
}
