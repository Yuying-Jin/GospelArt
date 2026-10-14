/**
 * Marks an artwork's picture: spread onto its <img>, or the SVG that draws one.
 * components/ArtworkImageGuard.tsx and globals.css act on the attribute. Kept
 * out of that client component so server components can use it too.
 */
export const PROTECTED_ARTWORK = {"data-protected-artwork": "", draggable: false} as const;
