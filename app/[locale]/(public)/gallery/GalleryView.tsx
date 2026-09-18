import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import { getGalleryArtwork, getGalleryFeed } from "@/lib/sanity/getGalleryArtworks";
import type { AppLocale } from "@/lib/sanity/mapArtwork";
import type { Collection } from "@/types/collection";
import GalleryClient from "./GalleryClient";
import galleryStyle from "./gallery.module.css";

export type SearchParams = { [key: string]: string | string[] | undefined };

export function firstValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

/**
 * The gallery, whole or narrowed to one collection. Both routes render this so
 * the two differ only in which set of artworks they name — the heading, the
 * lazy-loaded grid and the deep-linked modal behave identically. Switching
 * between collections is the navbar's job.
 *
 * Fetching here rather than in the client avoids a request waterfall and keeps
 * a future draft-preview token off the browser.
 */
export default async function GalleryView({
    locale,
    searchParams,
    collection,
}: {
    locale: string;
    searchParams: SearchParams;
    /** Absent means the complete archive. */
    collection?: Collection;
}) {
    const t = await getTranslations("public.gallery");
    const activeSlug = firstValue(searchParams.artwork);

    const { artworks, order } = await getGalleryFeed(locale as AppLocale, collection?.slug);

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
        <>
            <Header
                title={collection ? collection.title : t("title")}
                description={collection ? collection.description : t("description")}
            />

            {collection && order.length === 0 ? (
                // A collection whose artworks are all still being finished. The
                // grid would render nothing at all, which reads as a broken page.
                <p className={galleryStyle.emptyCollection}>{t("collections.empty")}</p>
            ) : (
                <GalleryClient
                    initialArtworks={artworks}
                    order={order}
                    activeArtwork={activeArtwork ?? null}
                    collectionSlug={collection?.slug}
                />
            )}
        </>
    );
}
