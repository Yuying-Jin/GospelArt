"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import type { HomeArtwork } from "@/types/home";
import EsvMark from "./EsvMark";
import Verse from "./Verse";
import homeStyles from "./home.module.css";

/** Wider than this reads as a landscape painting and is laid out as one. */
const LANDSCAPE_RATIO = 1.15;

/**
 * The first screen: one artwork, lit by a beam from above with dust drifting
 * in it, its scripture and the way into the gallery. The light takes the
 * picture's own colour.
 */
export default function HomeHero({
    locale,
    artwork,
    tone,
    zoom,
    intro,
    button,
    note,
}: {
    locale: string;
    artwork: HomeArtwork | null;
    tone: "dark" | "light";
    zoom: number;
    intro: string;
    button: string;
    /** While the site is in testing: marks the copy above as a placeholder. */
    note: string;
}) {
    const heroRef = useRef<HTMLElement | null>(null);
    const beamRef = useRef<HTMLDivElement | null>(null);
    const dustRef = useRef<HTMLCanvasElement | null>(null);

    // The beam sways a little and dust drifts down through it. Still for reduced motion.
    useEffect(() => {
        const hero = heroRef.current, beam = beamRef.current, canvas = dustRef.current;
        const ctx = canvas?.getContext("2d");
        if (!hero || !beam || !canvas || !ctx) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let width = 0, height = 0, centre = 0, frame = 0;
        let motes: { x: number; y: number; r: number; v: number; p: number }[] = [];

        const draw = (time: number) => {
            ctx.clearRect(0, 0, width, height);
            for (const m of motes) {
                if (!reduce) {
                    m.y += m.v;
                    m.x += Math.sin(time / 2600 + m.p) * 0.1;
                    if (m.y > height * 0.85) m.y = -4;
                }
                const spread = (m.y / height) * Math.max(width * 0.32, 140) + 30;
                const inBeam = Math.max(0, 1 - Math.abs(m.x - centre) / spread);
                ctx.globalAlpha = 0.18 + 0.7 * inBeam * (0.6 + 0.4 * Math.sin(time / 900 + m.p));
                ctx.fillStyle = "#fff3d0";
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                ctx.fill();
            }
            if (!reduce) {
                beam.style.setProperty("--tilt", `${(Math.sin(time / 7000) * 2.2).toFixed(2)}deg`);
                frame = requestAnimationFrame(draw);
            }
        };

        const resize = () => {
            const box = hero.getBoundingClientRect();
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            width = box.width;
            height = box.height;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            // The beam sits over the picture: centred on a phone, right of centre on a wide screen.
            centre = width >= 860 ? width * 0.66 : width / 2;
            motes = Array.from({ length: Math.max(36, Math.round(width / 14)) }, () => ({
                x: centre + (Math.random() - 0.5) * Math.max(width * 0.5, 220),
                y: Math.random() * height * 0.85,
                r: Math.random() * 1.5 + 0.4,
                v: Math.random() * 0.14 + 0.04,
                p: Math.random() * Math.PI * 2,
            }));
            if (reduce) draw(0);
        };

        const observer = new ResizeObserver(resize);
        observer.observe(hero);
        resize();
        if (!reduce) frame = requestAnimationFrame(draw);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);

    const ratio = artwork ? artwork.width / artwork.height : 0.5;
    const shape = ratio > LANDSCAPE_RATIO ? "landscape" : "portrait";
    const style = {
        "--glow": artwork?.glow ?? "#edc95b",
        "--box-ar": Math.min(Math.max(ratio, 1.2), 1.8),
    } as CSSProperties;

    return (
        <section ref={heroRef} className={homeStyles.hero} data-shape={shape} data-tone={tone} style={style}>
            {artwork && (
                <div className={homeStyles.heroArt}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Sanity's CDN sizes it in the URL */}
                    <img
                        src={artwork.imageUrl}
                        alt=""
                        width={artwork.width}
                        height={artwork.height}
                        fetchPriority="high"
                        style={{
                            objectPosition: `${artwork.focusX}% ${artwork.focusY}%`,
                            // Enlarged around the hotspot, so what it marks stays in view.
                            transform: zoom > 1 ? `scale(${zoom})` : undefined,
                            transformOrigin: `${artwork.focusX}% ${artwork.focusY}%`,
                        }}
                    />
                </div>
            )}
            <div className={homeStyles.heroShade} aria-hidden="true" />
            <div className={homeStyles.heroTint} aria-hidden="true" />
            <div className={homeStyles.beamWrap} aria-hidden="true">
                <div ref={beamRef} className={homeStyles.beam} />
            </div>
            <canvas ref={dustRef} className={homeStyles.dust} aria-hidden="true" />

            <div className={homeStyles.heroText}>
                <h1 className={homeStyles.siteName}>St. John’s Gospel Arts</h1>
                {artwork && (
                    <div className={homeStyles.heroVerse}>
                        <Verse locale={locale} chinese={artwork.chinese} english={artwork.english} className={homeStyles.verse} />
                        <span className={homeStyles.reference}>
                            {artwork.reference}
                            {/* An artwork's English is always the ESV's, as in the gallery. */}
                            {artwork.english && <EsvMark />}
                        </span>
                    </div>
                )}
                <span className={homeStyles.rule} aria-hidden="true" />
                <div className={homeStyles.cta}>
                    {intro && <p className={homeStyles.intro}>{intro}</p>}
                    {intro && <span className={homeStyles.draftNote}>{note}</span>}
                    <Link href="/gallery" className={homeStyles.enter}>
                        {button}
                    </Link>
                </div>
            </div>
        </section>
    );
}
