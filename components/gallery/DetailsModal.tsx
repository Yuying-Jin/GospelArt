'use client'

import {ChevronDown, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import FullscreenImage, {type FullscreenPhase} from '@/components/FullscreenImage';
import ShareButton from '@/components/ShareButton';
import {flip} from '@/lib/flip';
import {preloadImage, wait} from '@/lib/preloadImage';
import {localizeReference} from '@/lib/scripture/citation';
import type {Artwork, ArtworkSectionText} from '@/types/artwork';

type Props = {
    artwork: Artwork;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    isFirst: boolean;
    isLast: boolean;
};

const SWIPE_THRESHOLD = 50;
const MORPH_MS = 480;
// Prev/next: the current artwork slides out towards the one it gives way to
// while the next slides in from the other side, the two overlapping.
const SWITCH_OUT_MS = 320;
// Text overlapping text reads as clutter, so the old text leaves sooner than
// the old picture; the pictures still cross.
const SWITCH_TEXT_OUT_MS = 160;
const SWITCH_IN_MS = 300;
const SWITCH_SHIFT = 24;

/**
 * A copy of `element` pinned where it is on screen, above the modal, to stand
 * in for it while the real one changes underneath. Its styles are scoped by
 * class alone, so the copy looks the same outside the modal.
 */
function standIn(element: HTMLElement): HTMLElement {
    const rect = element.getBoundingClientRect();
    const copy = element.cloneNode(true) as HTMLElement;
    copy.removeAttribute('id');
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    Object.assign(copy.style, {
        position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
        margin: '0', zIndex: '1001', pointerEvents: 'none', boxSizing: 'border-box',
    });
    document.body.appendChild(copy);
    return copy;
}
// Even in and out, so the flight reads as movement rather than a flash.
const MORPH_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const cardFor = (slug: string) => document.querySelector<HTMLElement>(`[data-artwork-slug="${CSS.escape(slug)}"]`);

const isLoaded = (img: HTMLImageElement | null | undefined): boolean =>
    Boolean(img && img.complete && img.naturalWidth > 0);

/** The grid card's picture for an artwork, when it has loaded. */
function cardImageFor(slug: string): HTMLImageElement | null {
    const img = cardFor(slug)?.querySelector('img') ?? null;
    return isLoaded(img) ? img : null;
}

const onScreen = (rect: DOMRect) => rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;

/** Resolves once `img` has a laid-out size, or false if that takes longer than `timeout`. */
async function hasSize(img: HTMLImageElement, timeout = 350): Promise<boolean> {
    if (img.getBoundingClientRect().width > 4) return true;
    const decoded = await Promise.race([
        img.decode().then(() => true, () => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeout)),
    ]);
    return decoded && img.getBoundingClientRect().width > 4;
}

/**
 * Carries the picture between a grid card and the modal. Opening, a copy of
 * the card's picture (already loaded, unlike the modal's full-size one) grows
 * from the card to its place while the backdrop darkens, and the text and
 * controls fade in from halfway. Closing, it flies back while they fade out
 * faster, so the grid is clear by the time it lands.
 */
