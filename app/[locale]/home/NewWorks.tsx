"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { HomeArtwork } from "@/types/home";
import SectionHeading from "./SectionHeading";
import EsvMark from "./EsvMark";
import Verse from "./Verse";
import homeStyles from "./home.module.css";

/** Dates are stored as `YYYY-MM-DD`; read them as UTC so no timezone shifts the day. */
function formatDate(value: string, locale: string): string {
    if (!value) return "";
    return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

/**
 * The newest artworks hung in the dark, the one in the middle lit from above.
 * Swiping or the arrows move the light along; the lit one opens in the gallery.
 */
export default function NewWorks({
    locale,
    works,
    heading,
    viewAll,
    previous,
    next,
}: {
    locale: string;
    works: HomeArtwork[];
    heading: string;
    viewAll: string;
    previous: string;
    next: string;
}) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [active, setActive] = useState(0);
    const [shown, setShown] = useState(0);
    const [sizes, setSizes] = useState<[number, number][]>([]);

    // Each picture fits the stage at its own proportions, never wider than most of the screen.
    const layout = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const stage = track.clientHeight || 380;
        const wide = track.clientWidth >= 860;
        const maxWidth = track.clientWidth * (wide ? 0.46 : 0.82);
        setSizes(
            works.map((work) => {
                const ratio = work.width / work.height;
                let height = stage * 0.78;
                let width = height * ratio;
                if (width > maxWidth) {
                    width = maxWidth;
                    height = width / ratio;
                }
                return [Math.round(width), Math.round(height)];
            }),
        );
    }, [works]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const observer = new ResizeObserver(layout);
        observer.observe(track);
        return () => observer.disconnect();
    }, [layout]);

    // The verse fades out, changes while hidden, and fades back in.
    useEffect(() => {
        if (shown === active) return;
        const timer = setTimeout(() => setShown(active), 260);
        return () => clearTimeout(timer);
    }, [active, shown]);

    const centreOn = (index: number, smooth: boolean) => {
        const track = trackRef.current;
        const piece = track?.children[index] as HTMLElement | undefined;
        if (!track || !piece) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        track.scrollTo({
            left: piece.offsetLeft + piece.offsetWidth / 2 - track.clientWidth / 2,
            behavior: smooth && !reduce ? "smooth" : "auto",
        });
    };

    // Keep the lit picture centred when the stage resizes.
    useEffect(() => {
        if (sizes.length) centreOn(active, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only on relayout
    }, [sizes]);

    const goTo = (index: number) => {
        const clamped = Math.max(0, Math.min(works.length - 1, index));
        setActive(clamped);
        centreOn(clamped, true);
    };

    // Whichever picture a swipe leaves nearest the middle is the lit one.
    const onScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        const middle = track.scrollLeft + track.clientWidth / 2;
        let best = 0, bestDistance = Infinity;
        Array.from(track.children).forEach((child, index) => {
            const piece = child as HTMLElement;
            const distance = Math.abs(piece.offsetLeft + piece.offsetWidth / 2 - middle);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = index;
            }
        });
        if (best !== active) setActive(best);
    };

    const onPieceClick = (index: number) => (event: MouseEvent) => {
        if (index === active) return;
        event.preventDefault();
        goTo(index);
    };

    const work = works[shown];
    const first = sizes[0]?.[0] ?? 140;
    const last = sizes[sizes.length - 1]?.[0] ?? 140;

    return (
        <section className={homeStyles.section} aria-labelledby="home-works">
            <SectionHeading id="home-works">{heading}</SectionHeading>
            <div className={homeStyles.walk} style={{ "--wglow": works[active]?.glow } as CSSProperties}>
                <div
                    ref={trackRef}
                    className={homeStyles.walkTrack}
                    onScroll={onScroll}
                    style={{ "--first-w": `${first}px`, "--last-w": `${last}px` } as CSSProperties}
                >
                    {works.map((item, index) => (
                        <Link
                            key={item.slug}
                            href={{ pathname: "/gallery", query: { artwork: item.slug } }}
                            className={`${homeStyles.piece} ${index === active ? homeStyles.lit : ""}`}
                            style={
                                {
                                    "--w": `${sizes[index]?.[0] ?? 0}px`,
                                    "--h": `${sizes[index]?.[1] ?? 0}px`,
                                    "--pglow": item.glow,
                                } as CSSProperties
                            }
                            aria-label={item.reference}
                            onClick={onPieceClick(index)}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- Sanity's CDN sizes it in the URL */}
                            <img src={item.imageUrl} alt="" loading="lazy" decoding="async" />
                        </Link>
                    ))}
                </div>
                <div className={homeStyles.walkFloor} aria-hidden="true" />
            </div>

            {work && (
                <div className={`${homeStyles.walkText} ${shown !== active ? homeStyles.fading : ""}`} aria-live="polite">
                    <Verse locale={locale} chinese={work.chinese} english={work.english} className={homeStyles.verse} />
                    <span className={homeStyles.reference}>
                        {work.reference}
                        {work.english && <EsvMark />}
                        {work.date && ` · ${formatDate(work.date, locale)}`}
                    </span>
                </div>
            )}

            <div className={homeStyles.walkFoot}>
                <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label={previous}>
                    <ChevronLeft size={16} strokeWidth={1.75} />
                </button>
                <span className={homeStyles.walkCount}>
                    {active + 1} / {works.length}
                </span>
                <button type="button" onClick={() => goTo(active + 1)} disabled={active === works.length - 1} aria-label={next}>
                    <ChevronRight size={16} strokeWidth={1.75} />
                </button>
            </div>
            <Link href="/gallery" className={homeStyles.more}>
                {viewAll} →
            </Link>
        </section>
    );
}
