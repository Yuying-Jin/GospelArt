import React, {useMemo} from 'react'
import {getPublishedId, useFormValue, type ObjectInputProps} from 'sanity'
import {
    ScriptureLookupBody,
    useScriptureLookup,
    type ScriptureTexts,
} from '../../lib/scriptureLookup'

/**
 * The Scripture field with its own Fetch button, so filling it in is offered
 * where the work happens rather than only in the action menu beside Publish.
 * The same lookup is still reachable from `FetchScriptureAction`; see
 * `lib/scriptureLookup.tsx` for what it does.
 *
 * The review step renders in place above the language fields instead of in a
 * dialog, so each candidate sits directly above the field it would land in,
 * which is what a reader compares.
 *
 * It fetches for the reference in the field named by `options.referenceField`,
 * `bibleReference` unless set, and writes into whichever field it is on.
 */
export function ScriptureInput(props: ObjectInputProps) {
    const rawId = useFormValue(['_id']) as string | undefined
    const docType = useFormValue(['_type']) as string | undefined

    // `useDocumentOperation` will not take a `drafts.`-prefixed id, which is
    // what the form holds while a document is unpublished. The button lives in
    // a child so the hook is never called without an id to patch.
    const docId = rawId ? getPublishedId(rawId) : ''

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
            {docId && docType && (
                <FetchScriptureButton
                    docId={docId}
                    docType={docType}
                    value={props.value}
                    scriptureField={String(props.path[props.path.length - 1])}
                    referenceField={
                        (props.schemaType.options as {referenceField?: string} | undefined)?.referenceField ??
                        'bibleReference'
                    }
                />
            )}
            {props.renderDefault(props)}
        </div>
    )
}

function FetchScriptureButton({
    docId,
    docType,
    value,
    scriptureField,
    referenceField,
}: {
    docId: string
    docType: string
    value: ObjectInputProps['value']
    scriptureField: string
    referenceField: string
}) {
    const reference = ((useFormValue([referenceField]) as string | undefined) ?? '').trim()
    const existing = useMemo(() => (value ?? {}) as ScriptureTexts, [value])

    const controller = useScriptureLookup({docId, docType, reference, existing, scriptureField, referenceField})

    return (
        <>
            <div>
                <button
                    type="button"
                    onClick={controller.lookup}
                    disabled={!reference || controller.loading}
                    title={
                        reference
                            ? `Look up ${reference} in 和合本 and the ESV`
                            : 'Add a Bible Reference first'
                    }
                    style={{
                        fontSize: 13,
                        padding: '6px 12px',
                        cursor: reference ? 'pointer' : 'default',
                    }}
                >
                    {controller.loading
                        ? 'Looking up…'
                        : reference
                          ? `Fetch from ${reference}`
                          : 'Fetch scripture'}
                </button>

                {!reference && (
                    <span style={{fontSize: 12, opacity: 0.6, marginLeft: 8}}>
                        Add a Bible Reference first
                    </span>
                )}
            </div>

            {controller.open && (
                <div
                    style={{
                        border: '1px solid rgba(128,128,128,0.3)',
                        borderRadius: 4,
                        padding: '10px 12px',
                    }}
                >
                    <ScriptureLookupBody
                        controller={controller}
                        reference={reference}
                        existing={existing}
                    />
                </div>
            )}
        </>
    )
}
