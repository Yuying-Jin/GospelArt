import { redirect } from "@/i18n/navigation";
import GalleryView, { firstValue, type SearchParams } from "./GalleryView";

/** The complete archive. Collections narrow it at `/gallery/[collection]`. */
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

    return <GalleryView locale={locale} searchParams={query} />;
}
