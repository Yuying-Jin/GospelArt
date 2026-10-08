import type {NewsListItem} from './news';

/** An artwork as the home page shows it, resolved to the visitor's language. */
export type HomeArtwork = {
    slug: string;
    /** The citation in the visitor's language ("約翰福音 11:25"). */
    reference: string;
    /** `YYYY-MM-DD`. */
    date: string;
    /** Scripture is shown bilingually; the locale only picks the Chinese script. */
    chinese: string;
    english: string;
    imageUrl: string;
    /** The served picture's size, after any crop set in the Studio. */
    width: number;
    height: number;
    /** The hotspot, as CSS percentages within the served picture. */
    focusX: number;
    focusY: number;
    /** A light colour from the image's palette, for the light around it. */
    glow: string;
};

export type HomeCreedItem = {key: string; title: string; body: string};

export type HomePage = {
    hero: {
        artwork: HomeArtwork | null;
        /** `light` for a painting on white paper, which must not be dimmed. */
        tone: 'dark' | 'light';
        /** 1–1.5: the picture enlarged towards its hotspot, home page only. */
        zoom: number;
        intro: string;
        /** Empty means the default label. */
        button: string;
    };
    creed: {line: string; items: HomeCreedItem[]};
    latest: HomeArtwork[];
    news: NewsListItem[];
    /** Null when there is no verse to close on. */
    /** The page's language only; `esv` when that is the ESV's English, which must then carry its mark. */
    closing: {primary: string; reference: string; esv: boolean} | null;
};
