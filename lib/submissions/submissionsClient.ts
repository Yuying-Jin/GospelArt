import {createClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '@/lib/sanity/client'

/**
 * The submissions API's Sanity client. Separate from the site's read client on every
 * axis that matters: it carries a token, it must not use the CDN, and it
 * reads the `raw` perspective so `drafts.*` documents are addressable. The
 * site's client stays tokenless on `published`.
 *
 * Its own token rather than SANITY_API_MIGRATION_TOKEN, which CLAUDE.md reserves
 * for the migration scripts: different surface, different lifetime, rotated
 * on its own.
 *
 * The token is an Editor token — the lowest write role the plan sells, and it
 * can publish. `lib/submissions/draftAccess.ts` is what keeps that out of reach.
 *
 * `server-only` is not installed, but the variable has no NEXT_PUBLIC_ prefix,
 * so in a client bundle it is undefined and this throws rather than shipping
 * a tokenless client that silently fails.
 */
let cached: ReturnType<typeof createClient> | null = null

export function getSubmissionsClient() {
    const token = process.env.SANITY_API_SUBMISSIONS_TOKEN
    if (!projectId || !dataset) throw new Error('Sanity project id or dataset is not configured')
    if (!token) throw new Error('SANITY_API_SUBMISSIONS_TOKEN is not set')

    if (!cached) {
        cached = createClient({
            projectId,
            dataset,
            apiVersion,
            token,
            useCdn: false,
            perspective: 'raw',
        })
    }

    return cached
}
