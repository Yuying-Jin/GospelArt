import React, {useCallback, useMemo, useState} from 'react'
import type {DocumentActionComponent, SanityDocument} from 'sanity'
import {useDocumentOperation} from 'sanity'
import {
    BIBLE_VERSIONS,
    SCRIPTURE_API_URL,
    SCRIPTURE_FIELDS,
    type ScriptureField,
} from '../lib/bibleVersions'

type ArtworkDoc = SanityDocument & {
    bibleReference?: string
    scripture?: Partial<Record<ScriptureField, string>>
}

type LookupResult = {
    canonical?: string
    verseCount?: number
    texts?: Partial<Record<ScriptureField, string>>
    errors?: Partial<Record<ScriptureField, string>>
    error?: string
}

/**
 * Fills the three scripture fields from an actual Bible translation, keyed off
 * the artwork's Bible Reference.
 *
 * No machine translation is involved: each language comes from a real published
 * translation (和合本 for Chinese, ESV for English) via the app's
 * /api/scripture proxy — see sanity/lib/bibleVersions.ts for why the proxy
 * exists rather than calling the providers directly.
 *
 * Nothing is overwritten silently. A language that already has text is listed
 * with its current value and its checkbox cleared, so a careless click can only
 * ever fill blanks. The fields stay ordinary editable text afterwards; this
 * writes values, it does not take ownership of them.
 */
export const FetchScriptureAction: DocumentActionComponent = (props) => {
    const {id, type, draft, published, onComplete} = props
    const {patch} = useDocumentOperation(id, type)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<LookupResult | null>(null)
    const [selected, setSelected] = useState<Record<string, boolean>>({})

    const doc = (draft ?? published) as ArtworkDoc | null
    const reference = doc?.bibleReference?.trim() ?? ''
    const existing = useMemo(() => doc?.scripture ?? {}, [doc])

    const close = useCallback(() => {
        setDialogOpen(false)
        setResult(null)
        setLoading(false)
        onComplete()
    }, [onComplete])

    const lookup = useCallback(async () => {
        setDialogOpen(true)
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

    const chosenCount = SCRIPTURE_FIELDS.filter(
        (field) => selected[field] && result?.texts?.[field],
    ).length

    return {
        label: 'Fetch Scripture',
        disabled: !reference,
        title: reference
            ? `Look up ${reference} in 和合本 and the ESV`
            : 'Add a Bible Reference first',
        onHandle: lookup,
        dialog: dialogOpen && {
            type: 'dialog',
            header: `Fetch Scripture — ${reference}`,
            onClose: close,
            content: (
                <div style={{fontSize: 13, lineHeight: 1.6}}>
                    {loading && <p>Looking up {reference}…</p>}

                    {result?.error && <p style={{color: '#c33'}}>{result.error}</p>}

                    {result && !result.error && (
                        <>
                            <p style={{marginTop: 0, opacity: 0.75}}>
                                Resolved as <strong>{result.canonical}</strong>
                                {result.verseCount ? ` · ${result.verseCount} verse(s)` : ''}
                            </p>

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
                                                onChange={(event) =>
                                                    setSelected((previous) => ({
                                                        ...previous,
                                                        [field]: event.currentTarget.checked,
                                                    }))
                                                }
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
                        <button
                            type="button"
                            onClick={apply}
                            disabled={loading || chosenCount === 0}
                        >
                            {chosenCount > 0
                                ? `Fill ${chosenCount} field${chosenCount > 1 ? 's' : ''}`
                                : 'Nothing selected'}
                        </button>
                    </div>
                </div>
            ),
        },
    }
}
