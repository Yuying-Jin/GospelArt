import React, {useCallback, useMemo, useState} from 'react'
import type {DocumentActionComponent, SanityClient, SanityDocument} from 'sanity'
import {useClient} from 'sanity'
import {artworkSlugify} from '../lib/slugField'
import {isArtworkSlugTaken, isNewsSlugTaken} from '../lib/isUniqueSlug'
import {newsSlugify, newsSlugProblem} from '../lib/newsSlug'

type SluggedDoc = SanityDocument & {
    slug?: {current?: string}
    previousSlugs?: string[]
}

type ChangeUrlConfig = {
    label: string
    /** How the address reads, e.g. `?artwork=slug` or `/news/slug`. */
    address: (slug: string) => string
    slugify: (input: string) => string
    /** A format rule beyond slugify, or null when the value is fine. */
    invalid?: (slug: string) => string | null
    isTaken: (client: SanityClient, slug: string, publishedId: string) => Promise<boolean>
}

/**
 * The only way to change a URL once it is set: the slug field fills itself in
 * and stops at first publish. Moves the old slug into `previousSlugs` and
 * writes the new one in one transaction, so links shared earlier still resolve.
 *
 * Patches the draft as well as the published document, or publishing a pending
 * draft would silently restore the old slug.
 */
function createChangeUrlAction(config: ChangeUrlConfig): DocumentActionComponent {
    const ChangeUrl: DocumentActionComponent = (props) => {
        const {id, published, draft, onComplete} = props
        const client = useClient({apiVersion: '2025-02-19'})

        const [dialogOpen, setDialogOpen] = useState(false)
        const [nextSlug, setNextSlug] = useState('')
        const [error, setError] = useState<string | null>(null)
        const [busy, setBusy] = useState(false)

        const doc = (draft ?? published) as SluggedDoc | null
        const currentSlug = doc?.slug?.current ?? ''
        const archived = useMemo(() => doc?.previousSlugs ?? [], [doc])

        const close = useCallback(() => {
            setDialogOpen(false)
            setError(null)
            setBusy(false)
            onComplete()
        }, [onComplete])

        const submit = useCallback(async () => {
            const value = config.slugify(nextSlug)

            if (!value) {
                setError('Enter a new URL.')
                return
            }
            if (value === currentSlug) {
                setError('That is already the current URL.')
                return
            }
            const invalid = config.invalid?.(value)
            if (invalid) {
                setError(invalid)
                return
            }

            setBusy(true)
            setError(null)

            try {
                if (await config.isTaken(client, value, id)) {
                    setError('Another document already uses that URL, now or in the past.')
                    setBusy(false)
                    return
                }

                const previousSlugs = Array.from(new Set([...archived, currentSlug])).filter(
                    (slug) => slug && slug !== value,
                )

                const targets = [published?._id, draft?._id].filter(Boolean) as string[]
                const transaction = client.transaction()
                for (const target of targets) {
                    transaction.patch(target, {
                        set: {'slug.current': value, previousSlugs},
                    })
                }
                await transaction.commit()
                close()
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not change the URL.')
                setBusy(false)
            }
        }, [archived, client, close, currentSlug, draft, id, nextSlug, published])

        return {
            label: config.label,
            disabled: !currentSlug,
            title: currentSlug
                ? 'Change the address, keeping the old one working'
                : 'The URL is filled in automatically first',
            onHandle: () => {
                setNextSlug(currentSlug)
                setDialogOpen(true)
            },
            dialog: dialogOpen && {
                type: 'dialog',
                header: config.label,
                onClose: close,
                content: (
                    <div style={{fontSize: 13, lineHeight: 1.6}}>
                        <p style={{marginTop: 0}}>
                            Current address:{' '}
                            <code style={{background: 'rgba(128,128,128,0.15)', padding: '2px 5px'}}>
                                {config.address(currentSlug)}
                            </code>
                        </p>
                        <label htmlFor="next-slug" style={{display: 'block', marginBottom: 6}}>
                            New address
                        </label>
                        <input
                            id="next-slug"
                            value={nextSlug}
                            onChange={(event) => setNextSlug(event.currentTarget.value)}
                            disabled={busy}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                boxSizing: 'border-box',
                                fontFamily: 'monospace',
                            }}
                        />
                        <p style={{opacity: 0.7}}>
                            The old address is kept and will redirect here, so links already shared
                            keep working.
                        </p>
                        {archived.length > 0 && (
                            <p style={{opacity: 0.7}}>Already redirecting: {archived.join(', ')}</p>
                        )}
                        {error && <p style={{color: '#c33'}}>{error}</p>}
                        <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12}}>
                            <button type="button" onClick={close} disabled={busy}>
                                Cancel
                            </button>
                            <button type="button" onClick={submit} disabled={busy}>
                                {busy ? 'Saving…' : 'Change URL'}
                            </button>
                        </div>
                    </div>
                ),
            },
        }
    }
    return ChangeUrl
}

export const ChangeGalleryUrlAction = createChangeUrlAction({
    label: 'Change gallery URL',
    address: (slug) => `?artwork=${slug}`,
    slugify: artworkSlugify,
    isTaken: isArtworkSlugTaken,
})

export const ChangePageUrlAction = createChangeUrlAction({
    label: 'Change page URL',
    address: (slug) => `/news/${slug}`,
    slugify: newsSlugify,
    invalid: newsSlugProblem,
    isTaken: isNewsSlugTaken,
})
