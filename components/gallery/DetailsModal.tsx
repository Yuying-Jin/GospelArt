'use client'

import {Check, ChevronDown, ChevronLeft, ChevronRight, Share2, X} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
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
// Mirrors --fs-dur below; a fallback for when transitionend never fires.
const FULLSCREEN_TRANSITION_MS = 320;

type ViewerPhase = 'closed' | 'open' | 'closing';

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    const fullscreenCloseButtonRef = useRef<HTMLButtonElement>(null);
    const touchStartXRef = useRef<number | null>(null);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
    // Local state only: the fullscreen view never touches the URL. 'closing'
    // keeps the overlay mounted for the exit animation.
    const [viewerPhase, setViewerPhase] = useState<ViewerPhase>('closed');
    const thumbImgRef = useRef<HTMLImageElement>(null);
    const fullImgRef = useRef<HTMLImageElement>(null);
    // Lets the fullscreen <img> be sized via aspect-ratio before it decodes,
    // which avoids a reflow mid-transition. State rather than a ref because the
    // overlay's first render needs it; it is set in the same handler that opens
    // the viewer, so both land in one render.
    const [fsAspectRatio, setFsAspectRatio] = useState<number | null>(null);
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

    const openFullscreen = () => {
        if (viewerPhase !== 'closed') return;
        const thumb = thumbImgRef.current;
        setFsAspectRatio(
            thumb?.naturalWidth && thumb?.naturalHeight
                ? thumb.naturalWidth / thumb.naturalHeight
                : null,
        );
        setViewerPhase('open');
    };

    const closeFullscreen = () => {
        // 'closing' exists only to keep the overlay mounted while the exit
        // transition plays, so with motion reduced there is nothing to wait for
        // and the phase goes straight to 'closed'.
        const next: ViewerPhase = prefersReducedMotion() ? 'closed' : 'closing';
        setViewerPhase((prev) => (prev === 'open' ? next : prev));
    };

    // Keep focus on whichever Close button is live, and only hand it back once
    // the exit animation has finished so it does not jump mid-transition.
    useEffect(() => {
        if (viewerPhase === 'open') {
            fullscreenCloseButtonRef.current?.focus();
        } else if (viewerPhase === 'closed') {
            closeButtonRef.current?.focus();
        }
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
                // One level at a time; repeats while closing are ignored so
                // the modal underneath does not close too.
                if (viewerPhase === 'open') closeFullscreen();
                else if (viewerPhase === 'closed') onClose();
            } else if (e.key === 'ArrowLeft') onPrev();
            else if (e.key === 'ArrowRight') onNext();
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewerPhase, onClose, onPrev, onNext]);

    // FLIP: pin the fullscreen image over the thumbnail with transitions off,
    // then release it next frame so it grows into place.
    useLayoutEffect(() => {
        if (viewerPhase !== 'open') return;
        const thumb = thumbImgRef.current;
        const full = fullImgRef.current;
        if (!thumb || !full) return;

        if (prefersReducedMotion()) {
            full.style.transition = 'none';
            full.style.transform = 'none';
            return;
        }

        const thumbRect = thumb.getBoundingClientRect();
        const finalRect = full.getBoundingClientRect();
        if (finalRect.width === 0 || finalRect.height === 0) return;

        const scaleX = thumbRect.width / finalRect.width;
        const scaleY = thumbRect.height / finalRect.height;
        const translateX = (thumbRect.left + thumbRect.width / 2) - (finalRect.left + finalRect.width / 2);
        const translateY = (thumbRect.top + thumbRect.height / 2) - (finalRect.top + finalRect.height / 2);

        full.style.transition = 'none';
        full.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

        let raf2 = 0;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                full.style.transition = '';
                full.style.transform = 'translate(0, 0) scale(1, 1)';
            });
        });
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [viewerPhase]);

    // The reverse, unmounting only once the transition has actually finished.
    useLayoutEffect(() => {
        if (viewerPhase !== 'closing') return;
        const thumb = thumbImgRef.current;
        const full = fullImgRef.current;
        if (!thumb || !full) {
            setViewerPhase('closed');
            return;
        }

        const thumbRect = thumb.getBoundingClientRect();
        const finalRect = full.getBoundingClientRect();

        const scaleX = thumbRect.width / finalRect.width;
        const scaleY = thumbRect.height / finalRect.height;
        const translateX = (thumbRect.left + thumbRect.width / 2) - (finalRect.left + finalRect.width / 2);
        const translateY = (thumbRect.top + thumbRect.height / 2) - (finalRect.top + finalRect.height / 2);

        full.style.transition = 'transform var(--fs-dur) var(--fs-ease)';
        full.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

        const handleTransitionEnd = (e: TransitionEvent) => {
            if (e.propertyName !== 'transform') return;
            setViewerPhase('closed');
        };
        full.addEventListener('transitionend', handleTransitionEnd);
        const fallback = window.setTimeout(() => setViewerPhase('closed'), FULLSCREEN_TRANSITION_MS + 80);

        return () => {
            full.removeEventListener('transitionend', handleTransitionEnd);
            window.clearTimeout(fallback);
        };
    }, [viewerPhase]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartXRef.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
        if (deltaX > SWIPE_THRESHOLD) onPrev();
        else if (deltaX < -SWIPE_THRESHOLD) onNext();
        touchStartXRef.current = null;
    };

    const handleShare = async () => {
        const shareUrl = window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: reference,
                    text: artwork.scripture_chinese,
                    url: shareUrl,
                });
            } catch {
                // user dismissed the native share sheet — nothing to do
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareStatus('copied');
            setTimeout(() => setShareStatus('idle'), 2000);
        } catch {
            // clipboard access unavailable — nothing to fall back to
        }
    };

    const bibleThemes = artwork.bibleThemes ?? [];
    const spiritualThemes = artwork.spiritualThemes ?? [];
    const sections = artwork.sections ?? [];

    return (
        <div className="details-modal" role="dialog" aria-modal="true" aria-label={reference}>
            <button
                ref={closeButtonRef}
                className="close-details"
                onClick={onClose}
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
                        onClick={onPrev}
                        disabled={isFirst}
                        aria-label={tModal('previous')}
                    >
                        <ChevronLeft size={22} strokeWidth={1.75} />
                    </button>
                    <img
                        ref={thumbImgRef}
                        src={artwork.image_path || undefined}
                        alt={reference}
                        width={artwork.image_width}
                        height={artwork.image_height}
                        className="details-image"
                        role="button"
                        tabIndex={0}
                        onClick={openFullscreen}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openFullscreen();
                            }
                        }}
                    />
                    <button
                        className="paging next"
                        onClick={onNext}
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
                                            {isOpen && (
                                                <div
                                                    className="section-body"
                                                    id={panelId}
                                                    role="region"
                                                    aria-labelledby={triggerId}
                                                >
                                                    <p>{section.body[sectionLocale]}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button className="share-button" onClick={handleShare}>
                            {shareStatus === 'copied'
                                ? <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                                : <Share2 size={16} strokeWidth={1.75} aria-hidden="true" />}
                            <span>{shareStatus === 'copied' ? tModal('share_copied') : tModal('share')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {viewerPhase !== 'closed' && (
                <div
                    className="fullscreen-viewer"
                    onClick={closeFullscreen}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className={`fullscreen-backdrop${viewerPhase === 'closing' ? ' closing' : ''}`} />
                    {/*<button*/}
                    {/*    ref={fullscreenCloseButtonRef}*/}
                    {/*    className="close-details close-fullscreen"*/}
                    {/*    onClick={closeFullscreen}*/}
                    {/*    aria-label={tModal('close')}*/}
                    {/*>*/}
                    {/*    ×*/}
                    {/*</button>*/}
                    <img
                        ref={fullImgRef}
                        src={artwork.image_path || undefined}
                        alt={reference}
                        className="fullscreen-image"
                        style={fsAspectRatio ? { aspectRatio: String(fsAspectRatio) } : undefined}
                    />
                </div>
            )}

            <style jsx>{`
              .details-modal {
                --fs-dur: 320ms;
                --fs-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
                --glass: rgba(14, 14, 22, 0.6);
                position: fixed;
                inset: 0;
                height: 100dvh;
                width: 100vw;
                background:
                  radial-gradient(ellipse 80% 60% at 30% 35%, rgba(237, 201, 91, 0.07), transparent 70%),
                  radial-gradient(ellipse 120% 90% at 50% 50%, rgba(18, 18, 32, 0.9), rgba(6, 6, 10, 0.98));
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 1000;
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
                animation: modal-in 260ms var(--fs-ease);
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
              .share-button:focus-visible,
              .section-header:focus-visible,
              .details-image:focus-visible {
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

              .details-image {
                display: block;
                /* Keeps the box at the image's own ratio, which the FLIP scales to. */
                width: auto;
                height: auto;
                max-width: 100%;
                max-height: 70dvh;
                object-fit: contain;
                border: 1px solid var(--border-gold-medium);
                box-shadow:
                  0 0 0 6px rgba(237, 201, 91, 0.04),
                  0 24px 60px rgba(0, 0, 0, 0.6),
                  0 0 48px var(--glow-gold-soft);
                cursor: zoom-in;
                -webkit-tap-highlight-color: transparent;
              }

              .fullscreen-viewer {
                position: fixed;
                inset: 0;
                height: 100dvh;
                width: 100vw;
                z-index: 1100;
                display: flex;
                align-items: center;
                justify-content: center;
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
                touch-action: pan-y;
                cursor: zoom-out;
              }

              .fullscreen-backdrop {
                position: absolute;
                inset: 0;
                background: #000;
                opacity: 1;
                animation: fullscreen-backdrop-in var(--fs-dur) var(--fs-ease);
                transition: opacity var(--fs-dur) var(--fs-ease);
                z-index: 0;
              }

              .fullscreen-backdrop.closing {
                opacity: 0;
                animation: none;
              }

              @keyframes fullscreen-backdrop-in {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }

              .fullscreen-image {
                position: relative;
                z-index: 1;
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                -webkit-tap-highlight-color: transparent;
                transform: translate(0, 0) scale(1, 1);
                transition: transform var(--fs-dur) var(--fs-ease);
                transform-origin: center center;
                will-change: transform;
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

              .section-body {
                padding: 0 18px 18px;
                text-align: left;
                animation: section-in 240ms var(--fs-ease);
              }

              @keyframes section-in {
                from {
                  opacity: 0;
                  transform: translateY(-4px);
                }
                to {
                  opacity: 1;
                  transform: none;
                }
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

              .share-button {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 46px;
                min-width: 44px;
                padding: 0 24px;
                border: 1px solid var(--border-gold-strong);
                border-radius: 999px;
                background: transparent;
                color: var(--color-gold-secondary);
                font-family: inherit;
                font-size: 1rem;
                letter-spacing: 0.06em;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
                transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
              }

              .share-button:active {
                transform: scale(0.97);
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

                .share-button:hover {
                  background: rgba(255, 215, 0, 0.08);
                  border-color: var(--color-gold-rich);
                  box-shadow: 0 0 20px var(--glow-gold-soft);
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
                .section-body,
                .fullscreen-backdrop,
                .fullscreen-image {
                  transition-duration: 0.01ms;
                  animation-duration: 0.01ms;
                }

                .close-details:hover,
                .close-details:active,
                .share-button:active {
                  transform: none;
                }

                .paging:active {
                  transform: translateY(-50%);
                }
              }

              @media (min-width: 768px) {
                .details-image {
                  max-height: 65dvh;
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
                  padding: 72px 56px;
                  box-sizing: border-box;
                }

                .details-image {
                  max-height: calc(100dvh - 144px);
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

                .section-body {
                  padding: 0 22px 22px;
                }

                .section-body p {
                  font-size: 1.12rem;
                }

                .share-button {
                  font-size: 1.05rem;
                }
              }
            `}</style>
        </div>
    );
}
