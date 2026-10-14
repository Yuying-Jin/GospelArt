import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {Badge, Box, Button, Card, Checkbox, Dialog, Flex, Select, Spinner, Stack, Text, TextArea, TextInput} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {getDraftId, getPublishedId, useClient, type SanityClient, type SanityDocument} from 'sanity'
import {GALLERY_COMPLETE_GROQ, GALLERY_ELIGIBLE_GROQ} from '../lib/galleryEligibility'
import {NEWS_ELIGIBLE_GROQ} from '../lib/newsEligibility'
import {SELECTION_CRITERIA_GROQ} from '../lib/selectionCriteria'

const API_VERSION = '2025-02-19'
/** Documents per transaction, well inside Sanity's mutation limits. */
const CHUNK = 50
const NOTE_MAX = 500

type Kind = 'artwork' | 'news'

type Row = {
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

type Fetched = {_id: string; label?: string; date?: string; thumb?: string; hidden?: boolean; live?: boolean; liveIfUnhidden?: boolean; complete?: boolean}

type Patch = {set: Record<string, unknown>; unset?: string[]}

/** What one bulk change did, so it can be put back. */
type UndoRecord =
    | {kind: 'patch'; summary: string; entries: {id: string; rev: string; before: Record<string, unknown>}[]; fields: string[]}
    | {kind: 'delete'; summary: string; docs: SanityDocument[]}

const CONFIG: Record<Kind, {
    noun: [string, string]
    projection: string
    /** The fields hide and unhide write, recorded before each change for Undo. */
    fields: string[]
    hidePatch: (note: string) => Patch
    unhidePatch: Patch
}> = {
    artwork: {
        noun: ['artwork', 'artworks'],
        projection: `"label": bibleReference, date, "thumb": image.asset->url,
            "hidden": galleryVisibility == "never", "live": ${GALLERY_ELIGIBLE_GROQ},
            "liveIfUnhidden": ${GALLERY_COMPLETE_GROQ} && ${SELECTION_CRITERIA_GROQ},
            "complete": ${GALLERY_COMPLETE_GROQ}`,
        fields: ['galleryVisibility', 'visibilityNote'],
        hidePatch: (note) => ({set: {galleryVisibility: 'never', visibilityNote: note}}),
        // Unhide returns to the ratings; "Always show" is never set or cleared from here.
        unhidePatch: {set: {galleryVisibility: 'auto'}, unset: ['visibilityNote']},
    },
    news: {
        noun: ['news item', 'news items'],
        projection: `"label": coalesce(title.zhTW, title.en), "date": publishedAt,
            "hidden": showOnSite == false, "live": ${NEWS_ELIGIBLE_GROQ}, "liveIfUnhidden": true, "complete": false`,
        fields: ['showOnSite'],
        hidePatch: () => ({set: {showOnSite: false}}),
        unhidePatch: {set: {showOnSite: true}},
    },
}

const count = (n: number, kind: Kind) => `${n} ${CONFIG[kind].noun[n === 1 ? 0 : 1]}`

/** One row per document, merging its published and draft versions; release versions are left alone. */
async function fetchRows(client: SanityClient, kind: Kind): Promise<Row[]> {
    const docs = await client.fetch<Fetched[]>(
        `*[_type == $type && !(_id in path("versions.**"))]{_id, ${CONFIG[kind].projection}}`,
        {type: kind},
    )
    const rows = new Map<string, Row>()
    for (const doc of docs) {
        const id = getPublishedId(doc._id)
        const isDraft = doc._id !== id
        const row = rows.get(id) ?? {
            id, label: '', hasPublished: false, hasDraft: false, hidden: false, live: false, liveIfUnhidden: false, complete: false,
        }
        if (isDraft) {
            row.hasDraft = true
            // The editor's latest wording, but the site's state comes from the published version.
            row.label = doc.label || row.label
            row.date = doc.date ?? row.date
            row.thumb = doc.thumb ?? row.thumb
            if (!row.hasPublished) row.hidden = Boolean(doc.hidden)
        } else {
            row.hasPublished = true
            row.label = row.label || doc.label || ''
            row.date = row.date ?? doc.date
            row.thumb = row.thumb ?? doc.thumb
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
const versionsOf = (rows: Row[]) =>
    rows.flatMap((row) => [row.hasPublished ? row.id : null, row.hasDraft ? getDraftId(row.id) : null]).filter(
        (id): id is string => Boolean(id),
    )

type Tx = ReturnType<SanityClient['transaction']>

/** Commits in chunks; returns each document's new revision, which is the id of the transaction that wrote it. */
async function inChunks(client: SanityClient, ids: string[], apply: (tx: Tx, id: string) => void) {
    const revs = new Map<string, string>()
    for (let i = 0; i < ids.length; i += CHUNK) {
        const tx = client.transaction()
        const chunk = ids.slice(i, i + CHUNK)
        for (const id of chunk) apply(tx, id)
        const {transactionId} = await tx.commit({visibility: 'async'})
        for (const id of chunk) revs.set(id, transactionId)
    }
    return revs
}

/**
 * Applies `patch` to every version of `rows`, recording each one's fields
 * beforehand so the change can be undone.
 */
async function patchWithUndo(client: SanityClient, kind: Kind, rows: Row[], patch: Patch, summary: string): Promise<UndoRecord> {
    const ids = versionsOf(rows)
    const fields = CONFIG[kind].fields
    const before = await client.fetch<Record<string, unknown>[]>(
        `*[_id in $ids]{_id, ${fields.join(', ')}}`,
        {ids},
    )
    const revs = await inChunks(client, ids, (tx, id) =>
        tx.patch(id, (p) => (patch.unset ? p.set(patch.set).unset(patch.unset) : p.set(patch.set))),
    )
    return {
        kind: 'patch',
        summary,
        fields,
        entries: before.map(({_id, ...values}) => ({id: _id as string, rev: revs.get(_id as string) ?? '', before: values})),
    }
}

/** Puts back what a record changed. Anything edited since is left alone and counted. */
async function undo(client: SanityClient, record: UndoRecord): Promise<{restored: number; skipped: number}> {
    if (record.kind === 'delete') {
        const existing = new Set(await client.fetch<string[]>(`*[_id in $ids]._id`, {ids: record.docs.map((d) => d._id)}))
        const missing = record.docs.filter((doc) => !existing.has(doc._id))
        for (let i = 0; i < missing.length; i += CHUNK) {
            const tx = client.transaction()
            for (const {_rev, _updatedAt, ...doc} of missing.slice(i, i + CHUNK)) {
                void _rev
                void _updatedAt
                tx.createIfNotExists(doc as SanityDocument)
            }
            await tx.commit({visibility: 'async'})
        }
        return {restored: missing.length, skipped: record.docs.length - missing.length}
    }

    const current = await client.fetch<{_id: string; _rev: string}[]>(`*[_id in $ids]{_id, _rev}`, {
        ids: record.entries.map((e) => e.id),
    })
    const revOf = new Map(current.map((doc) => [doc._id, doc._rev]))
    // Only documents still exactly as this change left them; the revision check repeats it on the server.
    const untouched = record.entries.filter((entry) => revOf.get(entry.id) === entry.rev)
    for (let i = 0; i < untouched.length; i += CHUNK) {
        const tx = client.transaction()
        for (const entry of untouched.slice(i, i + CHUNK)) {
            const set = Object.fromEntries(record.fields.filter((f) => entry.before[f] !== undefined && entry.before[f] !== null).map((f) => [f, entry.before[f]]))
            const unset = record.fields.filter((f) => entry.before[f] === undefined || entry.before[f] === null)
            tx.patch(entry.id, (p) => {
                let next = p.ifRevisionId(entry.rev)
                if (Object.keys(set).length) next = next.set(set)
                if (unset.length) next = next.unset(unset)
                return next
            })
        }
        await tx.commit({visibility: 'async'})
    }
    const rowsOf = (entries: {id: string}[]) => new Set(entries.map((e) => getPublishedId(e.id))).size
    return {restored: rowsOf(untouched), skipped: rowsOf(record.entries) - rowsOf(untouched)}
}

type StatusKey = 'site' | 'hidden' | 'notShown' | 'draft'
type Status = {key: StatusKey; text: string; tone: 'positive' | 'caution' | 'default'; hint: string}

/** The order the counts read in at the top of the pane. */
const STATUS_ORDER: StatusKey[] = ['site', 'hidden', 'notShown', 'draft']

/** The badge on each row, with a line on hover saying why it is in that state. */
function status(row: Row, kind: Kind): Status {
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

/** What each count at the top means, in general rather than for one row. */
const STATUS_SUMMARY: Record<Kind, Record<StatusKey, string>> = {
    artwork: {
        site: 'Visitors can see them now.',
        hidden: 'Taken off the site on purpose (set to “Never show”).',
        notShown: 'Not hidden, but either their ratings do not meet the selection criteria or something such as the image or scripture is missing. Point at the “Not shown” label on an item below to see its reason.',
        draft: 'Never published.',
    },
    news: {
        site: 'Visitors can see them now.',
        hidden: 'Taken off the site on purpose (“Show on the site” is off).',
        notShown: 'Not hidden, but something required is missing. Point at the “Not shown” label on an item below to see what is missing.',
        draft: 'Never published.',
    },
}

type Referrer = {_id: string; _type: string; label?: string}

/**
 * Hide, unhide or delete many artworks or news items at once, using the
 * fields each already has: `galleryVisibility` for artworks, `showOnSite` for
 * news. The last change can be undone. Opened from the sidebar as a component pane.
 */
export function bulkEditPane(kind: Kind) {
    return function BulkEditPane() {
        const client = useClient({apiVersion: API_VERSION}).withConfig({perspective: 'raw'})
        const toast = useToast()
        const config = CONFIG[kind]
        const nouns = config.noun[1]

        const [rows, setRows] = useState<Row[] | null>(null)
        const [loadError, setLoadError] = useState<string | null>(null)
        const [search, setSearch] = useState('')
        const [view, setView] = useState<'all' | StatusKey>('all')
        const [selected, setSelected] = useState<Set<string>>(new Set())
        const [busy, setBusy] = useState(false)
        const [dialog, setDialog] = useState<null | 'hide' | 'unhide' | 'delete'>(null)
        const [note, setNote] = useState('')
        /** Selected documents that something else references, with what references them. */
        const [users, setUsers] = useState<Map<string, Referrer[]> | null>(null)
        const [last, setLast] = useState<UndoRecord | null>(null)

        const load = useCallback(async () => {
            setLoadError(null)
            try {
                const next = await fetchRows(client, kind)
                setRows(next)
                // Drop selections whose document is gone.
                setSelected((prev) => new Set([...prev].filter((id) => next.some((row) => row.id === id))))
            } catch (err) {
                setLoadError(err instanceof Error ? err.message : String(err))
            }
        }, [client])

        useEffect(() => {
            load()
        }, [load])

        const visible = useMemo(() => {
            const term = search.trim().toLowerCase()
            return (rows ?? []).filter((row) => {
                if (view !== 'all' && status(row, kind).key !== view) return false
                return !term || row.label.toLowerCase().includes(term) || (row.date ?? '').includes(term)
            })
        }, [rows, search, view])

        const chosen = useMemo(() => (rows ?? []).filter((row) => selected.has(row.id)), [rows, selected])
        const statusCounts = useMemo(() => {
            const counts: Record<StatusKey, number> = {site: 0, hidden: 0, notShown: 0, draft: 0}
            for (const row of rows ?? []) counts[status(row, kind).key]++
            return counts
        }, [rows])
        const toHide = chosen.filter((row) => !row.hidden)
        const toUnhide = chosen.filter((row) => row.hidden)
        const allVisibleChosen = visible.length > 0 && visible.every((row) => selected.has(row.id))
        const someVisibleChosen = visible.some((row) => selected.has(row.id))

        const toggle = (id: string) =>
            setSelected((prev) => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
            })

        const toggleVisible = () =>
            setSelected((prev) => {
                const next = new Set(prev)
                for (const row of visible) {
                    if (allVisibleChosen) next.delete(row.id)
                    else next.add(row.id)
                }
                return next
            })

        const run = async (work: () => Promise<UndoRecord>) => {
            setBusy(true)
            try {
                const record = await work()
                setLast(record)
                toast.push({status: 'success', title: record.summary, description: 'Undo is at the top of this list.'})
                setSelected(new Set())
                setDialog(null)
                setNote('')
            } catch (err) {
                toast.push({
                    status: 'error',
                    title: 'The change did not finish',
                    description: `${err instanceof Error ? err.message : String(err)} Reload the list to see what was changed.`,
                })
            } finally {
                setBusy(false)
                await load()
            }
        }

        const hide = () =>
            run(() => patchWithUndo(client, kind, toHide, config.hidePatch(note.trim()), `Hid ${count(toHide.length, kind)} from the site`))

        const unhide = () =>
            run(() => patchWithUndo(client, kind, toUnhide, config.unhidePatch, `Unhid ${count(toUnhide.length, kind)}`))

        const undoLast = async () => {
            if (!last) return
            setBusy(true)
            try {
                const {restored, skipped} = await undo(client, last)
                toast.push({
                    status: skipped ? 'warning' : 'success',
                    title: `Undone: ${count(restored, kind)} back as they were`,
                    description: skipped ? `${count(skipped, kind)} changed again since, so were left alone.` : undefined,
                })
                setLast(null)
            } catch (err) {
                toast.push({status: 'error', title: 'Undo did not finish', description: err instanceof Error ? err.message : String(err)})
            } finally {
                setBusy(false)
                await load()
            }
        }

        const openDelete = async () => {
            setDialog('delete')
            setUsers(null)
            // Sanity refuses to delete a document another one points to, so find those first.
            const found = await client
                .fetch<{_id: string; users: Referrer[]}[]>(
                    `*[_id in $ids]{_id, "users": *[references(^._id) && !(_id in $versions)]{
                        _id, _type, "label": coalesce(title.zhTW, title.en, bibleReference)
                    }}`,
                    {ids: chosen.map((row) => row.id), versions: versionsOf(chosen)},
                )
                .catch(() => [])
            setUsers(new Map(found.filter((doc) => doc.users.length).map((doc) => [doc._id, doc.users])))
        }

        const deletable = chosen.filter((row) => !users?.has(row.id))

        const remove = () =>
            run(async () => {
                const ids = versionsOf(deletable)
                // The whole documents, so Undo can put them back as they were.
                const docs = await client.fetch<SanityDocument[]>(`*[_id in $ids]`, {ids})
                await inChunks(client, ids, (tx, id) => tx.delete(id))
                const skipped = chosen.length - deletable.length
                return {
                    kind: 'delete',
                    docs,
                    summary: `Deleted ${count(deletable.length, kind)}` + (skipped ? `; ${skipped} still in use were kept` : ''),
                }
            })

        const labelOf = (row: Row) => row.label || 'Untitled'
        const referrerName = (ref: Referrer) =>
            `${ref._type === 'homePage' ? 'Home page' : ref.label || ref._type}${ref._id.startsWith('drafts.') ? ' (draft)' : ''}`
        const list = (items: Row[]) => (
            <Stack gap={2}>
                {items.slice(0, 8).map((row) => (
                    <Text key={row.id} size={1}>· {labelOf(row)} <span style={{opacity: 0.6}}>{row.date}</span></Text>
                ))}
                {items.length > 8 && <Text size={1} muted>and {items.length - 8} more</Text>}
            </Stack>
        )

        if (loadError) {
            return (
                <Box padding={4}>
                    <Stack gap={3}>
                        <Text>The list could not be loaded: {loadError}</Text>
                        <Button text="Try again" mode="ghost" onClick={load} />
                    </Stack>
                </Box>
            )
        }
        if (!rows) {
            return (
                <Flex padding={5} justify="center">
                    <Spinner muted />
                </Flex>
            )
        }

        const willShow = toUnhide.filter((row) => row.liveIfUnhidden)
        const staysOff = toUnhide.filter((row) => !row.liveIfUnhidden)

        return (
            <Flex direction="column" height="fill">
                {last && (
                    <Card padding={3} tone="primary" borderBottom>
                        <Flex gap={3} align="center" wrap="wrap">
                            <Box flex={1} style={{minWidth: 160}}>
                                <Text size={1}>{last.summary}.</Text>
                            </Box>
                            <Button text="Undo" mode="ghost" onClick={undoLast} disabled={busy} />
                            <Button text="Dismiss" mode="bleed" onClick={() => setLast(null)} disabled={busy} />
                        </Flex>
                    </Card>
                )}

                <Card padding={3} borderBottom>
                    <Stack gap={3}>
                        {/* How many are in each state, across the whole list; each one filters to its state. */}
                        <Flex gap={2} wrap="wrap" align="center">
                            {STATUS_ORDER.filter((key) => statusCounts[key] > 0 || key !== 'draft').map((key) => {
                                const tone = key === 'site' ? 'positive' : key === 'hidden' ? 'caution' : 'default'
                                const label = {site: 'On the site', hidden: 'Hidden', notShown: 'Not shown', draft: 'Draft only'}[key]
                                return (
                                    <Button
                                        key={key}
                                        mode={view === key ? 'default' : 'ghost'}
                                        tone={tone === 'default' ? 'default' : tone}
                                        fontSize={1}
                                        padding={2}
                                        selected={view === key}
                                        title={`${STATUS_SUMMARY[kind][key]} ${view === key ? `Showing only these now. Click again to list all ${nouns}.` : 'Click to list only these.'}`}
                                        text={`${label} ${statusCounts[key]}`}
                                        onClick={() => setView(view === key ? 'all' : key)}
                                    />
                                )
                            })}
                        </Flex>
                        <Flex gap={2} wrap="wrap">
                            <Box flex={1} style={{minWidth: 180}}>
                                <TextInput
                                    value={search}
                                    placeholder={kind === 'artwork' ? 'Search by reference or date' : 'Search by title or date'}
                                    onChange={(event) => setSearch(event.currentTarget.value)}
                                />
                            </Box>
                            <Select value={view} onChange={(event) => setView(event.currentTarget.value as typeof view)}>
                                <option value="all">All</option>
                                <option value="site">On the site</option>
                                <option value="hidden">Hidden</option>
                                <option value="notShown">Not shown</option>
                                <option value="draft">Draft only</option>
                            </Select>
                        </Flex>
                        <Flex gap={2} wrap="wrap" align="center">
                            <Button
                                text="Hide from the site"
                                tone="caution"
                                disabled={busy || !toHide.length}
                                onClick={() => setDialog('hide')}
                            />
                            <Button text="Unhide" mode="ghost" disabled={busy || !toUnhide.length} onClick={() => setDialog('unhide')} />
                            <Button text="Delete…" tone="critical" mode="ghost" disabled={busy || !chosen.length} onClick={openDelete} />
                            {busy && <Spinner muted />}
                            <Box flex={1} />
                            <Text size={1} muted>
                                {chosen.length ? `${count(chosen.length, kind)} selected` : `${count(visible.length, kind)}`}
                            </Text>
                        </Flex>
                    </Stack>
                </Card>

                {/* The list's header, set apart from the rows it selects. */}
                <Card paddingX={3} paddingY={3} borderBottom tone="transparent">
                    <Flex gap={3} align="center">
                        <Flex gap={3} align="center" flex={1} as="label" style={{cursor: 'pointer'}}>
                            <Checkbox
                                checked={allVisibleChosen}
                                indeterminate={someVisibleChosen && !allVisibleChosen}
                                onChange={toggleVisible}
                                disabled={!visible.length}
                            />
                            <Text size={1} weight="medium" muted>
                                {someVisibleChosen
                                    ? `${visible.filter((row) => selected.has(row.id)).length} of ${visible.length} shown selected`
                                    : `Select all ${visible.length} shown`}
                            </Text>
                        </Flex>
                        {selected.size > 0 && (
                            <Button text="Clear selection" mode="bleed" fontSize={1} padding={2} onClick={() => setSelected(new Set())} />
                        )}
                    </Flex>
                </Card>

                <Box flex={1} overflow="auto">
                    {visible.length === 0 && (
                        <Box padding={4}>
                            <Text muted size={1}>Nothing matches.</Text>
                        </Box>
                    )}
                    {visible.map((row) => {
                        const st = status(row, kind)
                        return (
                            <Card key={row.id} paddingX={3} paddingY={2} borderBottom tone={selected.has(row.id) ? 'primary' : 'default'}>
                                <Flex gap={3} align="center" as="label" style={{cursor: 'pointer'}}>
                                    <Checkbox checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
                                    {kind === 'artwork' && (
                                        <Box style={{width: 36, height: 36, flex: 'none', borderRadius: 3, overflow: 'hidden', background: 'var(--card-muted-bg-color)'}}>
                                            {row.thumb && (
                                                <img src={`${row.thumb}?w=72&h=72&fit=crop`} alt="" width={36} height={36} style={{display: 'block'}} />
                                            )}
                                        </Box>
                                    )}
                                    <Stack gap={2} flex={1} style={{minWidth: 0}}>
                                        <Text size={1} weight="medium" textOverflow="ellipsis">{labelOf(row)}</Text>
                                        <Text size={0} muted>{row.date ?? 'No date'}{row.hasDraft && row.hasPublished ? ' · unpublished changes' : ''}</Text>
                                    </Stack>
                                    <Badge tone={st.tone} title={st.hint} style={{cursor: 'help'}}>{st.text}</Badge>
                                </Flex>
                            </Card>
                        )
                    })}
                </Box>

                {dialog === 'hide' && (
                    <Dialog
                        id="bulk-hide"
                        header={`Hide ${count(toHide.length, kind)} from the site`}
                        onClose={() => !busy && setDialog(null)}
                        width={1}
                        footer={
                            <Flex gap={2} justify="flex-end" padding={3}>
                                <Button text="Cancel" mode="bleed" onClick={() => setDialog(null)} disabled={busy} />
                                <Button
                                    text="Hide"
                                    tone="caution"
                                    onClick={hide}
                                    disabled={busy || (kind === 'artwork' && !note.trim())}
                                    loading={busy}
                                />
                            </Flex>
                        }
                    >
                        <Box padding={4}>
                            <Stack gap={4}>
                                <Text size={1}>
                                    They stay in the Studio and can be unhidden at any time.
                                    {chosen.length > toHide.length && ` ${count(chosen.length - toHide.length, kind)} already hidden are left as they are.`}
                                </Text>
                                {list(toHide)}
                                {kind === 'artwork' && (
                                    <Stack gap={2}>
                                        <Text size={1} weight="medium">Why are they hidden?</Text>
                                        <TextArea
                                            rows={3}
                                            value={note}
                                            maxLength={NOTE_MAX}
                                            placeholder="e.g. Photo, not a painting"
                                            onChange={(event) => setNote(event.currentTarget.value)}
                                        />
                                        <Text size={0} muted>
                                            Saved on each one as “Why was visibility overridden?”. {note.length} / {NOTE_MAX}
                                        </Text>
                                    </Stack>
                                )}
                            </Stack>
                        </Box>
                    </Dialog>
                )}

                {dialog === 'unhide' && (
                    <Dialog
                        id="bulk-unhide"
                        header={`Unhide ${count(toUnhide.length, kind)}`}
                        onClose={() => !busy && setDialog(null)}
                        width={1}
                        footer={
                            <Flex gap={2} justify="flex-end" padding={3}>
                                <Button text="Cancel" mode="bleed" onClick={() => setDialog(null)} disabled={busy} />
                                <Button text="Unhide" tone="primary" onClick={unhide} disabled={busy} loading={busy} />
                            </Flex>
                        }
                    >
                        <Box padding={4}>
                            <Stack gap={4}>
                                {chosen.length > toUnhide.length && (
                                    <Text size={1} muted>
                                        Only the hidden ones are changed; the other {count(chosen.length - toUnhide.length, kind)} selected
                                        are left as they are.
                                    </Text>
                                )}
                                {kind === 'artwork' ? (
                                    <>
                                        {willShow.length > 0 && (
                                            <Stack gap={2}>
                                                <Text size={1} weight="medium">{count(willShow.length, kind)} will appear on the site again:</Text>
                                                {list(willShow)}
                                            </Stack>
                                        )}
                                        {staysOff.length > 0 && (
                                            <Card padding={3} radius={2} tone="caution" border>
                                                <Stack gap={2}>
                                                    <Text size={1} weight="medium">
                                                        {count(staysOff.length, kind)} will still not appear, because their ratings do not meet the
                                                        gallery’s selection criteria, or their image or scripture is missing:
                                                    </Text>
                                                    {list(staysOff)}
                                                </Stack>
                                            </Card>
                                        )}
                                        <Text size={1} muted>The reason recorded for hiding each one is removed.</Text>
                                    </>
                                ) : (
                                    <Stack gap={2}>
                                        <Text size={1}>These will show on the site again:</Text>
                                        {list(toUnhide)}
                                    </Stack>
                                )}
                            </Stack>
                        </Box>
                    </Dialog>
                )}

                {dialog === 'delete' && (
                    <Dialog
                        id="bulk-delete"
                        header={`Delete ${count(chosen.length, kind)}`}
                        onClose={() => !busy && setDialog(null)}
                        width={1}
                        footer={
                            <Flex gap={2} justify="flex-end" padding={3}>
                                <Button text="Cancel" mode="bleed" onClick={() => setDialog(null)} disabled={busy} />
                                <Button
                                    text={`Delete ${count(deletable.length, kind)}`}
                                    tone="critical"
                                    onClick={remove}
                                    disabled={busy || !users || !deletable.length}
                                    loading={busy}
                                />
                            </Flex>
                        }
                    >
                        <Box padding={4}>
                            {!users ? (
                                <Flex gap={2} align="center">
                                    <Spinner muted />
                                    <Text size={1} muted>Checking whether anything uses them…</Text>
                                </Flex>
                            ) : (
                                <Stack gap={4}>
                                    <Text size={1}>
                                        Deleted {nouns} disappear from the site and from this Studio, drafts included. Undo can bring
                                        them back while this list stays open. To take them off the site but keep them, use “Hide from
                                        the site” instead.
                                    </Text>
                                    {deletable.length > 0 && list(deletable)}
                                    {users.size > 0 && (
                                        <Card padding={3} radius={2} tone="caution" border>
                                            <Stack gap={2}>
                                                <Text size={1} weight="medium">
                                                    {count(users.size, kind)} will be kept, because something still uses them:
                                                </Text>
                                                {chosen
                                                    .filter((row) => users.has(row.id))
                                                    .map((row) => (
                                                        <Text key={row.id} size={1}>
                                                            · {labelOf(row)}, used by {(users.get(row.id) ?? []).map(referrerName).join(', ')}
                                                        </Text>
                                                    ))}
                                                <Text size={1} muted>Remove them there first, then delete them here.</Text>
                                            </Stack>
                                        </Card>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    </Dialog>
                )}
            </Flex>
        )
    }
}
