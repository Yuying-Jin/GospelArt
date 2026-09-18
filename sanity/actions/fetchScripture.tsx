import React, {useMemo} from 'react'
import type {DocumentActionComponent} from 'sanity'
import {
    ScriptureLookupBody,
    useScriptureLookup,
    type ArtworkDoc,
} from '../lib/scriptureLookup'

/**
 * The document-action way into the scripture lookup — see `scriptureLookup.tsx`
 * for what it does. Kept alongside the button inside the Scripture field
 * because the two suit different work: this one is for moving through the
 * "Missing scripture" queue a document at a time, where the action menu is
 * already under the cursor.
 *
 * `props.id` is the published id, so it needs no unwrapping.
 */
export const FetchScriptureAction: DocumentActionComponent = (props) => {
    const {id, type, draft, published, onComplete} = props

    const doc = (draft ?? published) as ArtworkDoc | null
    const reference = doc?.bibleReference?.trim() ?? ''
    const existing = useMemo(() => doc?.scripture ?? {}, [doc])

    const controller = useScriptureLookup({
        docId: id,
        docType: type,
        reference,
        existing,
        onClosed: onComplete,
    })

    return {
        label: 'Fetch Scripture',
        disabled: !reference,
        title: reference
            ? `Look up ${reference} in 和合本 and the ESV`
            : 'Add a Bible Reference first',
        onHandle: controller.lookup,
        dialog: controller.open && {
            type: 'dialog',
            header: `Fetch Scripture — ${reference}`,
            onClose: controller.close,
            content: (
                <ScriptureLookupBody
                    controller={controller}
                    reference={reference}
                    existing={existing}
                />
            ),
        },
    }
}
