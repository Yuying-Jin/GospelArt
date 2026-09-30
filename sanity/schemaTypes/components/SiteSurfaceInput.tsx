import React from 'react'
import type {ArrayOfPrimitivesInputProps} from 'sanity'

/**
 * Paints the rich-text editing area in the site's page colours
 * (`--color-bg-primary`, `--text-primary` in `styles/variables.css`), so text
 * and highlights read as they will on the site. It relies on Sanity's markup,
 * so recheck after a major upgrade.
 */
// Every Card around the editable element sets its own colours, so all of them
// are overridden; the toolbar's Card does not contain it and is left alone.
const CSS = `
.site-surface [data-ui="Card"]:has([data-pt-editor]),
.site-surface [data-pt-editor] {
    --card-bg-color: #121220 !important;
    --card-fg-color: #ffffff !important;
    background-color: #121220 !important;
    color: #ffffff !important;
}
/*
 * Insert buttons ("Image"): button > Box > Flex > [icon Text, Box > label Text].
 * Sanity's label is smaller than the letter icons, and the Flex does not
 * centre its items, so the label sits high. Only the label is resized; its
 * ::before/::after trims assume the default size, so text-box replaces them.
 */
.site-surface [data-testid$="-insert-menu-button"] [data-ui="Flex"] {
    align-items: center !important;
}
.site-surface [data-testid$="-insert-menu-button"] [data-ui="Box"] > [data-ui="Text"] {
    display: flex;
    align-items: center;
    line-height: 1 !important;
    /* Sanity shifts the label down (translateY) to offset the trims above. */
    transform: none !important;
}
.site-surface [data-testid$="-insert-menu-button"] [data-ui="Box"] > [data-ui="Text"]::before,
.site-surface [data-testid$="-insert-menu-button"] [data-ui="Box"] > [data-ui="Text"]::after {
    display: none !important;
}
.site-surface [data-testid$="-insert-menu-button"] [data-ui="Box"] > [data-ui="Text"] > span {
    font-size: 1.15em;
    line-height: 1;
    /* Box from cap height to baseline, as Sanity's own trims do; browsers
       without text-box fall back to the line box, a touch low. */
    text-box: trim-both cap alphabetic;
}
/* The trimmed box is shorter than the glyphs; Sanity clips the label for its
   ellipsis, which would cut off the tops and descenders. */
.site-surface [data-testid$="-insert-menu-button"] [data-ui="Box"]:has(> [data-ui="Text"]),
.site-surface [data-testid$="-insert-menu-button"] [data-ui="Box"] > [data-ui="Text"],
.site-surface [data-testid$="-insert-menu-button"] [data-ui="Box"] > [data-ui="Text"] span {
    overflow: visible !important;
}
`

export function SiteSurfaceInput(props: ArrayOfPrimitivesInputProps) {
    return (
        <div className="site-surface">
            <style>{CSS}</style>
            {props.renderDefault(props)}
        </div>
    )
}
