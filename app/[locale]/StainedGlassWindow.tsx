import type { CSSProperties } from "react";
import { PROTECTED_ARTWORK } from "@/lib/protectedArtwork";
import type { FeaturedArtwork } from "@/lib/sanity/getRandomArtwork";
import styles from "./not-found.module.css";

/*
 * A small lancet window: an artwork behind diamond leading, inside a border of
 * gold glass, with light-gold vines climbing the frame to a flower at the
 * point of the arch. All one SVG: the picture is an <image> clipped to the
 * same arch the frame is drawn from, placed around its own subject.
 */

const W = 400;
const H = 480;
/** The window's sides, where the arch springs, and its sill: about 4 wide to 5 high. */
const X0 = 55;
const X1 = 345;
const SPRING = 238;
const SILL = 432;
const MID = (X0 + X1) / 2;
/**
 * A drop arch: each side's arc centred inside the window rather than on the
 * opposite side, which keeps a wide window's point low. Any radius above half
 * the width makes a pointed arch; the width itself would be equilateral.
 */
const R = 170;
/** Where each arc is centred: the left arc right of the middle, the right arc left of it. */
const CENTRE_L = X0 + R;
const CENTRE_R = X1 - R;
/** Width of the gold-glass border. */
const BAND = 10;

const apexY = (r: number) => SPRING - Math.sqrt(r * r - (CENTRE_L - MID) ** 2);
const deg = (d: number) => (d * Math.PI) / 180;
const f = (n: number) => n.toFixed(1);

/** The arch outline, inset by `d` from the window's edge. */
function lancet(d: number, bottom = SILL - d): string {
    const r = R - d;
    return `M${f(X0 + d)} ${f(bottom)}L${f(X0 + d)} ${SPRING}A${f(r)} ${f(r)} 0 0 1 ${MID} ${f(apexY(r))}A${f(r)} ${f(r)} 0 0 1 ${f(X1 - d)} ${SPRING}L${f(X1 - d)} ${f(bottom)}Z`;
}

/** A point on one arch arc, by its angle about that arc's centre. */
function onArc(side: "left" | "right", r: number, angle: number): [number, number] {
    const cx = side === "left" ? CENTRE_L : CENTRE_R;
    return [cx + r * Math.cos(deg(angle)), SPRING - r * Math.sin(deg(angle))];
}

/** Where each arc meets the apex, as an angle about its centre. */
const apexAngle = (r: number) => (Math.acos((MID - CENTRE_L) / r) * 180) / Math.PI;

/** Gold glass of varying depth: each pane's opacity, in a run with no two neighbours alike. */
const GLASS = [0.9, 0.55, 0.75, 0.4, 0.65, 0.85, 0.5];

/** The border band, cut into panes of gold glass. */
function borderPanes(): { d: string; depth: number }[] {
    const panes: { d: string; depth: number }[] = [];
    const outer = R;
    const inner = R - BAND;
    let i = 0;
    const sideSteps = 3;
    const step = (SILL - SPRING) / sideSteps;
    for (const side of ["left", "right"] as const) {
        const x = side === "left" ? X0 : X1 - BAND;
        for (let s = 0; s < sideSteps; s++) {
            const y = SPRING + s * step;
            panes.push({ d: `M${x} ${f(y)}h${BAND}v${f(step)}h${-BAND}Z`, depth: GLASS[i++ % GLASS.length] });
        }
        // The arc, from the springing to the apex, in four panes.
        const from = side === "left" ? 180 : 0;
        const to = side === "left" ? apexAngle(outer) : 180 - apexAngle(outer);
        const toInner = side === "left" ? apexAngle(inner) : 180 - apexAngle(inner);
        for (let s = 0; s < 4; s++) {
            const a0 = from + ((to - from) * s) / 4;
            const a1 = from + ((to - from) * (s + 1)) / 4;
            const b0 = from + ((toInner - from) * s) / 4;
            const b1 = from + ((toInner - from) * (s + 1)) / 4;
            const [p0x, p0y] = onArc(side, outer, a0);
            const [p1x, p1y] = onArc(side, outer, a1);
            const [q1x, q1y] = onArc(side, inner, b1);
            const [q0x, q0y] = onArc(side, inner, b0);
            const sweep = side === "left" ? 1 : 0;
            panes.push({
                d: `M${f(p0x)} ${f(p0y)}A${outer} ${outer} 0 0 ${sweep} ${f(p1x)} ${f(p1y)}L${f(q1x)} ${f(q1y)}A${inner} ${inner} 0 0 ${1 - sweep} ${f(q0x)} ${f(q0y)}Z`,
                depth: GLASS[i++ % GLASS.length],
            });
        }
    }
    // And along the foot, between the two sides.
    const footSteps = 3;
    const footStep = (X1 - X0 - 2 * BAND) / footSteps;
    for (let s = 0; s < footSteps; s++) {
        const x = X0 + BAND + s * footStep;
        panes.push({ d: `M${f(x)} ${SILL - BAND}h${f(footStep)}v${BAND}h${f(-footStep)}Z`, depth: GLASS[i++ % GLASS.length] });
    }
    return panes;
}

