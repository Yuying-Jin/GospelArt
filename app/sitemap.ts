import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSitemapContent } from "@/lib/sanity/getSitemapContent";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * For now the home page alone of the fixed pages, and none of news; the rest
 * join as they are ready. Paged lists (?page=), retired slugs and the artwork
 * modal (?artwork=) stay out for good: crawlers follow the first, the second
 * only redirect, and the third shares the gallery's title until artworks
 * have their own.
 */
const PAGES = ["home"];

/** One entry per page, naming its other-language versions so search engines pair them. */
function entry(path: string, extra: Partial<MetadataRoute.Sitemap[number]> = {}): MetadataRoute.Sitemap[number] {
    const url = (locale: string) => `${SITE_URL}/${locale}/${path}`;
    return {
        url: url(routing.defaultLocale),
        alternates: {
            languages: {
                ...Object.fromEntries(routing.locales.map((locale) => [locale, url(locale)])),
                // The root sends each visitor to their own language.
                "x-default": `${SITE_URL}/`,
            },
        },
        ...extra,
    };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const { collections } = await getSitemapContent();
    return [
        ...PAGES.map((path) => entry(path)),
        ...collections.map((c) => entry(`gallery/${c.slug}`, { lastModified: c.updatedAt })),
    ];
}
