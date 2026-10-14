import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
    countStatuses,
    hideTargets,
    mergeRows,
    patchRecord,
    planDeleteUndo,
    planPatchUndo,
    statusOf,
    unhideTargets,
    versionsOf,
    type Row,
    type UndoRecord,
} from './bulkEdit.ts'

const row = (over: Partial<Row>): Row => ({
    id: 'a', label: '', hasPublished: true, hasDraft: false,
    hidden: false, live: false, liveIfUnhidden: false, complete: false,
    ...over,
})

// ------------------------------------------------------------------ rows

test('a document’s draft and published versions become one row', () => {
    const rows = mergeRows([
        {_id: 'a', label: 'John 3:16', date: '2026-01-01', live: true},
        {_id: 'drafts.a', label: 'John 3:16-17', date: '2026-01-02'},
    ])
    assert.equal(rows.length, 1)
    assert.equal(rows[0].hasPublished, true)
    assert.equal(rows[0].hasDraft, true)
})

test('the label and date are the draft’s, whichever version comes first', () => {
    for (const order of [
        [{_id: 'a', label: 'old', date: '2026-01-01'}, {_id: 'drafts.a', label: 'new', date: '2026-02-02'}],
        [{_id: 'drafts.a', label: 'new', date: '2026-02-02'}, {_id: 'a', label: 'old', date: '2026-01-01'}],
    ]) {
        const [merged] = mergeRows(order)
        assert.equal(merged.label, 'new')
        assert.equal(merged.date, '2026-02-02')
    }
})

test('whether it is on the site comes from the published version, as visitors see', () => {
    const [merged] = mergeRows([
        {_id: 'drafts.a', hidden: true, live: false},
        {_id: 'a', hidden: false, live: true},
    ])
    assert.equal(merged.hidden, false)
    assert.equal(merged.live, true)
})

test('a draft that was never published keeps its own hidden state and is not live', () => {
    const [merged] = mergeRows([{_id: 'drafts.a', hidden: true, live: true}])
    assert.equal(merged.hasPublished, false)
    assert.equal(merged.hidden, true)
    assert.equal(merged.live, false)
})

test('rows come newest first, ties by id so the order is stable', () => {
    const rows = mergeRows([
        {_id: 'b', date: '2026-01-01'},
        {_id: 'c', date: '2026-03-01'},
        {_id: 'a', date: '2026-01-01'},
    ])
    assert.deepEqual(rows.map((r) => r.id), ['c', 'a', 'b'])
})

test('every stored version is changed, so publishing a draft cannot undo a change', () => {
    assert.deepEqual(
        versionsOf([
            row({id: 'a', hasPublished: true, hasDraft: true}),
            row({id: 'b', hasPublished: true}),
            row({id: 'c', hasPublished: false, hasDraft: true}),
        ]),
        ['a', 'drafts.a', 'b', 'drafts.c'],
    )
})

// --------------------------------------------------------------- targets

test('Hide leaves what is already hidden, so its recorded reason survives', () => {
    const rows = [row({id: 'shown'}), row({id: 'hidden', hidden: true})]
    assert.deepEqual(hideTargets(rows).map((r) => r.id), ['shown'])
})

test('Unhide touches only what is hidden, never an artwork set to always show', () => {
    // An "Always show" artwork is not hidden, so Unhide cannot turn it back to the ratings.
    const rows = [row({id: 'always', live: true}), row({id: 'hidden', hidden: true}), row({id: 'below', live: false})]
    assert.deepEqual(unhideTargets(rows).map((r) => r.id), ['hidden'])
})

// ---------------------------------------------------------------- status

test('each state gets its own label, and Not shown says why', () => {
    assert.equal(statusOf(row({hasPublished: false, hasDraft: true}), 'artwork').key, 'draft')
    assert.equal(statusOf(row({hidden: true}), 'artwork').key, 'hidden')
    assert.equal(statusOf(row({live: true}), 'artwork').key, 'site')
    assert.match(statusOf(row({complete: true}), 'artwork').hint, /ratings/)
    assert.match(statusOf(row({complete: false}), 'artwork').hint, /missing/)
    assert.match(statusOf(row({}), 'news').hint, /required is missing/)
})

test('a draft-only document counts as a draft even when marked hidden', () => {
    assert.equal(statusOf(row({hasPublished: false, hidden: true}), 'news').key, 'draft')
})

test('the counts add up to the whole list', () => {
    const rows = [row({live: true}), row({live: true}), row({hidden: true}), row({}), row({hasPublished: false})]
    assert.deepEqual(countStatuses(rows, 'artwork'), {site: 2, hidden: 1, notShown: 1, draft: 1})
})

// ------------------------------------------------------------- undo: patch

const FIELDS = ['galleryVisibility', 'visibilityNote']

test('the record keeps each version’s fields before the change, and the revision it left', () => {
    const record = patchRecord(
        [{_id: 'a', galleryVisibility: 'never', visibilityNote: 'Photo', bibleReference: 'ignored'}],
        new Map([['a', 'tx1']]),
        FIELDS,
        'Unhid 1 artwork',
    )
    assert.deepEqual(record, {
        kind: 'patch',
        summary: 'Unhid 1 artwork',
        fields: FIELDS,
        entries: [{id: 'a', rev: 'tx1', before: {galleryVisibility: 'never', visibilityNote: 'Photo'}}],
    })
})

