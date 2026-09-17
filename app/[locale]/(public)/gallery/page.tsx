import { redirect } from "@/i18n/navigation";
import { getGalleryArtwork, getGalleryFeed } from "@/lib/sanity/getGalleryArtworks";
import type { AppLocale } from "@/lib/sanity/mapArtwork";
import GalleryClient from "./GalleryClient";

type SearchParams = { [key: string]: string | string[] | undefined };

function firstValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

/**
 * Fetching here rather than in the client avoids a request waterfall and keeps
 * a future draft-preview token off the browser.
 */
export default async function GalleryPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<SearchParams>;
}) {
    const { locale } = await params;
    const query = await searchParams;
    const activeSlug = firstValue(query.artwork);

    // `?page=` belonged to the paginated gallery; redirect old links instead of
    // silently ignoring the parameter.
    if (query.page !== undefined) {
        redirect({
            href: activeSlug ? { pathname: "/gallery", query: { artwork: activeSlug } } : "/gallery",
            locale,
        });
    }

    const { artworks, order } = await getGalleryFeed(locale as AppLocale);

    // Only a link pointing past the opening batch costs an extra lookup.
    const alreadyLoaded = activeSlug
        ? artworks.find(
              (artwork) =>
                  artwork.slug === activeSlug || artwork.previousSlugs?.includes(activeSlug),
          )
        : undefined;
    const activeArtwork =
        alreadyLoaded ??
        (activeSlug ? await getGalleryArtwork(locale as AppLocale, activeSlug) : null);

    return (
        <GalleryClient
            initialArtworks={artworks}
            order={order}
            activeArtwork={activeArtwork ?? null}
        />
    );
}