/** Diamond quarries over the picture, the way plain glass is leaded. */
function quarries(): string {
    const gap = 44;
    let d = "";
    for (let k = -H; k < W + H; k += gap) {
        d += `M${k} 0L${k + H} ${H}M${k} ${H}L${k + H} 0`;
    }
    return d;
}

// ------------------------------------------------------------------ vines

type Point = { x: number; y: number; angle: number };

/** Points up one side of the frame and over the arch to near the apex, a little outside it. */
function vineRoute(side: "left" | "right", offset: number): Point[] {
    const dir = side === "left" ? -1 : 1;
    const x = (side === "left" ? X0 : X1) + dir * offset;
    const points: Point[] = [];
    for (let y = SILL + 18; y >= SPRING; y -= 4) points.push({ x, y, angle: -90 });
    const r = R + offset;
    const from = side === "left" ? 180 : 0;
    // Stop just short of the apex, where the flower sits: the left arc's angle falls towards it, the right's rises.
    const to = side === "left" ? apexAngle(r) + 3 : 180 - apexAngle(r) - 3;
    const steps = 40;
    for (let s = 1; s <= steps; s++) {
        const a = from + ((to - from) * s) / steps;
        const [px, py] = onArc(side, r, a);
        const tangent = side === "left" ? a - 90 : a + 90;
        points.push({ x: px, y: py, angle: -tangent });
    }
    return points;
}

/** The vine itself: the route, swaying gently either side of it; `phase` offsets a second strand to twine round the first. */
function vinePath(points: Point[], side: "left" | "right", phase = 0, reach = 5): string {
    return points
        .map((p, i) => {
            const sway = Math.sin(i / 7 + phase) * reach;
            const normal = deg(p.angle + 90);
            const x = p.x + Math.cos(normal) * sway * (side === "left" ? 1 : -1);
            const y = p.y + Math.sin(normal) * sway;
            return `${i ? "L" : "M"}${f(x)} ${f(y)}`;
        })
        .join("");
}

/** An almond leaf, base at the origin, pointing along +x. */
const LEAF = "M0 0C5 -6 13 -6 18 0C13 5 5 5 0 0Z";
/** A five-petal flower of radius 1, centred at the origin. */
const FLOWER = Array.from({ length: 5 }, (_, i) => {
    const a = deg(i * 72 - 90);
    const [x, y] = [Math.cos(a), Math.sin(a)];
    return `M0 0Q${f((x - y) * 0.9)} ${f((y + x) * 0.9)} ${f(x * 1.6)} ${f(y * 1.6)}Q${f((x + y) * 0.9)} ${f((y - x) * 0.9)} 0 0Z`;
}).join("");

/** A tendril: a short stalk ending in a curl, drawn from the origin along +x. */
const TENDRIL = "M0 0C6 -2 11 -8 10 -13C9 -17 4 -16 4 -12C4 -9 8 -9 8 -11";

function Vine({ side }: { side: "left" | "right" }) {
    const route = vineRoute(side, 22);
    const mirror = side === "left" ? -1 : 1;
    // Leaves in pairs and singles along the stem, larger low down, smaller near the apex.
    const leaves = route
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => i % 5 === 2 && i < route.length - 4);
    const tendrils = route.filter((_, i) => i % 23 === 11 && i < route.length - 8);
    return (
        <g className={styles.vine}>
            <path className={styles.stem} d={vinePath(route, side)} pathLength={1} />
            <path className={styles.twine} d={vinePath(route, side, Math.PI, 7)} pathLength={1} />
            {leaves.map(({ p, i }, n) => {
                const out = n % 2 === 0 ? 1 : -1;
                const turn = mirror * out * (48 + (n % 3) * 10);
                const size = Math.max(0.55, 1.15 - (i / route.length) * 0.55) * (n % 4 === 1 ? 0.8 : 1);
                return (
                    <path
                        key={i}
                        className={styles.leaf}
                        d={LEAF}
                        style={{ "--d": `${0.5 + (i / route.length) * 2}s` } as CSSProperties}
                        transform={`translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.angle + turn)}) scale(${size.toFixed(2)})`}
                    />
                );
            })}
            {tendrils.map((p, n) => (
                <path
                    key={n}
                    className={styles.tendril}
                    d={TENDRIL}
                    style={{ "--d": `${1 + n * 0.3}s` } as CSSProperties}
                    transform={`translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.angle + mirror * (n % 2 ? 70 : -70))}) scale(${n % 2 ? 1 : -1} 1)`}
                />
            ))}
        </g>
    );
}

