import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import newsStyle from "./news.module.css";

/** Beyond this many pages the numbers are windowed and a page box appears. */
const MAX_LISTED = 7;

/** Always seven slots once windowed: first, last, and the current page's neighbours. */
function pageWindow(current: number, total: number): (number | "gap")[] {
    const range = (from: number, to: number) =>
        Array.from({ length: to - from + 1 }, (_, i) => from + i);

    if (total <= MAX_LISTED) return range(1, total);

    const start = Math.max(2, Math.min(current - 1, total - 4));
    const end = Math.min(total - 1, Math.max(current + 1, 5));
    return [
        1,
        ...(start > 2 ? (["gap"] as const) : []),
        ...range(start, end),
        ...(end < total - 1 ? (["gap"] as const) : []),
        total,
    ];
}

export default async function NewsPagination({
    pathname,
    page,
    totalPages,
}: {
    pathname: string;
    page: number;
    totalPages: number;
}) {
    if (totalPages <= 1) return null;

    const t = await getTranslations("public.news.pagination");
    const href = (n: number) => (n === 1 ? pathname : { pathname, query: { page: String(n) } });

    return (
        <nav className={newsStyle.pagination} aria-label={t("label")}>
            {page > 1 ? (
                <Link href={href(page - 1)} className={newsStyle.pageStep} rel="prev" aria-label={t("previous")}>
                    <ChevronLeft aria-hidden="true" size={18} />
                    <span className={newsStyle.stepLabel}>{t("previous")}</span>
                </Link>
            ) : (
                <span className={`${newsStyle.pageStep} ${newsStyle.pageDisabled}`} aria-hidden="true">
                    <ChevronLeft size={18} />
                    <span className={newsStyle.stepLabel}>{t("previous")}</span>
                </span>
            )}

            <ol className={newsStyle.pageList}>
                {pageWindow(page, totalPages).map((n, index) =>
                    n === "gap" ? (
                        <li key={`gap-${index}`} className={newsStyle.pageGap} aria-hidden="true">
                            …
                        </li>
                    ) : (
                        <li key={n}>
                            <Link
                                href={href(n)}
                                className={`${newsStyle.pageLink} ${n === page ? newsStyle.pageCurrent : ""}`}
                                aria-current={n === page ? "page" : undefined}
                                aria-label={t("page", { page: n })}
                            >
                                {n}
                            </Link>
                        </li>
                    ),
                )}
            </ol>

            {page < totalPages ? (
                <Link href={href(page + 1)} className={newsStyle.pageStep} rel="next" aria-label={t("next")}>
                    <span className={newsStyle.stepLabel}>{t("next")}</span>
                    <ChevronRight aria-hidden="true" size={18} />
                </Link>
            ) : (
                <span className={`${newsStyle.pageStep} ${newsStyle.pageDisabled}`} aria-hidden="true">
                    <span className={newsStyle.stepLabel}>{t("next")}</span>
                    <ChevronRight size={18} />
                </span>
            )}

            {totalPages > MAX_LISTED && (
                // A plain GET form: Enter submits `?page=` to the current
                // address, and the page clamps whatever number arrives.
                <form className={newsStyle.pageJump} method="get">
                    <label htmlFor="news-page-jump">{t("jump_before")}</label>
                    <input
                        id="news-page-jump"
                        type="number"
                        name="page"
                        min={1}
                        max={totalPages}
                        defaultValue={page}
                        inputMode="numeric"
                        required
                    />
                    {t("jump_after") && <span aria-hidden="true">{t("jump_after")}</span>}
                </form>
            )}
        </nav>
    );
}
