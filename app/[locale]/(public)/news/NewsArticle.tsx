import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, Flag, Images, MapPin, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import FullscreenImage from "@/components/FullscreenImage";
import ShareButton from "@/components/ShareButton";
import { Link } from "@/i18n/navigation";
import { newsPlaceholderUrl } from "@/lib/newsPlaceholder";
import type { NewsArticle as Article, NewsLink } from "@/types/news";
import NewsBody from "./NewsBody";
import { articleHref, categoryLabel, newsPath } from "./NewsView";
import articleStyle from "./article.module.css";

function toDate(value: string): Date {
    return new Date(`${value}T00:00:00Z`);
}

/**
 * One news article: the cover, then category, title and date, the event's
 * details for an event, the body, then share, the related collection, and
 * the neighbouring articles in the list the reader came from.
 */
export default async function NewsArticle({
    article,
    locale,
    fromAll = false,
}: {
    article: Article;
    locale: string;
    /** Previous and next walk All News rather than the article's category. */
    fromAll?: boolean;
}) {
    const t = await getTranslations("public.news.article");
    const format = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
    const { event } = article;
    const coverUrl = article.cover?.url ?? newsPlaceholderUrl(article.slug);

    const eventRow = (icon: ReactNode, label: string, value: ReactNode) =>
        value ? (
            <div className={articleStyle.eventRow}>
                {icon}
                <span className={articleStyle.eventLabel}>{label}</span>
                <span>{value}</span>
            </div>
        ) : null;

    const pagerLink = (link: NewsLink | null, direction: "previous" | "next") => {
        const label = (
            <span className={articleStyle.pagerLabel}>
                {direction === "previous" && <ArrowLeft size={14} aria-hidden="true" />}
                {t(direction)}
                {direction === "next" && <ArrowRight size={14} aria-hidden="true" />}
            </span>
        );
        return link ? (
            <Link href={articleHref(link.slug, fromAll)} className={articleStyle.pagerItem} rel={direction === "previous" ? "prev" : "next"}>
                {label}
                <span className={articleStyle.pagerTitle}>{link.title}</span>
            </Link>
        ) : (
            <span className={`${articleStyle.pagerItem} ${articleStyle.pagerEmpty}`}>
                {label}
                <span className={articleStyle.pagerTitle}>{t("none")}</span>
            </span>
        );
    };

    return (
        <article className={articleStyle.article}>
            <div className={articleStyle.coverFrame}>
                <FullscreenImage
                    src={coverUrl}
                    fullSrc={article.cover?.fullUrl ?? coverUrl}
                    alt={article.title}
                    width={article.cover?.width}
                    height={article.cover?.height}
                    className={articleStyle.cover}
                />
            </div>

            <header className={articleStyle.head}>
                <Link href={newsPath(article.category)} className={articleStyle.categoryPill}>
                    {categoryLabel(article.category, locale)}
                </Link>
                <h1 className={articleStyle.title}>{article.title}</h1>
                <time className={articleStyle.date} dateTime={article.publishedAt}>
                    {format.format(toDate(article.publishedAt))}
                </time>
            </header>

            {event && (
                <section className={articleStyle.eventBox} aria-label={t("event")}>
                    {eventRow(<Flag size={16} aria-hidden="true" />, t("event"), event.name)}
                    {eventRow(
                        <CalendarDays size={16} aria-hidden="true" />,
                        t("dates"),
                        event.endDate && event.endDate !== event.startDate
                            ? format.formatRange(toDate(event.startDate), toDate(event.endDate))
                            : format.format(toDate(event.startDate)),
                    )}
                    {eventRow(<MapPin size={16} aria-hidden="true" />, t("location"), event.location)}
                    {eventRow(<Users size={16} aria-hidden="true" />, t("organizer"), event.organizer)}
                    {eventRow(
                        <ExternalLink size={16} aria-hidden="true" />,
                        t("event_link"),
                        event.externalUrl && (
                            <a href={event.externalUrl} target="_blank" rel="noopener noreferrer">
                                {t("event_link_text")}
                            </a>
                        ),
                    )}
                </section>
            )}

            <NewsBody body={article.body} imageLabel={t("image")} />

            <footer className={articleStyle.foot}>
                <ShareButton
                    title={article.title}
                    label={t("share")}
                    copiedLabel={t("share_copied")}
                    className={articleStyle.share}
                />

                {article.collection && (
                    <Link href={`/gallery/${article.collection.slug}`} className={articleStyle.collection}>
                        <Images size={26} strokeWidth={1.5} aria-hidden="true" />
                        <span>
                            <span className={articleStyle.collectionEyebrow}>{t("collection")}</span>
                            <span className={articleStyle.collectionTitle}>{article.collection.title}</span>
                        </span>
                        <span className={articleStyle.pagerLabel}>
                            {t("to_gallery")}
                            <ArrowRight size={14} aria-hidden="true" />
                        </span>
                    </Link>
                )}

                <nav className={articleStyle.pager} aria-label={t(fromAll ? "pager_label_all" : "pager_label")}>
                    {/* In the list's order, newest first: previous is the newer one. */}
                    {pagerLink(article.newer, "previous")}
                    {pagerLink(article.older, "next")}
                </nav>
            </footer>
        </article>
    );
}
