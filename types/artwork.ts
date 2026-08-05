// Locale keys hold parallel translations of the same section content — they
// are not a "pick one for the current UI locale" switch. The modal always
// displays Chinese and English together (matching scripture_chinese/
// scripture_english); the locale key only chooses which Chinese script
// (zh-CN vs zh-TW) backs that Chinese display.
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
    date: string;
    bible_reference: string;
    slug?: string;
    bibleThemes?: string[];
    spiritualThemes?: string[];
    sections?: ArtworkSection[];
};
