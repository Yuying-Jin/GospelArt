import React from 'react'
import {useFormValue} from 'sanity'
import {
    computeSelectionCriteria,
    PASSING_CREATIVITY,
    PASSING_QUALITY,
    PASSING_REPETITION,
} from '../../lib/selectionCriteria'

/**
 * Read-only display for Selection Criteria. The field stores nothing: the
 * value is derived from the three curation scores here and in GROQ, and this
 * only mirrors that back to the editor with the deciding score.
 *
 * Inline styles rather than `@sanity/ui`, to avoid the extra import.
 */
export function SelectionCriteriaInput() {
    const repetition = useFormValue(['repetition']) as string | undefined
    const quality = useFormValue(['quality']) as string | undefined
    const creativity = useFormValue(['creativity']) as string | undefined

    const result = computeSelectionCriteria({repetition, quality, creativity})
    const passes = result === 'Y'

    const checks: {label: string; value?: string; ok: boolean; wants: string[]}[] = [
        {label: 'Repetition', value: repetition, ok: PASSING_REPETITION.includes(String(repetition ?? '')), wants: PASSING_REPETITION},
        {label: 'Quality', value: quality, ok: PASSING_QUALITY.includes(String(quality ?? '')), wants: PASSING_QUALITY},
        {label: 'Creativity', value: creativity, ok: PASSING_CREATIVITY.includes(String(creativity ?? '')), wants: PASSING_CREATIVITY},
    ]

    return (
        <div
            style={{
                border: '1px solid rgba(128,128,128,0.3)',
                borderRadius: 4,
                padding: '10px 12px',
                fontSize: 13,
                lineHeight: 1.5,
            }}
        >
            <strong style={{color: passes ? '#2a7' : '#a55'}}>
                {passes ? 'Y — meets the selection criteria' : 'N — does not meet the selection criteria'}
            </strong>
            <ul style={{margin: '8px 0 0', paddingLeft: 18}}>
                {checks.map((check) => (
                    <li key={check.label} style={{opacity: check.ok ? 0.65 : 1}}>
                        {check.ok ? '✓' : '✗'} {check.label}: {check.value || '—'}{' '}
                        <span style={{opacity: 0.6}}>(needs {check.wants.join(' or ')})</span>
                    </li>
                ))}
            </ul>
            <p style={{margin: '8px 0 0', opacity: 0.6}}>
                Calculated from the three scores above. Use Gallery Visibility to override it.
            </p>
        </div>
    )
}
