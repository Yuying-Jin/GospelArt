import React, {useEffect} from 'react'
import {
    getPublishedId,
    set,
    unset,
    useClient,
    useEditState,
    useFormValue,
    type SanityClient,
    type SanityDocument,
    type SlugInputProps,
} from 'sanity'

type AutoSlugOptions = {
    /** The slug before de-duplication, or '' while its sources are incomplete. */
    build: (doc: SanityDocument) => string
    isTaken: (client: SanityClient, slug: string, publishedId: string) => Promise<boolean>
    /** Shown while `build` returns ''. */
    waitingHint: string
    /** Shown once the published document has a slug. */
    frozenHint: string
}

const API_VERSION = '2025-02-19'
const DEBOUNCE_MS = 500

/**
 * A slug field that fills itself in from other fields, with no Generate button
 * and no typing. It follows its sources until the document is first published
 * with a slug, then stops: from then on the address may have been shared.
 * Collisions get `-2`, `-3`, as the importer does.
 */
export function autoSlugInput(options: AutoSlugOptions) {
    return function AutoSlugInput(props: SlugInputProps) {
        const {value, onChange} = props
        const doc = useFormValue([]) as SanityDocument
        const publishedId = getPublishedId(doc._id)
        const {published} = useEditState(publishedId, doc._type)
        const client = useClient({apiVersion: API_VERSION})

        const frozen = Boolean((published?.slug as {current?: string} | undefined)?.current)
        const base = options.build(doc)
        const current = value?.current

        useEffect(() => {
            if (frozen) return
            if (!base) {
                if (current) onChange(unset())
                return
            }

            let cancelled = false
            const timer = setTimeout(async () => {
                let candidate = base
                for (let suffix = 2; await options.isTaken(client, candidate, publishedId); suffix++) {
                    if (cancelled) return
                    candidate = `${base}-${suffix}`
                }
                if (!cancelled && candidate !== current) {
                    onChange(set({_type: 'slug', current: candidate}))
                }
            }, DEBOUNCE_MS)

            return () => {
                cancelled = true
                clearTimeout(timer)
            }
        }, [base, client, current, frozen, onChange, publishedId])

        const hint = frozen ? options.frozenHint : base ? null : options.waitingHint

        return (
            <div style={{fontSize: 13, lineHeight: 1.5}}>
                <code
                    style={{
                        display: 'block',
                        padding: '8px 10px',
                        border: '1px solid rgba(128,128,128,0.3)',
                        borderRadius: 4,
                        opacity: current ? 1 : 0.5,
                    }}
                >
                    {current || '—'}
                </code>
                {hint && <p style={{margin: '6px 0 0', opacity: 0.7}}>{hint}</p>}
            </div>
        )
    }
}
