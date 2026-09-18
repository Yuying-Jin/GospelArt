/**
 * A named grouping of gallery artworks, and a level of gallery navigation.
 *
 * Unlike scripture, which always renders bilingually, a collection's name and
 * description are shown in one language — the visitor's — so they arrive here
 * already resolved to a single string by `lib/sanity/mapCollection.ts`.
 */
export type Collection = {
    slug: string;
    title: string;
    description: string;
    /** Curated collections are hand-ordered; dynamic ones follow rules. */
    mode: 'curated' | 'dynamic';
};

/** What the gallery menu and the collection switcher need, and nothing more. */
export type NavCollection = {
    slug: string;
    title: string;
};
