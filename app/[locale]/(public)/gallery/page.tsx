import { getGalleryArtworks } from "@/lib/sanity/getGalleryArtworks";
import type { AppLocale } from "@/lib/sanity/mapArtwork";
import GalleryClient from "./GalleryClient";

/**
 * Server component: artwork data is fetched here and handed to the client
 * component, which keeps all the interactive behaviour (lightbox, `?artwork=`
 * URL state, swipe/keyboard paging). Fetching on the server avoids a
 * client-side request waterfall and leaves room for a draft-preview token later
 * without any of it reaching the browser.
 */
export default async function GalleryPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const { artworks } = await getGalleryArtworks(locale as AppLocale);

    return <GalleryClient artworks={artworks} />;
}