async function morph(modal: HTMLElement, cardImg: HTMLImageElement, opening: boolean) {
    const target = modal.querySelector<HTMLElement>('.image-column img');
    const backdrop = modal.querySelector<HTMLElement>('.details-backdrop');
    if (!target || !backdrop) return;
    const controls = Array.from(modal.querySelectorAll<HTMLElement>('.info-column, .close-details, .paging'));

    const to = target.getBoundingClientRect();
    const start = flip(cardImg.getBoundingClientRect(), to);

    // Laid out where the modal's picture is, then transformed onto the card's.
    const ghost = document.createElement('img');
    ghost.src = cardImg.currentSrc || cardImg.src;
    ghost.alt = '';
    Object.assign(ghost.style, {
        position: 'fixed', left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
        margin: '0', objectFit: 'cover', zIndex: '1050', pointerEvents: 'none', transformOrigin: 'center center',
    });
    // The modal's picture has a gold rule and glow the card's lacks. The copy
    // takes them on during the flight, so it lands looking exactly like the
    // picture it hands over to, instead of the glow popping in at the swap.
    const card = getComputedStyle(cardImg);
    const framed = getComputedStyle(target);
    Object.assign(ghost.style, {
        boxSizing: 'border-box',
        borderStyle: framed.borderTopStyle,
        borderWidth: framed.borderTopWidth,
        borderRadius: framed.borderTopLeftRadius,
    });
    document.body.appendChild(ghost);
    target.style.visibility = 'hidden';

    const flight = [
        {transform: start.transform, clipPath: start.clipPath, boxShadow: card.boxShadow, borderColor: card.borderTopColor},
        // Clipped outward at the end, or the clip would cut the glow off.
        {transform: 'none', clipPath: 'inset(-80px -80px)', boxShadow: framed.boxShadow, borderColor: framed.borderTopColor},
    ];
    const shown = [{opacity: 0}, {opacity: 1}];
    const hidden = [{opacity: 1}, {opacity: 0}];
    const animations = opening
        ? [
              ghost.animate(flight, {duration: MORPH_MS, easing: MORPH_EASE, fill: 'both'}),
              backdrop.animate(shown, {duration: MORPH_MS, easing: 'ease-out', fill: 'both'}),
              ...controls.map((control) =>
                  control.animate(shown, {duration: MORPH_MS * 0.5, delay: MORPH_MS * 0.5, easing: 'ease-out', fill: 'both'}),
              ),
          ]
        : [
              ghost.animate([...flight].reverse(), {duration: MORPH_MS * 0.85, easing: MORPH_EASE, fill: 'both'}),
              backdrop.animate(hidden, {duration: MORPH_MS * 0.6, easing: 'ease-in', fill: 'both'}),
              ...controls.map((control) => control.animate(hidden, {duration: MORPH_MS * 0.4, easing: 'ease-in', fill: 'both'})),
          ];

    try {
        await Promise.all(animations.map((animation) => animation.finished));
    } finally {
        ghost.remove();
        if (opening) {
            target.style.visibility = '';
            animations.forEach((animation) => animation.cancel());
        }
    }
}

