import {createClient} from 'next-sanity'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

/** Pinned so a future API change cannot alter query results silently. */
export const apiVersion = '2025-02-19'

/**
 * The gallery is public content, so published reads need no token: a public
 * dataset plus the `published` perspective is enough, and nothing secret has to
 * reach the browser. A token is only required later for draft previews, which
 * is why this returns a plain client rather than baking one in.
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