function Flower({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
    return (
        <g
            className={styles.flower}
            style={{ "--d": `${delay}s` } as CSSProperties}
            transform={`translate(${f(x)} ${f(y)}) scale(${size})`}
        >
            <path d={FLOWER} className={styles.petals} />
            <circle r={0.38} className={styles.heart} />
        </g>
    );
}

/**
 * Where the picture goes so that it covers the opening, as `object-fit: cover`
 * would, with its subject kept in view. Done here because an SVG image can
 * only be centred or aligned to an edge, not placed at a focus point.
 */
function coverPlacement(box: { x: number; y: number; w: number; h: number }, ratio: number, focus: { x: number; y: number }) {
    const wide = ratio > box.w / box.h;
    const w = wide ? box.h * ratio : box.w;
    const h = wide ? box.h : box.w / ratio;
    return { x: box.x + (box.w - w) * (focus.x / 100), y: box.y + (box.h - h) * (focus.y / 100), w, h };
}

export default function StainedGlassWindow({ artwork }: { artwork: FeaturedArtwork }) {
    const innerApex = apexY(R - BAND);
    const box = { x: X0 + BAND, y: innerApex, w: X1 - X0 - 2 * BAND, h: SILL - BAND - innerApex };
    const picture = coverPlacement(box, artwork.ratio, artwork.focus);
    const apex = apexY(R + 22);

    return (
        <div className={styles.stage} style={{ "--glow": artwork.glow } as CSSProperties}>
            {/*
              Picture, leading and frame in one SVG, so they share one set of
              coordinates and the picture fits the window at any size, in any
              browser; nothing has to line an HTML element up with a drawing.
            */}
            {/* Decoration: the scripture and reference beneath say what the artwork is. */}
            <svg className={styles.frame} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" {...PROTECTED_ARTWORK}>
                <defs>
                    <clipPath id="nf-inner">
                        <path d={lancet(BAND)} />
                    </clipPath>
                    {/* Glass lifts a painting's colour a little. An SVG filter, as Safari ignores CSS filters on SVG. */}
                    <filter id="nf-glass" colorInterpolationFilters="sRGB">
                        <feColorMatrix type="saturate" values="1.15" />
                    </filter>
                    {/* A soft halo round the flowers: their own colour, blurred, beneath them. */}
                    <filter id="nf-glow" x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
                        <feComponentTransfer in="blur" result="halo">
                            <feFuncA type="linear" slope="0.85" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode in="halo" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="nf-sheen" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#fff6da" stopOpacity="0.22" />
                        <stop offset="0.45" stopColor="#fff6da" stopOpacity="0" />
                        <stop offset="1" stopColor="#09090e" stopOpacity="0.25" />
                    </linearGradient>
                </defs>

                {/* The picture, clipped to the opening. */}
                <g clipPath="url(#nf-inner)">
                        <rect x={box.x} y={box.y} width={box.w} height={box.h} className={styles.paneBack} />
                        <image
                            href={artwork.imageUrl}
                            x={f(picture.x)}
                            y={f(picture.y)}
                            width={f(picture.w)}
                            height={f(picture.h)}
                            preserveAspectRatio="none"
                            filter="url(#nf-glass)"
                        />
                </g>

                {/* Diamond leading and a sheen of glass over the picture. */}
                <g clipPath="url(#nf-inner)" className={styles.overlay}>
                    <path d={quarries()} className={styles.quarry} />
                    <rect x="0" y="0" width={W} height={H} fill="url(#nf-sheen)" />
                </g>

                {/* The border of gold glass, each pane leaded. */}
                {borderPanes().map((pane, i) => (
                    <path key={i} d={pane.d} fillOpacity={pane.depth} className={styles.glass} />
                ))}
                <path d={lancet(BAND)} className={styles.lead} />
                <path d={lancet(0)} className={styles.lead} />

                {/* The stone, picked out in gold, and its sill. */}
                <path d={lancet(-7, SILL + 7)} className={styles.mould} />
                <path d={`M${X0 - 24} ${SILL + 14}H${X1 + 24}`} className={styles.sill} />

                <Vine side="left" />
                <Vine side="right" />
                {/* One filter for all of them, outside their scaling, so the halo is the same width on each. */}
                <g filter="url(#nf-glow)">
                <Flower x={MID} y={apex - 12} size={14} delay={2.4} />
                <Flower x={MID - 22} y={apex + 4} size={6} delay={2.6} />
                <Flower x={MID + 22} y={apex + 4} size={6} delay={2.7} />
                <Flower x={X0 - 24} y={SPRING - 10} size={10} delay={1.7} />
                <Flower x={X1 + 24} y={SPRING - 10} size={10} delay={1.8} />
                <Flower x={X0 - 34} y={(SPRING + SILL) / 2 + 24} size={7} delay={1.2} />
                <Flower x={X1 + 34} y={(SPRING + SILL) / 2 - 30} size={7} delay={1.3} />
                <Flower x={X0 - 22} y={SILL + 10} size={11} delay={0.6} />
                <Flower x={X1 + 22} y={SILL + 10} size={11} delay={0.7} />
                <Flower x={X0 - 44} y={SILL + 4} size={6} delay={0.9} />
                <Flower x={X1 + 44} y={SILL + 4} size={6} delay={1.0} />
                </g>
            </svg>
        </div>
    );
}
