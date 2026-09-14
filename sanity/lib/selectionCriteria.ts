/**
 * Selection Criteria is DERIVED, never stored.
 *
 * The source workbook documents the rule in its own column header:
 *   (Repetition = M or L) and (Quality = H or M) and (Creativity = H or M) -> Y, else N
 *
 * That formula was checked against the workbook's stored column and agrees on
 * all 302 artwork rows, so deriving it introduces no drift from the decisions
 * the ministry already made. Because nothing is written down, the three scores
 * are the single source of truth and the value can never fall out of sync.
 *
 * `SELECTION_CRITERIA_GROQ` is the same rule expressed in GROQ; it is shared by
 * the Studio's structure lists and the app's gallery query (which keeps its own
 * copy in `lib/sanity/queries.ts` — keep them in sync).
 */

export const PASSING_REPETITION = ['M', 'L']
export const PASSING_QUALITY = ['H', 'M']
export const PASSING_CREATIVITY = ['H', 'M']

export function computeSelectionCriteria(scores: {
    repetition?: string
    quality?: string
    creativity?: string
}): 'Y' | 'N' {
    const passes =
        PASSING_REPETITION.includes(String(scores.repetition ?? '')) &&
        PASSING_QUALITY.includes(String(scores.quality ?? '')) &&
        PASSING_CREATIVITY.includes(String(scores.creativity ?? ''))
    return passes ? 'Y' : 'N'
}

/** True when the three curation scores satisfy the criteria. */
export const SELECTION_CRITERIA_GROQ =
    'repetition in ["M", "L"] && quality in ["H", "M"] && creativity in ["H", "M"]'

/**
 * What the public gallery shows: the computed criteria, overridable in both
 * directions by `galleryVisibility`. A missing `galleryVisibility` is treated
 * as "auto" so documents created before the field existed still behave.
 */
export const GALLERY_VISIBILITY_GROQ = `(
    galleryVisibility == "always" ||
    ((!defined(galleryVisibility) || galleryVisibility == "auto") && ${SELECTION_CRITERIA_GROQ})
)`
