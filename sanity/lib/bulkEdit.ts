/*
 * The decisions behind Bulk edit (components/BulkEditPane.tsx), kept free of
 * Sanity's client and of React so they can be tested on their own: which
 * documents an action touches, and what Undo writes back. The pane does the
 * fetching and committing.
 */

export type Kind = 'artwork' | 'news'

/** One document as the list shows it, its published and draft versions merged. */
export type Row = {
    id: string
    label: string
    date?: string
    thumb?: string
    hasPublished: boolean
    hasDraft: boolean
    hidden: boolean
    live: boolean
    /** Artworks: whether it would be on the site with the hide taken off. */
    liveIfUnhidden: boolean
    /** Artworks: a URL, an image and scripture in all three languages. */
    complete: boolean
}

/** One stored version, as the pane's query returns it. */
export type FetchedVersion = {
    _id: string
    label?: string | null
    date?: string | null
    thumb?: string | null
    hidden?: boolean | null
    live?: boolean | null
    liveIfUnhidden?: boolean | null
    complete?: boolean | null
}

const DRAFT_PREFIX = 'drafts.'

export const publishedIdOf = (id: string) => (id.startsWith(DRAFT_PREFIX) ? id.slice(DRAFT_PREFIX.length) : id)
export const draftIdOf = (id: string) => `${DRAFT_PREFIX}${publishedIdOf(id)}`

/**
 * One row per document, newest first. The label and date are the draft's,
 * the editor's latest; whether it is on the site comes from the published
 * version, since that is what visitors see.
 */
export function mergeRows(versions: FetchedVersion[]): Row[] {
    const rows = new Map<string, Row>()
    for (const doc of versions) {
        const id = publishedIdOf(doc._id)
        const row = rows.get(id) ?? {
            id, label: '', hasPublished: false, hasDraft: false,
            hidden: false, live: false, liveIfUnhidden: false, complete: false,
        }
        if (doc._id !== id) {
            row.hasDraft = true
            row.label = doc.label || row.label
            row.date = doc.date ?? row.date
            row.thumb = doc.thumb ?? row.thumb
            if (!row.hasPublished) row.hidden = Boolean(doc.hidden)
        } else {
            row.hasPublished = true
            row.label = row.label || doc.label || ''
            row.date = row.date ?? doc.date ?? undefined
            row.thumb = row.thumb ?? doc.thumb ?? undefined
            row.hidden = Boolean(doc.hidden)
            row.live = Boolean(doc.live)
            row.liveIfUnhidden = Boolean(doc.liveIfUnhidden)
            row.complete = Boolean(doc.complete)
        }
        rows.set(id, row)
    }
    return [...rows.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.id.localeCompare(b.id))
}

/** Every stored version of the rows: published and draft both, or publishing a draft would undo the change. */
export const versionsOf = (rows: Row[]): string[] =>
    rows.flatMap((row) => [row.hasPublished ? row.id : null, row.hasDraft ? draftIdOf(row.id) : null])
        .filter((id): id is string => Boolean(id))

/** Hide leaves what is hidden already, so its recorded reason survives. */
export const hideTargets = (rows: Row[]) => rows.filter((row) => !row.hidden)
/** Unhide touches only what is hidden, so an "Always show" is never cleared. */
export const unhideTargets = (rows: Row[]) => rows.filter((row) => row.hidden)

// ------------------------------------------------------------------ status

export type StatusKey = 'site' | 'hidden' | 'notShown' | 'draft'
export type Status = {key: StatusKey; text: string; tone: 'positive' | 'caution' | 'default'; hint: string}

/** The order the counts read in at the top of the pane. */
export const STATUS_ORDER: StatusKey[] = ['site', 'hidden', 'notShown', 'draft']

