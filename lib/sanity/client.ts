import {createClient} from 'next-sanity'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

/** Pinned so a future API change cannot alter query results silently. */
export const apiVersion = '2025-02-19'

/**
 * Public dataset plus the `published` perspective needs no token; one would
 * only be required for draft previews.
 */
export const isSanityConfigured = Boolean(projectId && dataset)

let cachedClient: ReturnType<typeof createClient> | null = null

export function getSanityClient() {
    if (!projectId || !dataset) return null

    if (!cachedClient) {
        cachedClient = createClient({
            projectId,
            dataset,
            apiVersion,
            // The live API, not the CDN: Next caches every read itself and asks
            // again only when the publish webhook clears a tag. That happens the
            // moment Sanity commits the edit, before the CDN has it, so a CDN read
            // would re-cache the old content until the next publish.
            useCdn: false,
            perspective: 'published',
        })
    }

    return cachedClient
}

let cachedPreviewClient: ReturnType<typeof createClient> | null = null

/**
 * Drafts are private even on a public dataset, so the Studio's news preview
 * reads them with a Viewer token. Server-side only; null without the token.
 */
export function getPreviewClient() {
    const token = process.env.SANITY_API_READ_TOKEN
    if (!projectId || !dataset || !token) return null

    if (!cachedPreviewClient) {
        cachedPreviewClient = createClient({
            projectId,
            dataset,
            apiVersion,
            token,
            useCdn: false,
            perspective: 'drafts',
        })
    }

    return cachedPreviewClient
}
