import type {PortableTextBlock} from 'next-sanity';
import type {NewsCategory} from '@/lib/newsCategories';

export type {NewsCategory};

/**
 * One item on the news list, resolved to the visitor's language by
 * `lib/sanity/mapNews.ts`. Unlike scripture, news is shown in one language.
 */
export type NewsListItem = {
    slug: string;
    category: NewsCategory;
    /** `YYYY-MM-DD`. */
    publishedAt: string;
    title: string;
    /** The summary, or the start of the body when there is none. */
    summary: string;
    coverUrl: string | null;
    /** Event items only. */
    event: {
        startDate: string;
        endDate: string | null;
        location: string;
    } | null;
};

export type NewsPage = {
    items: NewsListItem[];
    total: number;
};

export type NewsImage = {
    url: string;
    /** A larger rendition for the full-screen viewer. */
    fullUrl: string;
    width?: number;
    height?: number;
};

/** A body image block, with its URLs resolved. */
export type NewsBodyImage = NewsImage & {_type: 'image'; _key: string; caption: string};

export type NewsLink = {slug: string; title: string};

/** One article, resolved to the visitor's language like the list. */
export type NewsArticle = {
    slug: string;
    category: NewsCategory;
    publishedAt: string;
    title: string;
    summary: string;
    /** Null means the page draws the generated placeholder. */
    cover: NewsImage | null;
    event: {
        name: string;
        startDate: string;
        endDate: string | null;
        location: string;
        organizer: string;
        externalUrl: string | null;
    } | null;
    collection: NewsLink | null;
    /** Portable Text in one language, the ESV marks already applied. */
    body: (PortableTextBlock | NewsBodyImage)[];
    older: NewsLink | null;
    newer: NewsLink | null;
};