/** The badge on each row, with a line on hover saying why it is in that state. */
export function statusOf(row: Row, kind: Kind): Status {
    if (!row.hasPublished) {
        return {key: 'draft', text: 'Draft only', tone: 'default', hint: 'Never published, so not on the site. Publish it in its own page first.'}
    }
    if (row.hidden) {
        return {
            key: 'hidden',
            text: 'Hidden',
            tone: 'caution',
            hint:
                kind === 'artwork'
                    ? 'Taken off the site on purpose (set to “Never show”). Unhide puts it back if its ratings allow.'
                    : 'Taken off the site on purpose (“Show on the site” is off). Unhide puts it back.',
        }
    }
    if (row.live) return {key: 'site', text: 'On the site', tone: 'positive', hint: 'Visitors can see it now.'}
    if (kind === 'news') {
        return {
            key: 'notShown',
            text: 'Not shown',
            tone: 'default',
            hint: 'Not hidden, but something required is missing: its URL, category, Traditional Chinese or English title, publication date, a body, or its event or season details.',
        }
    }
    return {
        key: 'notShown',
        text: 'Not shown',
        tone: 'default',
        hint: row.complete
            ? 'Not hidden, but its ratings (Repetition, Quality, Creativity) do not meet the gallery’s selection criteria.'
            : 'Not hidden, but it cannot show yet: its image, URL or scripture in one of the three languages is missing.',
    }
}

export function countStatuses(rows: Row[], kind: Kind): Record<StatusKey, number> {
    const counts: Record<StatusKey, number> = {site: 0, hidden: 0, notShown: 0, draft: 0}
    for (const row of rows) counts[statusOf(row, kind).key]++
    return counts
}

// -------------------------------------------------------------------- undo

type Doc = {_id: string; _rev?: string; _updatedAt?: string} & Record<string, unknown>

/** What one bulk change did, so it can be put back. */
export type UndoRecord =
    | {
          kind: 'patch'
          summary: string
          fields: string[]
          /** Each version's fields before the change, and the revision the change left it at. */
          entries: {id: string; rev: string; before: Record<string, unknown>}[]
      }
    | {kind: 'delete'; summary: string; docs: Doc[]}

/**
 * The record of a patch: `before` is each version's fields as fetched ahead of
 * it, `revs` the revision each version was left at. A version missing from
 * `revs`, as when a later chunk failed, gets no revision and so is never undone.
 */
export function patchRecord(
    before: ({_id: string} & Record<string, unknown>)[],
    revs: Map<string, string>,
    fields: string[],
    summary: string,
): UndoRecord {
    return {
        kind: 'patch',
        summary,
        fields,
        entries: before.map(({_id, ...values}) => ({
            id: _id,
            rev: revs.get(_id) ?? '',
            before: Object.fromEntries(fields.map((f) => [f, values[f]])),
        })),
    }
}

export type PlannedPatch = {id: string; ifRevisionId: string; set: Record<string, unknown>; unset: string[]}

/**
 * What Undo writes for a patch: each version still exactly as the change left
 * it gets its fields back, a field that was empty before being unset. A
 * document counts as restored only when all its versions are; one where any
 * version was edited since counts as skipped, though its untouched versions
 * are still put back.
 */
export function planPatchUndo(
    record: Extract<UndoRecord, {kind: 'patch'}>,
    currentRevs: Map<string, string>,
): {patches: PlannedPatch[]; restored: number; skipped: number} {
    const untouched = record.entries.filter((entry) => entry.rev && currentRevs.get(entry.id) === entry.rev)
    const patches = untouched.map((entry) => {
        const empty = (f: string) => entry.before[f] === undefined || entry.before[f] === null
        return {
            id: entry.id,
            ifRevisionId: entry.rev,
            set: Object.fromEntries(record.fields.filter((f) => !empty(f)).map((f) => [f, entry.before[f]])),
            unset: record.fields.filter(empty),
        }
    })
    const docs = new Set(record.entries.map((e) => publishedIdOf(e.id)))
    const changedSince = new Set(
        record.entries.filter((e) => !untouched.includes(e)).map((e) => publishedIdOf(e.id)),
    )
    return {patches, restored: docs.size - changedSince.size, skipped: changedSince.size}
}

/**
 * What Undo recreates for a delete: every deleted version that has not come
 * back meanwhile, without the system fields Sanity sets itself on create.
 */
export function planDeleteUndo(
    record: Extract<UndoRecord, {kind: 'delete'}>,
    existingIds: Set<string>,
): {docs: Doc[]; restored: number; skipped: number} {
    const missing = record.docs.filter((doc) => !existingIds.has(doc._id))
    const docs = missing.map((doc) => {
        const copy: Doc = {...doc}
        delete copy._rev
        delete copy._updatedAt
        return copy
    })
    const all = new Set(record.docs.map((d) => publishedIdOf(d._id)))
    const back = new Set(record.docs.filter((d) => existingIds.has(d._id)).map((d) => publishedIdOf(d._id)))
    return {docs, restored: all.size - back.size, skipped: back.size}
}
