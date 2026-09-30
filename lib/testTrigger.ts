/**
 * Typing `test!` into a form's email field plays the form's interface, the
 * sending state and then its result, without calling the service behind it,
 * so a dialog or message can be checked by hand on any deployment.
 * `test!` alone is the success outcome; `test!<outcome>` picks another, such
 * as `test!rate_limited`. An outcome the form does not know falls back to
 * success.
 */

export const TEST_TRIGGER = 'test!'

/** The outcome a test entry asks for, or null when `value` is a real entry. */
export function testOutcome<T extends string>(value: string, outcomes: readonly T[], success: T): T | null {
    const entry = value.trim()
    if (!entry.toLowerCase().startsWith(TEST_TRIGGER)) return null
    const named = entry.slice(TEST_TRIGGER.length)
    return outcomes.includes(named as T) ? (named as T) : success
}

/**
 * Lets a test entry past the browser's own checks (`required`,
 * `type="email"`), which would stop the submit before the form's handler
 * sees it. Call it from the field's input handler; real entries keep them.
 */
export function allowTestEntry(input: HTMLInputElement): void {
    if (input.form) input.form.noValidate = input.value.trim().toLowerCase().startsWith(TEST_TRIGGER)
}

/** Long enough that a test run shows the sending state, as a real request would. */
export function simulatedRequest(ms = 700): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
