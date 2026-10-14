import React, {useState} from 'react'
import {Button, Flex} from '@sanity/ui'
import {
    getPublishedId,
    set,
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
    /** Shown when the sources have changed since the slug was generated. */
    staleHint: string
    /** Shown once the published document has a slug. */
    frozenHint: string
}

const API_VERSION = '2025-02-19'

/** `base` itself, or `base` with the `-2`, `-3` collision suffix. */
const isBuiltFrom = (slug: string, base: string) =>
    slug === base || (slug.startsWith(`${base}-`) && /^\d+$/.test(slug.slice(base.length + 1)))

/**
 * A slug field built from other fields by its Generate button, never typed
 * into, so a slip while editing those fields cannot change the address. It can
 * be regenerated until the document is first published with a slug; from then
 * on the address may have been shared. Collisions get `-2`, `-3`, as the
 * importer does.
 */
export function autoSlugInput(options: AutoSlugOptions) {
    return function AutoSlugInput(props: SlugInputProps) {
        const {value, onChange, readOnly} = props
        const doc = useFormValue([]) as SanityDocument
        const publishedId = getPublishedId(doc._id)
        const {published} = useEditState(publishedId, doc._type)
        const client = useClient({apiVersion: API_VERSION})
        const [busy, setBusy] = useState(false)

        const frozen = Boolean((published?.slug as {current?: string} | undefined)?.current)
        const base = options.build(doc)
        const current = value?.current
        const upToDate = Boolean(current && base && isBuiltFrom(current, base))

        const generate = async () => {
            setBusy(true)
            try {
                let candidate = base
                for (let suffix = 2; await options.isTaken(client, candidate, publishedId); suffix++) {
                    candidate = `${base}-${suffix}`
                }
                if (candidate !== current) onChange(set({_type: 'slug', current: candidate}))
            } finally {
                setBusy(false)
            }
        }

        const hint = frozen
            ? options.frozenHint
            : !base
              ? options.waitingHint
              : current && !upToDate
                ? options.staleHint
                : null

        return (
            <div style={{fontSize: 13, lineHeight: 1.5}}>
                <Flex gap={2} align="center">
                    <code
                        style={{
                            display: 'block',
                            flex: 1,
                            minWidth: 0,
                            overflowWrap: 'anywhere',
                            padding: '8px 10px',
                            border: '1px solid rgba(128,128,128,0.3)',
                            borderRadius: 4,
                            opacity: current ? 1 : 0.5,
                        }}
                    >
                        {current || '—'}
                    </code>
                    {!frozen && (
                        <Button
                            text={current ? 'Regenerate' : 'Generate'}
                            mode="ghost"
                            onClick={generate}
                            loading={busy}
                            disabled={readOnly || busy || !base || upToDate}
                        />
                    )}
                </Flex>
                {hint && <p style={{margin: '6px 0 0', opacity: 0.7}}>{hint}</p>}
            </div>
        )
    }
}
