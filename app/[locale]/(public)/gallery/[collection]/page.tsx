import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/sanity/getCollections";
import type { AppLocale } from "@/lib/sanity/mapArtwork";
import GalleryView, { type SearchParams } from "../GalleryView";

type Props = {
    params: Promise<{ locale: string; collection: string }>;
    searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, collection: slug } = await params;
    const collection = await getCollection(locale as AppLocale, slug);

    if (!collection) return {};

    return {
        title: collection.title,
        description: collection.description || undefined,
    };
}

/**
 * One collection. The slug is a collection document's, so an address that no
 * collection answers to is a 404 rather than a silent fall back to the whole
 * gallery — which would look like a working page showing the wrong thing.
 */
export default async function CollectionPage({ params, searchParams }: Props) {
    const { locale, collection: slug } = await params;
    const collection = await getCollection(locale as AppLocale, slug);

    if (!collection) {
        notFound();
    }

    return (
        <GalleryView
            locale={locale}
            searchParams={await searchParams}
            collection={collection}
        />
    );
}
