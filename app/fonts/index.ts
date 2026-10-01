import { Noto_Serif_SC, Noto_Serif_TC } from "next/font/google";
import localFont from "next/font/local";

// Which face each locale uses is decided in styles/variables.css (--font-heading, --font-body).
// Not preloaded: a page only needs the faces of its own locale.

export const notoSerifTC = Noto_Serif_TC({
    variable: "--font-noto-serif-tc",
    subsets: ["latin"],
    preload: false,
});

export const notoSerifSC = Noto_Serif_SC({
    variable: "--font-noto-serif-sc",
    subsets: ["latin"],
    preload: false,
});

// Noto Serif's Latin letters are Source Serif at 110%. English body text uses Source Serif 4 itself
// (Google's latin subset, opsz 20), a little larger at 115%, with real italics; Chinese falls through to Noto.
export const latinBody = localFont({
    variable: "--font-latin-body",
    src: [
        { path: "./SourceSerif4-latin.woff2", weight: "200 900", style: "normal" },
        { path: "./SourceSerif4-Italic-latin.woff2", weight: "200 900", style: "italic" },
    ],
    declarations: [
        {
            // The loader takes literals only.
            prop: "unicode-range",
            value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
        },
        { prop: "size-adjust", value: "115%" },
    ],
    // Anything outside the subset should reach Noto, not a metric fallback.
    adjustFontFallback: false,
    preload: false,
});

// Google's Noto Serif TC has no proportional punctuation, so ’ “ ” … — are a full em wide in English.
// Headings keep Noto's letters and take only those marks from Source Serif 4, at the same 110%.
export const latinPunctuation = localFont({
    variable: "--font-latin-punctuation",
    src: [{ path: "./SourceSerif4-punctuation.woff2", weight: "200 900", style: "normal" }],
    declarations: [
        { prop: "unicode-range", value: "U+2013-2014, U+2018-201E, U+2026" },
        { prop: "size-adjust", value: "110%" },
    ],
    // A metric fallback has no unicode-range and would take every character ahead of Noto.
    adjustFontFallback: false,
    preload: false,
});

export const fontVariables = [notoSerifTC, notoSerifSC, latinBody, latinPunctuation]
    .map((font) => font.variable)
    .join(" ");
