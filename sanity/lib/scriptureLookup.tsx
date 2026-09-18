import React, {useCallback, useState} from 'react'
import type {SanityDocument} from 'sanity'
import {useDocumentOperation} from 'sanity'
import {BIBLE_VERSIONS, SCRIPTURE_API_URL, SCRIPTURE_FIELDS, type ScriptureField} from './bibleVersions'

export type ArtworkDoc = SanityDocument & {
    bibleReference?: string
    scripture?: Partial<Record<ScriptureField, string>>
}

export type ScriptureTexts = Partial<Record<ScriptureField, string>>

export type LookupResult = {
    canonical?: string
    /** What was looked up; differs from the reference when it names part of a verse. */
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
}: {
    docId: string
    docType: string
    reference: string
    existing: ScriptureTexts
    /** The document action uses this to dismiss its menu; the field does not need it. */
    onClosed?: () => void
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
    }, [existing, reference])

    const apply = useCallback(() => {
        const set: Record<string, string> = {}
        for (const field of SCRIPTURE_FIELDS) {
            const fetched = result?.texts?.[field]
            if (fetched && selected[field]) set[`scripture.${field}`] = fetched
        }

        if (Object.keys(set).length === 0) {
            close()
            return
        }

        // Patch through the document operation rather than the client so the
        // open form updates immediately and the change lands in the draft for
        // review, instead of being written straight to the published document.
        patch.execute([{setIfMissing: {scripture: {_type: 'localeText'}}}, {set}])
        close()
    }, [close, patch, result, selected])

    const toggle = useCallback((field: ScriptureField, checked: boolean) => {
        setSelected((previous) => ({...previous, [field]: checked}))
    }, [])

    const chosenCount = SCRIPTURE_FIELDS.filter(
        (field) => selected[field] && result?.texts?.[field],
    ).length

    return {open, loading, result, selected, chosenCount, toggle, lookup, apply, close}
}

/**
 * The review step: what came back, which languages are ticked, and what each
 * would replace. Chrome-free so the document action can hand it to Sanity's
 * dialog and the field can render it in place. Inline styles rather than
 * `@sanity/ui`, which is not a dependency here — see SelectionCriteriaInput.
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
                        A reference needs a real book, chapter and verse. Correct the Bible
                        Reference field, then fetch again.
                    </p>
                </div>
            )}

            {result && !result.error && !result.invalid && (
                <>
                    <p style={{marginTop: 0, opacity: 0.75}}>
                        Resolved as <strong>{result.canonical}</strong>
                        {result.verseCount ? ` · ${result.verseCount} verse(s)` : ''}
                    </p>

                    {result.lookupReference && result.lookupReference !== reference && (
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
                                        style={{marginTop: 4}}
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
