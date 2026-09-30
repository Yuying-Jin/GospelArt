import {ARTWORK_LIMITS, lengthProblem} from '../fieldLimits.ts'

/**
 * The Studio's length limits, applied to what a creator sends. The Studio only
 * enforces them while typing, and this API writes around it. Unlike an
 * authorization refusal the message names the field: it is the creator's own
 * input, so there is nothing to probe.
 */
export class FieldLengthError extends Error {
    readonly field: string

    constructor(field: string, message: string) {
        super(message)
        this.name = 'FieldLengthError'
        this.field = field
    }
}

const CHECKS: Record<string, (value: unknown) => string | null> = {
    bibleReference: (value) => lengthProblem(value, ARTWORK_LIMITS.bibleReference),
    scripture: (value) => lengthProblem(value, ARTWORK_LIMITS.scripture),
    artworkSubject: (value) => lengthProblem(value, ARTWORK_LIMITS.artworkSubject),
    sections: (value) => {
        if (!Array.isArray(value)) return null
        for (const section of value) {
            const problem = lengthProblem((section as {body?: unknown} | null)?.body, ARTWORK_LIMITS.sectionBody)
            if (problem) return problem
        }
        return null
    },
}

/** Throws on the first field over its limit. Run after `assertCreatorPatch`. */
export function assertCreatorLengths(patch: Record<string, unknown>): void {
    for (const [field, value] of Object.entries(patch)) {
        const problem = CHECKS[field]?.(value)
        if (problem) throw new FieldLengthError(field, problem)
    }
}
