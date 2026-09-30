import {NextResponse, type NextRequest} from 'next/server'
import {
    assertCreatorPatch,
    authorizeDraftAccess,
    DraftAccessError,
} from '@/lib/submissions/draftAccess'
import {assertCreatorLengths, FieldLengthError} from '@/lib/submissions/fieldLengths'
import {loadDraftOwner} from '@/lib/submissions/ownership'
import {getSubmissionsClient} from '@/lib/submissions/submissionsClient'
import {getSubmissionsSession} from '@/lib/submissions/session'
import {rateLimit} from '@/lib/rateLimit'

const DRAFT = `*[_id == $draftId][0]{
    _id,
    _updatedAt,
    image,
    bibleReference,
    scripture,
    date,
    artworkSubject,
    "bibleThemes": bibleThemes[]._ref,
    "spiritualThemes": spiritualThemes[]._ref,
    sections
}`

/** Refusals are 404 with one message, so the API cannot be used to probe ids. */
function notFound(error: DraftAccessError) {
    console.warn('[submissions] refused draft access:', error.reason)
    return NextResponse.json({error: error.message}, {status: 404})
}

export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
    const session = await getSubmissionsSession(request)
    if (!session) return NextResponse.json({error: 'Not signed in'}, {status: 401})

    const {id} = await params

    let draftId: string
    try {
        draftId = await authorizeDraftAccess(session.userId, id, loadDraftOwner)
    } catch (error) {
        if (error instanceof DraftAccessError) return notFound(error)
        throw error
    }

    return NextResponse.json({draft: await getSubmissionsClient().fetch(DRAFT, {draftId})})
}

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
    const session = await getSubmissionsSession(request)
    if (!session) return NextResponse.json({error: 'Not signed in'}, {status: 401})

    const limit = rateLimit(`submissions:${session.userId}`, 30, 60_000)
    if (!limit.allowed) {
        return NextResponse.json(
            {error: 'Too many requests'},
            {status: 429, headers: {'Retry-After': String(limit.retryAfterSeconds)}},
        )
    }

    const {id} = await params

    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({error: 'Body is not JSON'}, {status: 400})
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({error: 'Body must be an object'}, {status: 400})
    }

    // Ownership first: a forbidden field must not reveal whose draft this is.
    let draftId: string
    try {
        draftId = await authorizeDraftAccess(session.userId, id, loadDraftOwner)
    } catch (error) {
        if (error instanceof DraftAccessError) return notFound(error)
        throw error
    }

    try {
        assertCreatorPatch(body)
        assertCreatorLengths(body)
    } catch (error) {
        if (error instanceof DraftAccessError) {
            return NextResponse.json({error: 'Field is not editable'}, {status: 400})
        }
        if (error instanceof FieldLengthError) {
            return NextResponse.json({error: 'Too long', field: error.field, message: error.message}, {status: 400})
        }
        throw error
    }

    // set() only: no unset, no arbitrary patch operations from the client.
    await getSubmissionsClient().patch(draftId).set(body).commit()

    return NextResponse.json({draftId})
}
