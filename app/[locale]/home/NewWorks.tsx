"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DetailsModal from "@/components/gallery/DetailsModal";
import { getPathname, Link } from "@/i18n/navigation";
import type { HomeWork } from "@/types/home";
import SectionHeading from "./SectionHeading";
import EsvMark from "./EsvMark";
import Verse from "./Verse";
import homeStyles from "./home.module.css";

/** Dates are stored as `YYYY-MM-DD`; read them as UTC so no timezone shifts the day. */
function formatDate(value: string, locale: string): string {
    if (!value) return "";
    return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

/** This page's URL with `?artwork=` set to `slug`, or removed. */
function artworkUrl(slug: string | null) {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("artwork", slug);
    else url.searchParams.delete("artwork");
    return url;
}

/**
 * The row's artworks hung in the dark, the one in the middle lit from above.
 * Swiping or the arrows move the light along; the lit one opens the gallery's
 * modal here, at `?artwork=`, as the gallery does. `galleryPath` is the
 * gallery page they come from: the whole gallery, or the chosen collection.
 */
export default function NewWorks({
    locale,
    works,
    heading,
    galleryPath,
    viewAll,
    previous,
    next,
}: {
    locale: string;
    works: HomeWork[];
    heading: string;
    galleryPath: string;
    viewAll: string;
    previous: string;
    next: string;
}) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [active, setActive] = useState(0);
    const [shown, setShown] = useState(0);
    const [sizes, setSizes] = useState<[number, number][]>([]);
    // Whether this visit pushed the modal's history entry, so closing can go back to it.
    const openedHereRef = useRef(false);

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

    // Like a motion-sensor light: on while the pictures are in the middle of the
    // screen, dimming once the reader moves on. Kept off React's className.
    const walkRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const walk = walkRef.current;
        if (!walk) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) walk.dataset.on = "";
                else delete walk.dataset.on;
            },
            { rootMargin: "-30% 0px -30% 0px" },
        );
        observer.observe(walk);
        return () => observer.disconnect();
    }, []);

    // The verse fades out, changes while hidden, and fades back in.
    useEffect(() => {
        if (shown === active) return;
        const timer = setTimeout(() => setShown(active), 260);
        return () => clearTimeout(timer);
    }, [active, shown]);

    const centreOn = useCallback((index: number, smooth: boolean) => {
        const track = trackRef.current;
        const piece = track?.children[index] as HTMLElement | undefined;
        if (!track || !piece) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        track.scrollTo({
            left: piece.offsetLeft + piece.offsetWidth / 2 - track.clientWidth / 2,
            behavior: smooth && !reduce ? "smooth" : "auto",
        });
    }, []);

    // Keep the lit picture centred when the stage resizes.
    useEffect(() => {
        if (sizes.length) centreOn(active, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only on relayout
    }, [sizes]);

    const goTo = useCallback((index: number) => {
        const clamped = Math.max(0, Math.min(works.length - 1, index));
        setActive(clamped);
        centreOn(clamped, true);
    }, [works.length, centreOn]);

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

    // A modified click keeps the link's own behaviour: the gallery, in a new tab.
    const onPieceClick = (index: number) => (event: MouseEvent) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (index !== active) {
            goTo(index);
            return;
        }
        openedHereRef.current = true;
        window.history.pushState(null, "", artworkUrl(works[index].slug));
    };

    const work = works[shown];
    const first = sizes[0]?.[0] ?? 140;
    const last = sizes[sizes.length - 1]?.[0] ?? 140;

    return (
        <section className={homeStyles.section} aria-labelledby="home-works">
            <SectionHeading id="home-works">{heading}</SectionHeading>
            <div ref={walkRef} className={homeStyles.walk} style={{ "--wglow": works[active]?.glow } as CSSProperties}>
                <div
                    ref={trackRef}
                    className={homeStyles.walkTrack}
                    onScroll={onScroll}
                    style={{ "--first-w": `${first}px`, "--last-w": `${last}px` } as CSSProperties}
                >
                    {works.map((item, index) => (
                        <Link
                            key={item.slug}
                            href={{ pathname: galleryPath, query: { artwork: item.slug } }}
                            className={`${homeStyles.piece} ${index === active ? homeStyles.lit : ""}`}
                            style={
                                {
                                    "--w": `${sizes[index]?.[0] ?? 0}px`,
                                    "--h": `${sizes[index]?.[1] ?? 0}px`,
                                    "--pglow": item.glow,
                                } as CSSProperties
                            }
                            aria-label={item.reference}
                            data-artwork-slug={item.slug}
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
            <Link href={galleryPath} className={homeStyles.more}>
                {viewAll} →
            </Link>
            <Suspense fallback={null}>
                <WorkDetails locale={locale} works={works} galleryPath={galleryPath} onShow={goTo} openedHereRef={openedHereRef} />
            </Suspense>
        </section>
    );
}

/**
 * The modal for the artwork `?artwork=` names, when it is one of these. Prev/next
 * stay among them and move the light along behind; Share sends the gallery's
 * link, since the row changes as newer artworks arrive or the collection does.
 */
function WorkDetails({
    locale,
    works,
    galleryPath,
    onShow,
    openedHereRef,
}: {
    locale: string;
    works: HomeWork[];
    galleryPath: string;
    onShow: (index: number) => void;
    openedHereRef: { current: boolean };
}) {
    const slug = useSearchParams().get("artwork");
    const index = works.findIndex((work) => work.slug === slug);

    useEffect(() => {
        if (index >= 0) onShow(index);
    }, [index, onShow]);

    if (index < 0) return null;
    const work = works[index];

    const close = () => {
        if (openedHereRef.current) {
            openedHereRef.current = false;
            window.history.back();
        } else {
            window.history.replaceState(null, "", artworkUrl(null));
        }
    };
    const show = (target: number) => window.history.replaceState(null, "", artworkUrl(works[target].slug));

    return (
        <DetailsModal
            artwork={work.details}
            onClose={close}
            onPrev={() => show(index - 1)}
            onNext={() => show(index + 1)}
            isFirst={index === 0}
            isLast={index === works.length - 1}
            shareUrl={getPathname({ locale, href: { pathname: galleryPath, query: { artwork: work.slug } } })}
        />
    );
}
