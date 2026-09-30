"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "@/i18n/navigation";
import newsStyle from "./news.module.css";

export type FilterLink = { key: string; label: string; href: string; active: boolean };

/**
 * How many category pills fit beside All News and More, by breakpoint: none
 * on a phone, then one, two, and at most three. The rest live in More. Pure
 * CSS, so the server render is already right and nothing jumps on load.
 */
const PILL_FROM = [newsStyle.fromSm, newsStyle.fromMd, newsStyle.fromLg];
const ITEM_UNTIL = [newsStyle.untilSm, newsStyle.untilMd, newsStyle.untilLg];
const MORE_HIDDEN_FROM = [newsStyle.hideFromSm, newsStyle.hideFromMd, newsStyle.hideFromLg];
const ACTIVE_UNTIL = [newsStyle.activeUntilSm, newsStyle.activeUntilMd, newsStyle.activeUntilLg];
const MAX_PILLS = PILL_FROM.length;

/** All News, up to three category pills, and More for the rest. */
export default function NewsFilters({
    all,
    categories,
    moreLabel,
    label,
}: {
    all: FilterLink;
    categories: FilterLink[];
    moreLabel: string;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const wrapper = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const panelId = useId();

    const selectedIndex = categories.findIndex((category) => category.active);
    const selected = selectedIndex >= 0 ? categories[selectedIndex] : null;

    useEffect(() => {
        if (!open) return;
        const close = (event: PointerEvent) => {
            if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [open]);

    // Opens under the trigger, or flush with its right edge when that would
    // run past the page gutter, and grows out of the trigger's centre. Set on
    // the element, not in state, so it applies before paint; measured without
    // the opening scale, which would skew a bounding box.
    useLayoutEffect(() => {
        const element = panel.current;
        const wrap = wrapper.current;
        const button = trigger.current;
        if (!open || !element || !wrap || !button) return;
        const alignEnd = wrap.getBoundingClientRect().left + element.offsetWidth > document.documentElement.clientWidth - 16;
        element.classList.toggle(newsStyle.morePanelEnd, alignEnd);
        const centre = button.offsetWidth / 2;
        element.style.transformOrigin = alignEnd ? `calc(100% - ${centre}px) top` : `${centre}px top`;
    }, [open]);

    /** The entries shown at this width; the rest are pills and hidden by CSS. */
    const items = () =>
        Array.from(wrapper.current?.querySelectorAll<HTMLAnchorElement>("[role=list] a") ?? []).filter(
            (link) => link.offsetParent !== null,
        );

    const focusItem = (pick: (links: HTMLAnchorElement[], current: number) => number) => {
        const links = items();
        if (links.length === 0) return;
        const current = links.indexOf(document.activeElement as HTMLAnchorElement);
        links[(pick(links, current) + links.length) % links.length]?.focus();
    };

    const onTriggerKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        setOpen(true);
        const toEnd = event.key === "ArrowUp";
        requestAnimationFrame(() => focusItem((links) => (toEnd ? links.length - 1 : 0)));
    };

    const onPanelKeyDown = (event: KeyboardEvent) => {
        const moves: Record<string, (links: HTMLAnchorElement[], current: number) => number> = {
            ArrowDown: (_, current) => current + 1,
            ArrowUp: (_, current) => current - 1,
            Home: () => 0,
            End: (links) => links.length - 1,
        };
        if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            trigger.current?.focus();
        } else if (moves[event.key]) {
            event.preventDefault();
            focusItem(moves[event.key]);
        }
    };

    const pillClass = (link: FilterLink, extra = "") =>
        [newsStyle.pill, link.active ? newsStyle.pillActive : "", extra].filter(Boolean).join(" ");

    const overflow = categories.length > 0;

    return (
        <nav className={newsStyle.filters} aria-label={label}>
            <Link href={all.href} className={pillClass(all)} aria-current={all.active ? "page" : undefined}>
                {all.label}
            </Link>

            {categories.slice(0, MAX_PILLS).map((category, index) => (
                <Link
                    key={category.key}
                    href={category.href}
                    className={pillClass(category, PILL_FROM[index])}
                    aria-current={category.active ? "page" : undefined}
                >
                    {category.label}
                </Link>
            ))}

            {overflow && (
                <div
                    ref={wrapper}
                    className={[newsStyle.more, MORE_HIDDEN_FROM[categories.length - 1] ?? ""].join(" ")}
                    onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
                    }}
                >
                    <button
                        ref={trigger}
                        type="button"
                        className={[
                            newsStyle.pill,
                            newsStyle.moreTrigger,
                            selectedIndex < 0 ? "" : (ACTIVE_UNTIL[selectedIndex] ?? newsStyle.activeAlways),
                        ].join(" ")}
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpen((value) => !value)}
                        onKeyDown={onTriggerKeyDown}
                    >
                        <span className={newsStyle.moreText}>{moreLabel}</span>
                        {selected && <span className={newsStyle.moreSelected}>{selected.label}</span>}
                        <ChevronDown aria-hidden="true" size={16} className={newsStyle.moreChevron} />
                    </button>

                    <div
                        ref={panel}
                        id={panelId}
                        className={[newsStyle.morePanel, open ? newsStyle.morePanelOpen : ''].join(' ')}
                        aria-hidden={!open}
                        onKeyDown={onPanelKeyDown}
                    >
                        <ul role="list">
                            {categories.map((category, index) => (
                                <li key={category.key} className={ITEM_UNTIL[index] ?? ""}>
                                    <Link
                                        href={category.href}
                                        className={category.active ? newsStyle.moreItemActive : undefined}
                                        aria-current={category.active ? "page" : undefined}
                                        onClick={() => setOpen(false)}
                                    >
                                        {category.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </nav>
    );
}
