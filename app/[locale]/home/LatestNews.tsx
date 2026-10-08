import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { newsPlaceholderUrl } from "@/lib/newsPlaceholder";
import type { NewsListItem } from "@/types/news";
import { articleHref, categoryLabel } from "../(public)/news/NewsView";
import SectionHeading from "./SectionHeading";
import homeStyles from "./home.module.css";

/** Dates are stored as `YYYY-MM-DD`; read them as UTC so no timezone shifts the day. */
function formatDate(value: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

/** The base hue of a generated stained-glass cover, so the lead's light matches it. */
function placeholderHue(url: string): number {
    const match = /hsl\((\d+)/.exec(decodeURIComponent(url));
    return match ? Number(match[1]) : 38;
}

/**
 * A front page: the newest item leads with its picture, the next two follow
 * as text beside it. Every item is a link to the article as listed under All News.
 */
export default function LatestNews({
    locale,
    items,
    heading,
    viewAll,
}: {
    locale: string;
    items: NewsListItem[];
    heading: string;
    viewAll: string;
}) {
    const [lead, ...rest] = items;
    const leadImage = lead.coverUrl ?? newsPlaceholderUrl(lead.slug);
    const hue = lead.coverUrl ? 38 : placeholderHue(leadImage);

    const meta = (item: NewsListItem) => (
        <div className={homeStyles.taleMeta}>
            <span className={homeStyles.taleCat}>{categoryLabel(item.category, locale)}</span>
            <span className={homeStyles.taleDot} aria-hidden="true" />
            <time dateTime={item.publishedAt}>{formatDate(item.publishedAt, locale)}</time>
        </div>
    );

    return (
        <section className={homeStyles.section} aria-labelledby="home-news">
            <SectionHeading id="home-news">{heading}</SectionHeading>
            <div className={homeStyles.tales} style={{ "--hue": hue } as CSSProperties}>
                <Link href={articleHref(lead.slug, true)} className={`${homeStyles.tale} ${homeStyles.lead}`}>
                    <div className={homeStyles.talePane}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- Sanity's CDN sizes it in the URL */}
                        <img src={leadImage} alt="" loading="lazy" decoding="async" />
                    </div>
                    {meta(lead)}
                    <h3 className={homeStyles.taleTitle}>{lead.title}</h3>
                    {lead.summary && <p className={homeStyles.taleSum}>{lead.summary}</p>}
                </Link>
                {rest.map((item) => (
                    <Link key={item.slug} href={articleHref(item.slug, true)} className={homeStyles.tale}>
                        {meta(item)}
                        <h3 className={homeStyles.taleTitle}>{item.title}</h3>
                        {item.summary && <p className={homeStyles.taleSum}>{item.summary}</p>}
                    </Link>
                ))}
            </div>
            <Link href="/news" className={homeStyles.more}>
                {viewAll} →
            </Link>
        </section>
    );
}
