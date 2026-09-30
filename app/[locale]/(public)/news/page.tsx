import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NewsView, { type SearchParams } from "./NewsView";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("public.news");
    return { title: t("title"), description: t("description") };
}

/** Every category. Each one alone is at `/news/<segment>`. */
export default async function NewsPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<SearchParams>;
}) {
    const { locale } = await params;
    return <NewsView locale={locale} searchParams={await searchParams} />;
}
