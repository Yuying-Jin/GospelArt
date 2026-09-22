/**
 * The submissions API's half of authentication.
 *
 * Nothing implements it yet, and that is deliberate rather than pending:
 * creators are not Sanity users, so a session has to resolve against the
 * app's own user store, which does not exist. Until it does this returns
 * null and every submissions route answers 401. Closed is the right default for
 * the one surface that sits in front of a token that can publish.
 */
export type SubmissionsSession = {
    /** The app's own user id. Never a Sanity user id. */
    userId: string
}

export async function getSubmissionsSession(_request: Request): Promise<SubmissionsSession | null> {
    return null
}
