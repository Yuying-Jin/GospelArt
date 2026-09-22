import {NextResponse, type NextRequest} from 'next/server'
import {assertCreatorPatch, DraftAccessError, newDraftId} from '@/lib/submissions/draftAccess'
import {claimDraft, listOwnedDraftIds} from '@/lib/submissions/ownership'
import {getSubmissionsClient} from '@/lib/submissions/submissionsClient'
import {getSubmissionsSession} from '@/lib/submissions/session'
import {rateLimit} from '@/lib/rateLimit'

/**
 * A contributor's own submissions. There is no publish route here and there
 * must never be one: this API's token can publish, so the absence of a path
 * to it is the whole guarantee. `draftAccess.test.ts` fails on a publish call
 * in anything that imports the client.
 *
 * Which drafts belong to the caller is answered by `ownership.ts`, not by a
 * field on the artwork — see the note there on blind review.
 */

/** Published rows stay in the list, so a contributor can see what was approved. */
const BY_IDS = `*[_type == "artwork" && (_id in $ids || _id in $publishedIds)] {
    _id,
    _updatedAt,
    bibleReference,
    date,
    "hasImage": defined(image.asset)
}`

type Row = {
    _id: string
    _updatedAt: string
    bibleReference?: string
    date?: string
    hasImage: boolean
}

const DRAFT_PREFIX = 'drafts.'
const baseId = (id: string) => (id.startsWith(DRAFT_PREFIX) ? id.slice(DRAFT_PREFIX.length) : id)

/**
 * Publishing replaces `drafts.X` with `X`, and editing an approved artwork
 * brings the draft back alongside it, so one submission can arrive as two
 * rows. Collapse them and let the pair say where the submission stands.
 */
function toSubmissions(rows: Row[]) {
    const grouped = new Map<string, {draft?: Row; published?: Row}>()

    for (const row of rows) {
        const key = baseId(row._id)
        const entry = grouped.get(key) ?? {}
        if (row._id.startsWith(DRAFT_PREFIX)) entry.draft = row
        else entry.published = row
        grouped.set(key, entry)
    }

    return [...grouped.entries()]
        .map(([id, {draft, published}]) => {
            const latest = draft ?? published
            return {
                id,
                draftId: draft?._id ?? null,
                status: published ? (draft ? 'approved-with-edits' : 'approved') : 'pending',
                updatedAt: latest?._updatedAt ?? null,
                bibleReference: latest?.bibleReference ?? '',
                date: latest?.date ?? '',
                hasImage: latest?.hasImage ?? false,
            }
        })
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

export async function GET(request: NextRequest) {
    const session = await getSubmissionsSession(request)
    if (!session) return NextResponse.json({error: 'Not signed in'}, {status: 401})

    const ids = await listOwnedDraftIds(session.userId)
    if (ids.length === 0) return NextResponse.json({submissions: []})

    // An approved submission is no longer a draft, so ask for both forms.
    const rows = await getSubmissionsClient().fetch<Row[]>(BY_IDS, {
        ids,
        publishedIds: ids.map(baseId),
    })

    return NextResponse.json({submissions: toSubmissions(rows)})
}

export async function POST(request: NextRequest) {
    const session = await getSubmissionsSession(request)
    if (!session) return NextResponse.json({error: 'Not signed in'}, {status: 401})

    const limit = rateLimit(`submissions:${session.userId}`, 30, 60_000)
    if (!limit.allowed) {
        return NextResponse.json(
            {error: 'Too many requests'},
            {status: 429, headers: {'Retry-After': String(limit.retryAfterSeconds)}},
        )
    }

    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({error: 'Body is not JSON'}, {status: 400})
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({error: 'Body must be an object'}, {status: 400})
    }

    try {
        assertCreatorPatch(body)
    } catch (error) {
        if (error instanceof DraftAccessError) {
            return NextResponse.json({error: 'Field is not editable'}, {status: 400})
        }
        throw error
    }

    // The id comes from here, never from the body, and is owned before it exists.
    const _id = newDraftId()
    await claimDraft(_id, session.userId)
    await getSubmissionsClient().create({...body, _id, _type: 'artwork'})

    return NextResponse.json({draftId: _id}, {status: 201})
}
