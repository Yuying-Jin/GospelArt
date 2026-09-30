import React, {type CSSProperties, type ReactNode} from 'react'

/**
 * Preview of `--color-highlight` / `--color-highlight-text`: Sanity's Yellow
 * 800 behind the light gold `--color-gold-secondary`. Keep in sync with `styles/variables.css`.
 */
const HIGHLIGHT_COLORS = {background: '#3b220c', color: '#ffe687'}

/**
 * `--card-fg-color` too: the editor colours text through that variable, which
 * would otherwise win over an inherited `color`.
 */
const HIGHLIGHT_PREVIEW: CSSProperties = {
    ...HIGHLIGHT_COLORS,
    ['--card-fg-color' as string]: HIGHLIGHT_COLORS.color,
    padding: '1px 3px',
    borderRadius: 2,
}

/**
 * Toolbar icons as letters in one fixed box, so every mark button is the same
 * size and none of them changes the toolbar's height.
 */
function letterIcon(letter: string, style: CSSProperties = {}) {
    return function LetterIcon() {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.25em',
                    height: '1.25em',
                    lineHeight: 1,
                    fontWeight: 700,
                    borderRadius: 2,
                    ...style,
                }}
            >
                {letter}
            </span>
        )
    }
}

export const BoldIcon = letterIcon('B')
// Regular weight and a touch smaller, so only B reads as bold.
const PLAIN = {fontWeight: 400, fontSize: '0.9em'}

export const ItalicIcon = letterIcon('I', {...PLAIN, fontStyle: 'italic', fontFamily: 'Georgia, serif'})
export const UnderlineIcon = letterIcon('U', {...PLAIN, textDecoration: 'underline'})
export const StrikeIcon = letterIcon('S', {...PLAIN, textDecoration: 'line-through'})
export const HighlightIcon = letterIcon('H', {...PLAIN, ...HIGHLIGHT_COLORS})

export function HighlightDecorator({children}: {children?: ReactNode}) {
    return <span style={HIGHLIGHT_PREVIEW}>{children}</span>
}
