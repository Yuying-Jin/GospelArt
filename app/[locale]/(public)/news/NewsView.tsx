import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import { redirect } from "@/i18n/navigation";
import {
    NEWS_CATEGORY_CONFIG,
    newsCategory,
    type NewsCategory,
    type NewsCategoryLocale,
} from "@/lib/newsCategories";
import { getNewsPage, NEWS_PAGE_SIZE } from "@/lib/sanity/getNews";
import type { AppLocale } from "@/lib/sanity/mapArtwork";
import NewsCard from "./NewsCard";
import NewsFilters from "./NewsFilters";
import NewsPagination from "./NewsPagination";
import newsStyle from "./news.module.css";

export type SearchParams = { [key: string]: string | string[] | undefined };

export function newsPath(category?: NewsCategory): string {
    const segment = category && newsCategory(category)?.segment;
    return segment ? `/news/${segment}` : "/news";
}

/**
 * An article's address. From All News it carries `?from=all`, so its
 * previous and next follow that list; a category page needs nothing, since
 * its articles share the category the article defaults to.
 */
export function articleHref(slug: string, fromAll = false) {
    return fromAll ? { pathname: `/news/${slug}`, query: { from: "all" } } : `/news/${slug}`;
}

export function categoryLabel(category: NewsCategory, locale: string): string {
    return newsCategory(category)?.label[locale as NewsCategoryLocale] ?? category;
}

/** A whole number from 1 up, or null. */
function parsePage(value: string | string[] | undefined): number | null {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw && /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

/**
 * The news list, whole or one category. Both routes render this, so the pills
 * are plain links and the page number is `?page=`: refresh, back/forward and
 * a shared link all land on the same page. Page 1 has no parameter.
 */
export default async function NewsView({
    locale,
    searchParams,
    category,
}: {
    locale: string;
    searchParams: SearchParams;
    category?: NewsCategory;
}) {
    const t = await getTranslations("public.news");
    const pathname = newsPath(category);

    const requested = searchParams.page;
    const page = parsePage(requested);
    if (requested !== undefined && (page === null || page === 1)) {
        redirect({ href: pathname, locale });
    }

    const { items, total } = await getNewsPage(locale as AppLocale, page ?? 1, category);
    const totalPages = Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE));

    // Past the end, e.g. an old link after items were hidden.
    if (page !== null && page > totalPages) {
        redirect({
            href: totalPages === 1 ? pathname : { pathname, query: { page: String(totalPages) } },
            locale,
        });
    }

    const categoryLinks = NEWS_CATEGORY_CONFIG.map(({ id }) => ({
        key: id,
        label: categoryLabel(id, locale),
        href: newsPath(id),
        active: id === category,
    }));

    return (
        <>
            <Header title={t("title")} description={t("description")} />

            <NewsFilters
                all={{ key: "all", label: t("all"), href: newsPath(), active: !category }}
                categories={categoryLinks}
                moreLabel={t("more")}
                label={t("filter_label")}
            />

            {items.length === 0 ? (
                <p className={newsStyle.empty}>{t("empty")}</p>
            ) : (
                <ul className={newsStyle.list}>
                    {items.map((item) => (
                        <li key={item.slug}>
                            <NewsCard
                                item={item}
                                locale={locale}
                                categoryLabel={categoryLabel(item.category, locale)}
                                fromAll={!category}
                                eventDatesLabel={t("event_dates")}
                                locationLabel={t("location")}
                            />
                        </li>
                    ))}
                </ul>
            )}

            <NewsPagination pathname={pathname} page={page ?? 1} totalPages={totalPages} />
        </>
    );
}
