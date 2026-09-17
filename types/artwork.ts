// Parallel translations, not a "pick one for the UI locale" switch: the modal
// shows Chinese and English together and the key only chooses which Chinese
// script backs the Chinese side.
export type ArtworkSectionText = {
    en: string;
    'zh-CN': string;
    'zh-TW': string;
};

export type ArtworkSection = {
    id: string;
    title: ArtworkSectionText;
    body: ArtworkSectionText;
};

export type Artwork = {
    scripture_chinese: string;
    scripture_english: string;
    image_path: string;
    /** Card-sized `image_path`. Optional: the fixture and the Excel pipeline
     * only ever had one URL. */
    thumbnail_path?: string;
    date: string;
    bible_reference: string;
    slug?: string;
    /** Retired gallery URLs. They still resolve, then rewrite to `slug`. */
    previousSlugs?: string[];
    bibleThemes?: string[];
    spiritualThemes?: string[];
    sections?: ArtworkSection[];
};
