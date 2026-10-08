import React, {useCallback, useState} from 'react'
import type {SanityDocument} from 'sanity'
import {useDocumentOperation} from 'sanity'
import {BIBLE_VERSIONS, SCRIPTURE_API_URL, SCRIPTURE_FIELDS, type ScriptureField} from './bibleVersions'
import {normalizeReference} from './scripture/normalize'
import {stripVerseParts} from './scripture/reference'
import {validateReference} from './scripture/validate'

/** Past this a fetch asks first; the longest in the collection is 6. */
const CONFIRM_ABOVE_VERSES = 10

/** Past this it is refused, and the text has to be entered by hand. */
const MAX_FETCH_VERSES = 20

/** Verses the reference covers, from the local table, so nothing is fetched to find out. */
export function countVerses(reference: string): number {
    const result = validateReference(stripVerseParts(normalizeReference(reference)))
    if (!result.valid) return 0
    return result.verses.reduce((total, {start, end}) => total + end - start + 1, 0)
}

export type ArtworkDoc = SanityDocument & {
    bibleReference?: string
    scripture?: Partial<Record<ScriptureField, string>>
}

export type ScriptureTexts = Partial<Record<ScriptureField, string>>

export type LookupResult = {
    canonical?: string
    /** The reference in the stored format; absent from an app deployed before it existed. */
    normalized?: string
    /** What was looked up; differs from `normalized` when it names part of a verse. */
    lookupReference?: string
    /** Set when the reference was rejected before anything was looked up. */
    invalid?: string
    verseCount?: number
    texts?: ScriptureTexts
    errors?: ScriptureTexts
    error?: string
}

export type ScriptureLookupController = {
    open: boolean
    loading: boolean
    result: LookupResult | null
    selected: Record<string, boolean>
    /** How many ticked languages actually have text to write. */
    chosenCount: number
    toggle: (field: ScriptureField, checked: boolean) => void
    lookup: () => Promise<void>
    apply: () => void
    close: () => void
}

/**
 * Fills the three scripture fields from an actual Bible translation, keyed off
 * the artwork's Bible Reference.
 *
 * No machine translation is involved: each language comes from a real published
 * translation (和合本 for Chinese, ESV for English) via the app's
 * /api/scripture proxy — see bibleVersions.ts for why the proxy exists rather
 * than calling the providers directly.
 *
 * Nothing is overwritten silently. A language that already has text is listed
 * with its current value and its checkbox cleared, so a careless click can only
 * ever fill blanks. The fields stay ordinary editable text afterwards; this
 * writes values, it does not take ownership of them.
 *
 * The one other field it writes is Bible Reference, and only to the stored
 * format of what is already there ("John 3：16" -> "John 3:16"), announced in
 * the review step. It never names a different passage.
 *
 * Split from its trigger on purpose: the same lookup is reachable from the
 * document action and from a button inside the Scripture field, and only the
 * surrounding chrome differs. `docId` must be the published id — callers
 * reading `_id` off the form have to pass it through `getPublishedId`, since
 * `useDocumentOperation` does not accept a `drafts.`-prefixed one.
 */
