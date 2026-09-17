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
            useCdn: true,
            perspective: 'published',
        })
    }

    return cachedClient
}
