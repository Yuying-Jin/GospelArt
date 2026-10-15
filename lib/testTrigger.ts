/**
 * Typing `test!` into a form's email field, or its name field where it has
 * one, plays the form's interface, the sending state and then its result,
 * without calling the service behind it, so a dialog or message can be
 * checked by hand on any deployment. `test!` alone is the success outcome;
 * `test!<outcome>` picks another, such as `test!rate_limited`. An outcome the
 * form does not know falls back to success. A Chinese keyboard's full-width
 * `！` counts as `!`.
 */

export const TEST_TRIGGER = 'test!'

/** The entry with a full-width `！` read as `!`, trimmed. */
function normalized(value: string): string {
    return value.trim().replace(/！/g, '!')
}

function isTestEntry(value: string): boolean {
    return normalized(value).toLowerCase().startsWith(TEST_TRIGGER)
}

/**
 * The outcome a test entry asks for, or null when every value is a real
 * entry. Given several fields, the first test entry among them decides.
 */
export function testOutcome<T extends string>(value: string | string[], outcomes: readonly T[], success: T): T | null {
    const entry = (Array.isArray(value) ? value : [value]).map(normalized).find(isTestEntry)
    if (entry === undefined) return null
    const named = entry.slice(TEST_TRIGGER.length)
    return outcomes.includes(named as T) ? (named as T) : success
}

/**
 * Lets a test entry past the browser's own checks (`required`,
 * `type="email"`), which would stop the submit before the form's handler
 * sees it. Call it from each trigger field's input handler: the checks are
 * off while any of the form's fields holds a test entry, on otherwise.
 */
export function allowTestEntry(input: HTMLInputElement): void {
    const form = input.form
    if (!form) return
    form.noValidate = Array.from(form.elements).some(
        (field) => field instanceof HTMLInputElement && isTestEntry(field.value),
    )
}

/** Long enough that a test run shows the sending state, as a real request would. */
export function simulatedRequest(ms = 700): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