export default function DetailsModal({ artwork, onClose, onPrev, onNext, isFirst, isLast }: Props) {

    const t = useTranslations('public.gallery.card');
    const tModal = useTranslations('public.gallery.modal');
    const locale = useLocale();
    // Unlike scripture, section content renders in the UI locale alone.
    const sectionLocale: keyof ArtworkSectionText =
        locale === 'zh-TW' ? 'zh-TW' : locale === 'zh-CN' ? 'zh-CN' : 'en';
    const reference = localizeReference(artwork.bible_reference, locale);

    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef(false);
    const openedSlugRef = useRef(artwork.slug);
    // The grid's thumbnail is already loaded, so it shows at once and gives the
    // picture its size; the full-size image replaces it once downloaded.
    const [loadedFull, setLoadedFull] = useState<string | null>(null);
    const thumbnail = artwork.thumbnail_path || artwork.image_path || '';
    const displaySrc = loadedFull && loadedFull === artwork.image_path ? loadedFull : thumbnail;
    const touchStartXRef = useRef<number | null>(null);
    // Mirrored from FullscreenImage so Escape closes one level at a time.
    const [viewerPhase, setViewerPhase] = useState<FullscreenPhase>('closed');
    // Collapsed rather than open ids, so sections start expanded; reset on
    // prev/next, which reuses this instance for the next artwork.
    const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(() => new Set());
    const [sectionsArtwork, setSectionsArtwork] = useState(artwork.slug);
    if (sectionsArtwork !== artwork.slug) {
        setSectionsArtwork(artwork.slug);
        setCollapsedSectionIds(new Set());
    }

    const toggleSection = (id: string) => {
        setCollapsedSectionIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Swapped in only once decoded, so the swap never paints a blank frame.
    useEffect(() => {
        const full = artwork.image_path;
        if (!full) return;
        let cancelled = false;
        void preloadImage(full).then(() => {
            if (!cancelled) setLoadedFull(full);
        });
        return () => {
            cancelled = true;
        };
    }, [artwork.image_path]);

    const switchRef = useRef<{direction: 1 | -1} | null>(null);
    const shownSlugRef = useRef(artwork.slug);
    const switchTargets = () =>
        Array.from(modalRef.current?.querySelectorAll<HTMLElement>('.image-column img, .info-panel') ?? []);

    /**
     * Prev/next with a crossfade: copies of the picture and text take their
     * place and slide out, while the real ones, hidden, change to the next
     * artwork and slide in once its picture is decoded (the effect below).
     * The two overlap, so the screen is never empty, and the swap itself
     * happens out of sight, so the picture never flashes through its
     * thumbnail or its change of size.
     */
    const go = useCallback((direction: 1 | -1) => {
        if (direction === 1 ? isLast : isFirst) return;
        if (switchRef.current) return;
        const change = direction === 1 ? onNext : onPrev;
        if (prefersReducedMotion()) {
            change();
            return;
        }
        switchRef.current = {direction};

        for (const element of switchTargets()) {
            const copy = standIn(element);
            element.style.opacity = '0';
            void copy
                .animate(
                    [{opacity: 1, transform: 'none'}, {opacity: 0, transform: `translateX(${-direction * SWITCH_SHIFT}px)`}],
                    {duration: element.tagName === 'IMG' ? SWITCH_OUT_MS : SWITCH_TEXT_OUT_MS, easing: 'ease-in-out', fill: 'forwards'},
                )
                .finished.catch(() => undefined)
                .then(() => copy.remove());
        }
        change();

        // Should the change never land (a failed server lookup), show what is there.
        const pending = switchRef.current;
        setTimeout(() => {
            if (switchRef.current !== pending) return;
            switchRef.current = null;
            switchTargets().forEach((element) => {
                element.style.opacity = '';
            });
        }, 3000);
    }, [isFirst, isLast, onNext, onPrev]);

    useLayoutEffect(() => {
        if (shownSlugRef.current === artwork.slug) return;
        shownSlugRef.current = artwork.slug;
        const pending = switchRef.current;
        if (!pending) return;

        let cancelled = false;
        const full = artwork.image_path;
        const target = modalRef.current?.querySelector<HTMLImageElement>('.image-column img');
        void (async () => {
            // The full-size picture if it arrives in time, so there is no
            // later swap from the thumbnail; the thumbnail otherwise.
            if (full) {
                await Promise.race([
                    preloadImage(full).then(() => {
                        if (!cancelled) setLoadedFull(full);
                    }),
                    wait(350),
                ]);
            }
            await new Promise((resolve) => requestAnimationFrame(resolve));
            if (target) await Promise.race([target.decode().catch(() => undefined), wait(200)]);
            if (cancelled) return;

            for (const element of switchTargets()) {
                element.style.opacity = '';
                element.animate(
                    [{opacity: 0, transform: `translateX(${pending.direction * SWITCH_SHIFT}px)`}, {opacity: 1, transform: 'none'}],
                    {duration: SWITCH_IN_MS, easing: 'ease-out'},
                );
            }
            switchRef.current = null;
        })();
        return () => {
            cancelled = true;
        };
    }, [artwork.slug, artwork.image_path]);

    // Grow out of the card that was clicked, when it is on screen; otherwise
    // the stylesheet's own fade-in plays. The modal stays hidden until its
    // picture has a size to grow to, which the thumbnail gives within a frame
    // or two; if it does not, it simply fades in.
    useLayoutEffect(() => {
        const modal = modalRef.current;
        const target = modal?.querySelector<HTMLImageElement>('.image-column img');
        const cardImg = openedSlugRef.current ? cardImageFor(openedSlugRef.current) : null;
        if (!modal || !target || !cardImg || prefersReducedMotion() || !onScreen(cardImg.getBoundingClientRect())) return;

        let cancelled = false;
        modal.style.animation = 'none';
        modal.style.opacity = '0';
        void hasSize(target).then((ready) => {
            if (cancelled) return;
            modal.style.opacity = '';
            if (ready) void morph(modal, cardImg, true);
            else modal.animate([{opacity: 0}, {opacity: 1}], {duration: 200, easing: MORPH_EASE});
        });
        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * Shrinks back into the current artwork's card, scrolling it into view if
     * prev/next moved away from it, then lets the gallery close the modal.
     * Without a card to return to, it fades out instead. The browser's Back
     * button unmounts the modal directly, so it closes without either.
     */
    const requestClose = useCallback(async () => {
        const modal = modalRef.current;
        if (closingRef.current) return;
        closingRef.current = true;
        try {
            if (modal && !prefersReducedMotion()) {
                const card = artwork.slug ? cardFor(artwork.slug) : null;
                const rect = card?.getBoundingClientRect();
                if (rect && !onScreen(rect)) {
                    window.scrollTo({top: window.scrollY + rect.top - (window.innerHeight - rect.height) / 2, behavior: 'instant'});
                }
                // A card far down the grid has not loaded its lazy picture yet;
                // on screen now, it starts, and gets a moment to finish.
                let cardImg: HTMLImageElement | null = card?.querySelector('img') ?? null;
                if (cardImg && !isLoaded(cardImg)) {
                    await Promise.race([cardImg.decode().catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 300))]);
                }
                if (!isLoaded(cardImg)) cardImg = null;
                if (cardImg && onScreen(cardImg.getBoundingClientRect())) {
                    await morph(modal, cardImg, false);
                } else {
                    await modal.animate([{opacity: 1}, {opacity: 0}], {duration: 200, easing: MORPH_EASE, fill: 'forwards'}).finished;
                }
            }
        } finally {
            onClose();
        }
    }, [artwork.slug, onClose]);

    // Hand focus back to Close once the viewer is fully gone.
    useEffect(() => {
        if (viewerPhase === 'closed') closeButtonRef.current?.focus();
    }, [viewerPhase]);

    // Prevent the Gallery from scrolling behind the modal on mobile.
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                // The viewer closes itself; while it is up or closing, the
                // modal underneath stays.
                if (viewerPhase === 'closed') void requestClose();
            } else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'ArrowRight') go(1);
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewerPhase, requestClose, go]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartXRef.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
        if (deltaX > SWIPE_THRESHOLD) go(-1);
        else if (deltaX < -SWIPE_THRESHOLD) go(1);
        touchStartXRef.current = null;
    };

    const bibleThemes = artwork.bibleThemes ?? [];
    const spiritualThemes = artwork.spiritualThemes ?? [];
    const sections = artwork.sections ?? [];

    return (
        <div ref={modalRef} className="details-modal" role="dialog" aria-modal="true" aria-label={reference}>
            <div className="details-backdrop" aria-hidden="true" />
            <button
                ref={closeButtonRef}
                className="close-details"
                onClick={() => void requestClose()}
                aria-label={tModal('close')}
            >
                <X size={20} strokeWidth={1.75} />
            </button>

            <div className="details-content">
                <div
                    className="image-column"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <button
                        className="paging prev"
                        onClick={() => go(-1)}
                        disabled={isFirst}
                        aria-label={tModal('previous')}
                    >
                        <ChevronLeft size={22} strokeWidth={1.75} />
                    </button>
                    <FullscreenImage
                        src={displaySrc}
                        fullSrc={artwork.image_path || undefined}
                        alt={reference}
                        width={artwork.image_width}
                        height={artwork.image_height}
                        className="details-image"
                        onSwipePrev={() => go(-1)}
                        onSwipeNext={() => go(1)}
                        onPhaseChange={setViewerPhase}
                    />
                    <button
                        className="paging next"
                        onClick={() => go(1)}
                        disabled={isLast}
                        aria-label={tModal('next')}
                    >
                        <ChevronRight size={22} strokeWidth={1.75} />
                    </button>
                </div>

                <div className="info-column">
                    <div className="info-panel">
                        <p className="verse-chinese">{artwork.scripture_chinese}</p>
                        {artwork.scripture_english && (
                            <p className="verse-english">
                                {artwork.scripture_english}
                                {/* Crossway requires the ESV designation *and* a link to
                                    esv.org on every page that displays ESV text. */}
                                <a
                                    className="esv-credit"
                                    href="https://www.esv.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    (ESV)
                                </a>
                            </p>
                        )}
                        <p className="meta">
                            <span>{t('bible_reference')}{reference}</span>
                            <span>{t('date')}{artwork.date}</span>
                        </p>

                        {(bibleThemes.length > 0 || spiritualThemes.length > 0) && (
                            <div className="tag-group">
                                {/*<span className="tag-group-label">{tModal('themes')}</span>*/}
                                <div className="tag-list">
                                    {bibleThemes.map((theme, i) => (
                                        <span
                                            key={`bible-${theme}-${i}`}
                                            className="tag tag-bible"
                                            aria-label={`${tModal('bible_themes')}: ${theme}`}
                                        >
                                            {theme}
                                        </span>
                                    ))}
                                    {spiritualThemes.map((theme, i) => (
                                        <span
                                            key={`spiritual-${theme}-${i}`}
                                            className="tag tag-spiritual"
                                            aria-label={`${tModal('spiritual_themes')}: ${theme}`}
                                        >
                                            {theme}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {sections.length > 0 && (
                            <div className="sections">
                                {sections.map((section) => {
                                    const isOpen = !collapsedSectionIds.has(section.id);
                                    const triggerId = `section-trigger-${section.id}`;
                                    const panelId = `section-panel-${section.id}`;
                                    return (
                                        <div className="section" key={section.id}>
                                            <h3 className="section-heading">
                                                <button
                                                    id={triggerId}
                                                    className="section-header"
                                                    onClick={() => toggleSection(section.id)}
                                                    aria-expanded={isOpen}
                                                    aria-controls={panelId}
                                                >
                                                    <span>{section.title[sectionLocale]}</span>
                                                    <span className={`chevron${isOpen ? ' open' : ''}`} aria-hidden="true">
                                                        <ChevronDown size={18} strokeWidth={1.75} />
                                                    </span>
                                                </button>
                                            </h3>
                                            {/* Always rendered, so closing can animate
                                                too; inert keeps a closed one out of
                                                the tab order and the accessibility tree. */}
                                            <div
                                                className={`section-panel${isOpen ? ' open' : ''}`}
                                                id={panelId}
                                                role="region"
                                                aria-labelledby={triggerId}
                                                inert={!isOpen}
                                            >
                                                <div className="section-body">
                                                    <div className="section-inner">
                                                        <p>{section.body[sectionLocale]}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <ShareButton
                            title={reference}
                            text={artwork.scripture_chinese}
                            label={tModal('share')}
                            copiedLabel={tModal('share_copied')}
                        />
                    </div>
                </div>
            </div>

            <style jsx>{`
              .details-modal {
                --fs-dur: 320ms;
                --fs-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
                --glass: rgba(14, 14, 22, 0.6);
                position: fixed;
                inset: 0;
                height: 100dvh;
                width: 100vw;
                z-index: 1000;
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
                animation: modal-in 260ms var(--fs-ease);
              }

              /* Its own layer, so it can darken on a different clock from the
                 content; nearly opaque, between the page's two darkest tones. */
              .details-backdrop {
                position: absolute;
                inset: 0;
                z-index: -1;
                background:
                  radial-gradient(ellipse 80% 60% at 30% 35%, rgba(237, 201, 91, 0.04), transparent 70%),
                  radial-gradient(ellipse 120% 90% at 50% 50%,
                    color-mix(in srgb, var(--color-bg-primary) 96%, transparent),
                    var(--color-bg-secondary));
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
              }

              @keyframes modal-in {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }

              .close-details,
              .paging {
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                border-radius: 50%;
                background: var(--glass);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                color: var(--text-primary);
                box-shadow: 0 6px 20px var(--shadow-strong);
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
                transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease,
                  transform 0.2s ease;
              }

              .close-details {
                position: absolute;
                top: calc(env(safe-area-inset-top) + 12px);
                right: calc(env(safe-area-inset-right) + 12px);
                width: 44px;
                height: 44px;
                z-index: 3;
              }

              .close-details:active {
                transform: scale(0.94);
              }

              .close-details:focus-visible,
              .paging:focus-visible,
              .section-header:focus-visible,
              .image-column :global(.details-image:focus-visible) {
                outline: 2px solid var(--color-gold-secondary);
                outline-offset: 3px;
              }

              .details-content {
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                padding: 64px 16px 32px;
                gap: 28px;
              }

              .image-column {
                position: relative;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                touch-action: pan-y;
              }

              .image-column :global(.details-image) {
                display: block;
                /* Keeps the box at the image's own ratio, which the FLIP scales to. */
                width: auto;
                height: auto;
                max-width: 100%;
                /* Tall paintings are bound by height, so it is given nearly all
                   of it; wide ones are bound by width and unaffected. */
                max-height: 85dvh;
                object-fit: contain;
                border: 1px solid var(--border-gold-medium);
                box-shadow:
                  0 0 0 6px rgba(237, 201, 91, 0.04),
                  0 24px 60px rgba(0, 0, 0, 0.6),
                  0 0 48px var(--glow-gold-soft);
                cursor: zoom-in;
                -webkit-tap-highlight-color: transparent;
              }

              .paging {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 48px;
                height: 48px;
                z-index: 2;
              }

              .paging:active {
                transform: translateY(-50%) scale(0.94);
              }

              .paging.prev {
                left: 8px;
              }

              .paging.next {
                right: 8px;
              }

              .paging:disabled {
                  opacity: 0.25;
                  cursor: not-allowed;
                  pointer-events: none;
              }

              .info-column {
                width: 100%;
                display: flex;
                justify-content: center;
              }

              .info-panel {
                width: 100%;
                max-width: 640px;
                text-align: center;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
              }

              .verse-chinese {
                font-size: 1.4rem;
                color: var(--color-gold-terniary);
                margin: 0 12px 12px;
                line-height: 1.75;
                letter-spacing: 0.04em;
                text-shadow: 0 0 24px rgba(237, 201, 91, 0.18);
              }

              .verse-english {
                font-size: 1.05rem;
                font-style: italic;
                color: var(--text-secondary);
                margin: 0 12px 20px;
                line-height: 1.65;
              }

              .esv-credit {
                margin-left: 0.35em;
                font-style: normal;
                font-size: 0.8em;
                letter-spacing: 0.06em;
                color: var(--text-tertiary);
                text-decoration: none;
                border-bottom: 1px dotted rgba(255, 255, 255, 0.35);
                transition: color 0.2s ease, border-color 0.2s ease;
              }

              .esv-credit:hover {
                color: var(--color-gold-secondary);
                border-bottom-color: var(--color-gold-secondary);
              }

              /* A gold hairline sets the citation off from the verse. */
              .meta {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 4px;
                font-size: 1rem;
                letter-spacing: 0.02em;
                color: var(--text-secondary);
                margin: 0 0 20px;
                padding-top: 18px;
              }

              .meta::before {
                content: "";
                position: absolute;
                top: 0;
                left: 50%;
                width: 96px;
                height: 1px;
                transform: translateX(-50%);
                background: linear-gradient(90deg, transparent, var(--color-gold-primary), transparent);
              }

              .tag-group {
                margin: 0 0 24px;
              }

              .tag-group-label {
                display: block;
                font-size: 0.75rem;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: var(--text-secondary);
                margin: 0 0 8px;
              }

              .tag-list {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px;
              }

              .tag {
                display: inline-flex;
                align-items: center;
                padding: 6px 14px;
                border-radius: 999px;
                font-size: 0.9rem;
                letter-spacing: 0.03em;
                border: 1px solid var(--border-gold-medium);
                color: var(--color-gold-secondary);
                background: rgba(255, 215, 0, 0.06);
                white-space: nowrap;
              }

              .tag-spiritual {
                border-color: rgba(255, 255, 255, 0.22);
                color: var(--text-secondary);
                background: rgba(255, 255, 255, 0.04);
              }

              .sections {
                width: 100%;
                margin: 0 0 28px;
                display: flex;
                flex-direction: column;
                gap: 10px;
              }

              .section {
                border: 1px solid var(--border-gold-light);
                border-radius: 12px;
                background: linear-gradient(180deg, rgba(30, 28, 40, 0.55), rgba(16, 16, 24, 0.45));
                box-shadow: inset 0 1px 0 rgba(255, 230, 135, 0.06), 0 8px 24px rgba(0, 0, 0, 0.25);
                overflow: hidden;
                transition: border-color 0.2s ease;
              }

              .section-heading {
                margin: 0;
                font-weight: normal;
              }

              .section-header {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                min-height: 52px;
                padding: 14px 18px;
                border: none;
                background: transparent;
                color: var(--color-gold-primary);
                font-family: inherit;
                font-size: 1.1rem;
                letter-spacing: 0.04em;
                text-align: left;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
                transition: color 0.2s ease;
              }

              .chevron {
                display: flex;
                color: var(--color-gold-soft);
                transition: transform 0.25s ease;
                flex-shrink: 0;
              }

              .chevron.open {
                transform: rotate(180deg);
              }

              /* Rows between 0fr and 1fr animate to the content's own height, so
                 nothing is hard-coded. Closing fades the text first, then folds. */
              .section-panel {
                display: grid;
                grid-template-rows: 0fr;
                opacity: 0;
                transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1) 0.06s, opacity 0.16s ease;
              }

              .section-panel.open {
                grid-template-rows: 1fr;
                opacity: 1;
                transition: grid-template-rows 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.24s ease 0.08s;
              }

              /* The padding is on the inner box: on this one it would hold the
                 panel open at 0fr. */
              .section-body {
                min-height: 0;
                overflow: hidden;
              }

              .section-inner {
                padding: 0 18px 18px;
                text-align: left;
              }

              .section-body p {
                margin: 0;
                padding-top: 14px;
                border-top: 1px solid var(--border-gold-light);
                font-size: 1.05rem;
                line-height: 1.85;
                color: var(--text-secondary);
                white-space: pre-line;
              }

              @media (hover: hover) {
                .close-details:hover,
                .paging:hover {
                  background: rgba(24, 22, 32, 0.8);
                  color: var(--color-gold-secondary);
                  box-shadow: 0 6px 20px var(--shadow-strong), 0 0 18px var(--glow-gold-soft);
                }

                .close-details:hover {
                  transform: scale(1.06);
                }

                .section:hover {
                  border-color: var(--border-gold-medium);
                }

                .section-header:hover {
                  color: var(--color-gold-secondary);
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .details-modal,
                .section-panel,
                .section-panel.open {
                  transition-duration: 0.01ms;
                  transition-delay: 0s;
                  animation-duration: 0.01ms;
                }

                .close-details:hover,
                .close-details:active {
                  transform: none;
                }

                .paging:active {
                  transform: translateY(-50%);
                }
              }

              @media (min-width: 768px) {
                .image-column :global(.details-image) {
                  max-height: 85dvh;
                }

                .close-details {
                  width: 48px;
                  height: 48px;
                  top: calc(env(safe-area-inset-top) + 20px);
                  right: calc(env(safe-area-inset-right) + 24px);
                }

                .paging {
                  width: 56px;
                  height: 56px;
                }

                /* Grows with the button; overrides lucide's size prop. */
                .paging svg {
                  width: 26px;
                  height: 26px;
                }

                .paging.prev {
                  left: 24px;
                }

                .paging.next {
                  right: 24px;
                }

                .verse-chinese {
                  font-size: 1.6rem;
                }

                .verse-english {
                  font-size: 1.2rem;
                }
              }

              /* Desktop: image pinned left, info panel scrolls on the right. */
              @media (min-width: 1024px) {
                .details-content {
                  display: grid;
                  grid-template-columns: minmax(0, 1.3fr) minmax(400px, 1fr);
                  height: 100%;
                  padding: 0;
                  gap: 0;
                  overflow: hidden;
                }

                .image-column {
                  height: 100%;
                  padding: 20px 56px;
                  box-sizing: border-box;
                }

                .image-column :global(.details-image) {
                  max-height: calc(100dvh - 40px);
                }

                .info-column {
                  height: 100%;
                  align-items: flex-start;
                  overflow-y: auto;
                  -webkit-overflow-scrolling: touch;
                  padding: 112px 64px 64px;
                  box-sizing: border-box;
                  background: linear-gradient(180deg, rgba(20, 20, 32, 0.55), rgba(10, 10, 16, 0.35));
                  box-shadow: inset 1px 0 0 var(--border-gold-light);
                }

                .info-panel {
                  max-width: 540px;
                  text-align: left;
                  align-items: flex-start;
                }

                .verse-chinese {
                  font-size: 1.6rem;
                  line-height: 1.7;
                  margin: 0 0 16px;
                }

                .verse-english {
                  font-size: 1.2rem;
                  line-height: 1.7;
                  margin: 0 0 28px;
                }

                .meta {
                  flex-direction: row;
                  justify-content: flex-start;
                  gap: 28px;
                  font-size: 1.05rem;
                  margin: 0 0 24px;
                  padding-top: 22px;
                }

                .meta::before {
                  left: 0;
                  width: 120px;
                  transform: none;
                  background: linear-gradient(90deg, var(--color-gold-primary), transparent);
                }

                .tag-list {
                  justify-content: flex-start;
                }

                .tag {
                  font-size: 0.95rem;
                }

                .section-header {
                  font-size: 1.2rem;
                  padding: 16px 22px;
                }

                .section-inner {
                  padding: 0 22px 22px;
                }

                .section-body p {
                  font-size: 1.12rem;
                }
              }
            `}</style>
        </div>
    );
}
