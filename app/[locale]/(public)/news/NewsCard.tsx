import { CalendarDays, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { newsPlaceholderUrl } from "@/lib/newsPlaceholder";
import type { NewsListItem } from "@/types/news";
import { articleHref } from "./NewsView";
import newsStyle from "./news.module.css";

/** Dates are stored as `YYYY-MM-DD`; read them as UTC so no timezone shifts the day. */
function toDate(value: string): Date {
    return new Date(`${value}T00:00:00Z`);
}

function dateFormat(locale: string) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
}

export default function NewsCard({
    item,
    locale,
    categoryLabel,
    fromAll = false,
    eventDatesLabel,
    locationLabel,
}: {
    item: NewsListItem;
    locale: string;
    categoryLabel: string;
    /** Listed on All News, so the article's previous and next follow that list. */
    fromAll?: boolean;
    eventDatesLabel: string;
    locationLabel: string;
}) {
    const format = dateFormat(locale);
    const event = item.event;

    return (
        <article className={newsStyle.card}>
            {/* Makes the whole card open the article; the title link is the one announced and tabbed to. */}
            <Link href={articleHref(item.slug, fromAll)} className={newsStyle.cardOverlay} aria-hidden="true" tabIndex={-1} />
            <div className={newsStyle.cover}>
                {/* Without a cover, a generated stained-glass picture keeps every card the same shape. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- Sanity's CDN sizes it in the URL */}
                <img
                    src={item.coverUrl ?? newsPlaceholderUrl(item.slug)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                />
            </div>

            <div className={newsStyle.body}>
                <span className={newsStyle.categoryPill}>{categoryLabel}</span>
                <h2 className={newsStyle.title}>
                    <Link href={articleHref(item.slug, fromAll)} className={newsStyle.cardLink}>
                        {item.title}
                    </Link>
                </h2>
                {item.summary && <p className={newsStyle.summary}>{item.summary}</p>}

                <div className={newsStyle.meta}>
                    <time dateTime={item.publishedAt}>{format.format(toDate(item.publishedAt))}</time>
                    {event && (
                        <span className={newsStyle.metaItem}>
                            <CalendarDays aria-hidden="true" size={14} />
                            <span className={newsStyle.visuallyHidden}>{eventDatesLabel}</span>
                            {event.endDate && event.endDate !== event.startDate
                                ? format.formatRange(toDate(event.startDate), toDate(event.endDate))
                                : format.format(toDate(event.startDate))}
                        </span>
                    )}
                    {event?.location && (
                        <span className={newsStyle.metaItem}>
                            <MapPin aria-hidden="true" size={14} />
                            <span className={newsStyle.visuallyHidden}>{locationLabel}</span>
                            {event.location}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}
