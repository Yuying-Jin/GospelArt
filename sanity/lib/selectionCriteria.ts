/**
 * Selection Criteria is derived, never stored, so the three scores stay the
 * single source of truth:
 *   (Repetition = M or L) and (Quality = H or M) and (Creativity = H or M)
 *
 * The workbook documents this rule in its own column header and the two agree
 * on all 302 rows. `lib/sanity/queries.ts` keeps a GROQ copy — keep in sync.
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
 * The criteria, overridable in both directions by `galleryVisibility`. A
 * missing value counts as "auto" so older documents still behave.
 */
export const GALLERY_VISIBILITY_GROQ = `(
    galleryVisibility == "always" ||
    ((!defined(galleryVisibility) || galleryVisibility == "auto") && ${SELECTION_CRITERIA_GROQ})
)`