export function useScriptureLookup({
    docId,
    docType,
    reference,
    existing,
    onClosed,
    scriptureField = 'scripture',
    referenceField = 'bibleReference',
}: {
    docId: string
    docType: string
    reference: string
    existing: ScriptureTexts
    /** The document action uses this to dismiss its menu; the field does not need it. */
    onClosed?: () => void
    /** Where the texts and the corrected reference are written; an artwork's by default. */
    scriptureField?: string
    referenceField?: string
}): ScriptureLookupController {
    const {patch} = useDocumentOperation(docId, docType)

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<LookupResult | null>(null)
    const [selected, setSelected] = useState<Record<string, boolean>>({})

    const close = useCallback(() => {
        setOpen(false)
        setResult(null)
        setLoading(false)
        onClosed?.()
    }, [onClosed])

    const lookup = useCallback(async () => {
        const verses = countVerses(reference)
        if (verses > MAX_FETCH_VERSES) {
            window.alert(
                `經文過長（超過 ${MAX_FETCH_VERSES} 節），無法拉取：${reference} 共 ${verses} 節。如確有需要，請手動填寫經文。\n\n` +
                    `Passage too long (over ${MAX_FETCH_VERSES} verses) to fetch: ${reference} covers ${verses} verses. If it is really meant, enter the text by hand.`,
            )
            onClosed?.()
            return
        }
        if (
            verses > CONFIRM_ABOVE_VERSES &&
            !window.confirm(
                `經文過長（超過 ${CONFIRM_ABOVE_VERSES} 節）：${reference} 共 ${verses} 節。確定要拉取嗎？\n\n` +
                    `Long passage (over ${CONFIRM_ABOVE_VERSES} verses): ${reference} covers ${verses} verses. Fetch it anyway?`,
            )
        ) {
            onClosed?.()
            return
        }

        setOpen(true)
        setLoading(true)
        setResult(null)

        try {
            const response = await fetch(
                `${SCRIPTURE_API_URL}?reference=${encodeURIComponent(reference)}`,
            )
            const payload: LookupResult = await response.json()

            if (!response.ok) {
                setResult({error: payload?.error ?? `Lookup failed (HTTP ${response.status})`})
                return
            }

            // Pre-select only the languages that are currently empty, so the
            // default action never replaces anything a person wrote.
            const preselected: Record<string, boolean> = {}
            for (const field of SCRIPTURE_FIELDS) {
                const fetched = payload.texts?.[field]
                preselected[field] = Boolean(fetched) && !existing[field]?.trim()
            }

            setSelected(preselected)
            setResult(payload)
        } catch (error) {
            setResult({
                error:
                    error instanceof Error
                        ? `${error.message} — is the Next.js app running, and is SANITY_STUDIO_SCRIPTURE_API set?`
                        : 'Lookup failed',
            })
        } finally {
            setLoading(false)
        }
    }, [existing, onClosed, reference])

    const apply = useCallback(() => {
        const set: Record<string, string> = {}
        const corrected = correctedReference(reference, result)
        for (const field of SCRIPTURE_FIELDS) {
            const fetched = result?.texts?.[field]
            if (fetched && selected[field]) set[`${scriptureField}.${field}`] = fetched
        }

        if (Object.keys(set).length === 0) {
            close()
            return
        }

        if (corrected) set[referenceField] = corrected

        // Patch through the document operation rather than the client so the
        // open form updates immediately and the change lands in the draft for
        // review, instead of being written straight to the published document.
        patch.execute([{setIfMissing: {[scriptureField]: {_type: 'localeText'}}}, {set}])
        close()
    }, [close, patch, reference, referenceField, result, scriptureField, selected])

    const toggle = useCallback((field: ScriptureField, checked: boolean) => {
        setSelected((previous) => ({...previous, [field]: checked}))
    }, [])

    const chosenCount = SCRIPTURE_FIELDS.filter(
        (field) => selected[field] && result?.texts?.[field],
    ).length

    return {open, loading, result, selected, chosenCount, toggle, lookup, apply, close}
}

/** The stored format of the reference, when it differs from what was typed. */
function correctedReference(reference: string, result: LookupResult | null): string | null {
    const normalized = result?.normalized
    return normalized && normalized !== reference ? normalized : null
}

/**
 * The review step: what came back, which languages are ticked, and what each
 * would replace. Chrome-free so the document action can hand it to Sanity's
 * dialog and the field can render it in place.
 */
