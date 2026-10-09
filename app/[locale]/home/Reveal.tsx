"use client";

import { useEffect, useRef, type ReactNode } from "react";
import homeStyles from "./home.module.css";

/**
 * Rises and fades its section in the first time it scrolls into view, once
 * per page load. Hidden in CSS until then; `noscript` in page.tsx shows it.
 * A section already scrolled past, as when a reload restores the position
 * further down, just shows.
 */
export default function Reveal({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        // Sections open with up to 150px of padding, so watch their first content, not their box.
        const first = el?.firstElementChild?.firstElementChild;
        if (!el || !first) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                el.classList.add(entry.boundingClientRect.top < 0 ? homeStyles.revealNow : homeStyles.revealIn);
                observer.disconnect();
            },
            // Reaching far above the screen counts everything already passed.
            { rootMargin: "100000px 0px -15% 0px" },
        );
        observer.observe(first);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={homeStyles.reveal}>
            {children}
        </div>
    );
}
