import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { permanentRedirect } from "@/i18n/navigation";
import { categoryForSegment } from "@/lib/newsCategories";
import { getNewsArticle } from "@/lib/sanity/getNews";
import type { AppLocale } from "@/lib/sanity/mapArtwork";
import NewsArticle from "../NewsArticle";
import NewsView, { articleHref, categoryLabel, type SearchParams } from "../NewsView";

type Props = {
    params: Promise<{ locale: string; slug: string }>;
    searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params;
    const category = categoryForSegment(slug);

    if (category) {
        const t = await getTranslations("public.news");
        return {
            title: `${categoryLabel(category.id, locale)} · ${t("title")}`,
            description: t("description"),
        };
    }

    const article = await getNewsArticle(locale as AppLocale, slug);
    if (!article) return {};

    return {
        title: article.title,
        // `?from=all` only changes previous and next; the article is the same page.
        alternates: { canonical: `/${locale}/news/${article.slug}` },
        description: article.summary || undefined,
        openGraph: {
            type: "article",
            title: article.title,
            description: article.summary || undefined,
            publishedTime: article.publishedAt,
            images: article.cover ? [article.cover.url] : undefined,
        },
    };
}

/**
 * A category's list or an article, which share this segment: the Studio
 * refuses the category segments as article slugs. A retired article slug
 * redirects to the current one, so links shared before a Change page URL
 * still land. `?from=all` makes previous and next walk All News instead of
 * the article's category.
 */
export default async function NewsSegmentPage({ params, searchParams }: Props) {
    const { locale, slug } = await params;
    const category = categoryForSegment(slug);

    if (category) {
        return <NewsView locale={locale} searchParams={await searchParams} category={category.id} />;
    }

    const query = await searchParams;
    const fromAll = (Array.isArray(query.from) ? query.from[0] : query.from) === "all";
    const article = await getNewsArticle(locale as AppLocale, slug, fromAll ? "all" : "category");
    if (!article) {
        notFound();
    }
    if (article.slug !== slug) {
        permanentRedirect({ href: articleHref(article.slug, fromAll), locale });
    }

    return <NewsArticle article={article} locale={locale} fromAll={fromAll} />;
}