export function ScriptureLookupBody({
    controller,
    reference,
    existing,
}: {
    controller: ScriptureLookupController
    reference: string
    existing: ScriptureTexts
}) {
    const {loading, result, selected, chosenCount, toggle, apply, close} = controller

    return (
        <div style={{fontSize: 13, lineHeight: 1.6}}>
            {loading && <p>Looking up {reference}…</p>}

            {result?.error && <p style={{color: '#c33'}}>{result.error}</p>}

            {result?.invalid && (
                <div
                    style={{
                        background: 'rgba(204, 51, 51, 0.1)',
                        border: '1px solid rgba(204, 51, 51, 0.5)',
                        borderRadius: 3,
                        padding: '10px 12px',
                    }}
                >
                    <p style={{margin: '0 0 6px'}}>
                        <strong>{reference}</strong> was not looked up.
                    </p>
                    <p style={{margin: '0 0 6px'}}>{result.invalid}</p>
                    <p style={{margin: 0, opacity: 0.75}}>
                        A reference needs a real book and chapter, and verses unless it is
                        the whole chapter. Use Pick a passage on the Bible Reference field,
                        then fetch again.
                    </p>
                </div>
            )}

            {result && !result.error && !result.invalid && (
                <>
                    <p style={{marginTop: 0, opacity: 0.75}}>
                        Resolved as <strong>{result.canonical}</strong>
                        {result.verseCount ? ` · ${result.verseCount} verse(s)` : ''}
                    </p>

                    {correctedReference(reference, result) && (
                        <p
                            style={{
                                background: 'rgba(34, 118, 252, 0.1)',
                                border: '1px solid rgba(34, 118, 252, 0.45)',
                                borderRadius: 3,
                                padding: '8px 10px',
                                margin: '0 0 10px',
                            }}
                        >
                            Bible Reference will also be corrected from <strong>{reference}</strong> to{' '}
                            <strong>{result.normalized}</strong>.
                        </p>
                    )}

                    {result.lookupReference &&
                        result.lookupReference !== (result.normalized ?? reference) && (
                        <p
                            style={{
                                background: 'rgba(187, 119, 0, 0.12)',
                                border: '1px solid rgba(187, 119, 0, 0.5)',
                                borderRadius: 3,
                                padding: '8px 10px',
                                margin: '0 0 10px',
                            }}
                        >
                            <strong>{reference}</strong> names only part of a verse. The complete{' '}
                            <strong>{result.lookupReference}</strong> was fetched instead — read it
                            over and trim it to the part you mean before saving.
                        </p>
                    )}

                    {SCRIPTURE_FIELDS.map((field) => {
                        const fetched = result.texts?.[field]
                        const error = result.errors?.[field]
                        const current = existing[field]?.trim()
                        const version = BIBLE_VERSIONS[field]

                        return (
                            <div
                                key={field}
                                style={{
                                    borderTop: '1px solid rgba(128,128,128,0.25)',
                                    padding: '10px 0',
                                }}
                            >
                                <label
                                    style={{
                                        display: 'flex',
                                        gap: 8,
                                        alignItems: 'flex-start',
                                        cursor: fetched ? 'pointer' : 'default',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        disabled={!fetched}
                                        checked={Boolean(selected[field] && fetched)}
                                        onChange={(event) => toggle(field, event.currentTarget.checked)}
                                        // Sanity UI resets every input to appearance: none.
                                        style={{marginTop: 4, appearance: 'auto'}}
                                    />
                                    <span>
                                        <strong>{field}</strong>{' '}
                                        <span style={{opacity: 0.6}}>({version.label})</span>
                                        {current && (
                                            <span style={{color: '#b70', marginLeft: 6}}>
                                                already has text — ticking this replaces it
                                            </span>
                                        )}
                                    </span>
                                </label>

                                {fetched ? (
                                    <p style={{margin: '6px 0 0 26px'}}>{fetched}</p>
                                ) : (
                                    <p style={{margin: '6px 0 0 26px', color: '#c33'}}>
                                        {error ?? 'Not available'}
                                    </p>
                                )}

                                {current && (
                                    <p
                                        style={{
                                            margin: '6px 0 0 26px',
                                            opacity: 0.6,
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        current: {current}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </>
            )}

            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                    marginTop: 14,
                }}
            >
                <button type="button" onClick={close}>
                    Cancel
                </button>
                <button type="button" onClick={apply} disabled={loading || chosenCount === 0}>
                    {chosenCount > 0
                        ? `Fill ${chosenCount} field${chosenCount > 1 ? 's' : ''}`
                        : 'Nothing selected'}
                </button>
            </div>
        </div>
    )
}