test('Undo puts each field back, and clears one that was empty before', () => {
    // The misclick of 14 October: a hidden artwork turned back to the ratings, its reason removed.
    const record = patchRecord(
        [
            {_id: 'a', galleryVisibility: 'never', visibilityNote: 'Photo not painting'},
            {_id: 'b', galleryVisibility: 'auto', visibilityNote: null},
        ],
        new Map([['a', 'tx1'], ['b', 'tx1']]),
        FIELDS,
        'Unhid 2 artworks',
    ) as Extract<UndoRecord, {kind: 'patch'}>
    const plan = planPatchUndo(record, new Map([['a', 'tx1'], ['b', 'tx1']]))
    assert.deepEqual(plan.patches, [
        {id: 'a', ifRevisionId: 'tx1', set: {galleryVisibility: 'never', visibilityNote: 'Photo not painting'}, unset: []},
        {id: 'b', ifRevisionId: 'tx1', set: {galleryVisibility: 'auto'}, unset: ['visibilityNote']},
    ])
    assert.equal(plan.restored, 2)
    assert.equal(plan.skipped, 0)
})

test('a field missing from the fetched values counts as empty, so it is cleared', () => {
    const record = patchRecord([{_id: 'n'}], new Map([['n', 'tx1']]), ['showOnSite'], 'Hid 1 news item') as Extract<UndoRecord, {kind: 'patch'}>
    assert.deepEqual(planPatchUndo(record, new Map([['n', 'tx1']])).patches[0].unset, ['showOnSite'])
})

test('Undo leaves anything edited since the change, and counts it', () => {
    const record = patchRecord(
        [{_id: 'a', galleryVisibility: 'never'}, {_id: 'b', galleryVisibility: 'never'}],
        new Map([['a', 'tx1'], ['b', 'tx1']]),
        FIELDS,
        'Unhid 2 artworks',
    ) as Extract<UndoRecord, {kind: 'patch'}>
    // Someone edited b after the change; its revision moved on.
    const plan = planPatchUndo(record, new Map([['a', 'tx1'], ['b', 'tx2']]))
    assert.deepEqual(plan.patches.map((p) => p.id), ['a'])
    assert.equal(plan.restored, 1)
    assert.equal(plan.skipped, 1)
})

test('a deleted document is skipped, not recreated by a patch', () => {
    const record = patchRecord([{_id: 'a', showOnSite: true}], new Map([['a', 'tx1']]), ['showOnSite'], 'Hid') as Extract<UndoRecord, {kind: 'patch'}>
    const plan = planPatchUndo(record, new Map())
    assert.deepEqual(plan.patches, [])
    assert.equal(plan.skipped, 1)
})

test('a document whose draft was edited since counts as skipped, though its published version is put back', () => {
    const record = patchRecord(
        [{_id: 'a', showOnSite: true}, {_id: 'drafts.a', showOnSite: true}],
        new Map([['a', 'tx1'], ['drafts.a', 'tx1']]),
        ['showOnSite'],
        'Hid 1 news item',
    ) as Extract<UndoRecord, {kind: 'patch'}>
    const plan = planPatchUndo(record, new Map([['a', 'tx1'], ['drafts.a', 'tx9']]))
    assert.deepEqual(plan.patches.map((p) => p.id), ['a'])
    // One document, not two versions.
    assert.equal(plan.restored, 0)
    assert.equal(plan.skipped, 1)
})

test('a version the change never reached, as when a later chunk failed, is never undone', () => {
    const record = patchRecord(
        [{_id: 'a', showOnSite: true}, {_id: 'b', showOnSite: true}],
        new Map([['a', 'tx1']]), // b's chunk did not commit
        ['showOnSite'],
        'Hid',
    ) as Extract<UndoRecord, {kind: 'patch'}>
    // Even if b's current revision happened to be empty or match nothing.
    const plan = planPatchUndo(record, new Map([['a', 'tx1'], ['b', '']]))
    assert.deepEqual(plan.patches.map((p) => p.id), ['a'])
})

// ------------------------------------------------------------ undo: delete

test('Undo of a delete recreates each document whole, without the fields Sanity sets itself', () => {
    const record: UndoRecord = {
        kind: 'delete',
        summary: 'Deleted 1 news item',
        docs: [
            {_id: 'a', _type: 'news', _rev: 'r1', _updatedAt: '2026-10-14T00:00:00Z', _createdAt: '2026-01-01T00:00:00Z', title: {en: 'Hello'}},
            {_id: 'drafts.a', _type: 'news', _rev: 'r2', title: {en: 'Hello again'}},
        ],
    }
    const plan = planDeleteUndo(record, new Set())
    assert.deepEqual(plan.docs, [
        {_id: 'a', _type: 'news', _createdAt: '2026-01-01T00:00:00Z', title: {en: 'Hello'}},
        {_id: 'drafts.a', _type: 'news', title: {en: 'Hello again'}},
    ])
    assert.equal(plan.restored, 1)
    assert.equal(plan.skipped, 0)
    // The record itself is left intact, so a failed Undo can be tried again.
    assert.equal((record.docs[0] as {_rev?: string})._rev, 'r1')
})

test('a deleted document that has come back meanwhile is not recreated over it', () => {
    const record: UndoRecord = {
        kind: 'delete',
        summary: 'Deleted 2 artworks',
        docs: [{_id: 'a', _type: 'artwork'}, {_id: 'b', _type: 'artwork'}],
    }
    const plan = planDeleteUndo(record, new Set(['b']))
    assert.deepEqual(plan.docs.map((d) => d._id), ['a'])
    assert.equal(plan.restored, 1)
    assert.equal(plan.skipped, 1)
})
