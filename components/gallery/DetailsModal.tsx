'use client'

import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
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
    // which avoids a reflow mid-transition.
    const fsAspectRatioRef = useRef<number | null>(null);
    const [backdropVisible, setBackdropVisible] = useState(false);
    const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(
        () => new Set(artwork.sections?.map((section) => section.id) ?? [])
    );

    const toggleSection = (id: string) => {
        setOpenSectionIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const openFullscreen = () => {
        if (viewerPhase !== 'closed') return;
        const thumb = thumbImgRef.current;
        fsAspectRatioRef.current = thumb?.naturalWidth && thumb?.naturalHeight
            ? thumb.naturalWidth / thumb.naturalHeight
            : null;
        setViewerPhase('open');
    };

    const closeFullscreen = () => {
        setViewerPhase((prev) => (prev === 'open' ? 'closing' : prev));
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

        if (prefersReducedMotion()) {
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

    // Fading the backdrop separately keeps the artwork itself fully opaque.
    useEffect(() => {
        if (viewerPhase === 'open') {
            const raf = requestAnimationFrame(() => setBackdropVisible(true));
            return () => cancelAnimationFrame(raf);
        }
        setBackdropVisible(false);
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
                    title: artwork.bible_reference,
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
        <div className="details-modal" role="dialog" aria-modal="true" aria-label={artwork.bible_reference}>
            <button
                ref={closeButtonRef}
                className="close-details"
                onClick={onClose}
                aria-label={tModal('close')}
            >
                ×
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
                        ‹
                    </button>
                    <img
                        ref={thumbImgRef}
                        src={artwork.image_path || undefined}
                        alt={artwork.bible_reference}
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
                        ›
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
                            <span>{t('bible_reference')}{artwork.bible_reference}</span>
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
                                    const isOpen = openSectionIds.has(section.id);
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
                                                    <span className={`chevron${isOpen ? ' open' : ''}`} aria-hidden="true">⌄</span>
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
                            {shareStatus === 'copied' ? tModal('share_copied') : tModal('share')}
                        </button>
                    </div>
                </div>
            </div>

            {viewerPhase !== 'closed' && (
                <div
                    className="fullscreen-viewer"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className={`fullscreen-backdrop${backdropVisible ? ' visible' : ''}`} />
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
                        alt={artwork.bible_reference}
                        className="fullscreen-image"
                        style={fsAspectRatioRef.current ? { aspectRatio: String(fsAspectRatioRef.current) } : undefined}
                        onClick={closeFullscreen}
                    />
                </div>
            )}

            <style jsx>{`
              .details-modal {
                --fs-dur: 320ms;
                --fs-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
                position: fixed;
                inset: 0;
                height: 100dvh;
                width: 100vw;
                background: rgba(0, 0, 0, 0.92);
                z-index: 1000;
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
              }

              .close-details {
                position: absolute;
                top: calc(env(safe-area-inset-top) + 12px);
                right: calc(env(safe-area-inset-right) + 12px);
                width: 44px;
                height: 44px;
                border: none;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.55);
                color: #fff;
                font-size: 26px;
                line-height: 1;
                cursor: pointer;
                z-index: 3;
                -webkit-tap-highlight-color: transparent;
              }

              .close-details:focus-visible,
              .paging:focus-visible,
              .share-button:focus-visible,
              .section-header:focus-visible {
                outline: 2px solid var(--color-gold-secondary);
                outline-offset: 2px;
              }

              .details-content {
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                padding: 48px 16px 24px;
                gap: 16px;
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
                max-width: 100%;
                max-height: 75dvh;
                object-fit: contain;
                box-shadow: 0 0 40px rgba(255, 215, 0, 0.2);
                border: 1px solid rgba(255, 215, 0, 0.3);
                cursor: pointer;
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
              }

              /* Fades on its own so the artwork never dims. */
              .fullscreen-backdrop {
                position: absolute;
                inset: 0;
                background: #000;
                opacity: 0;
                transition: opacity var(--fs-dur) var(--fs-ease);
                z-index: 0;
              }

              .fullscreen-backdrop.visible {
                opacity: 1;
              }

              .fullscreen-image {
                position: relative;
                z-index: 1;
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
                transform: translate(0, 0) scale(1, 1);
                transition: transform var(--fs-dur) var(--fs-ease);
                transform-origin: center center;
                will-change: transform;
              }

              @media (prefers-reduced-motion: reduce) {
                .fullscreen-backdrop,
                .fullscreen-image {
                  transition-duration: 0.01ms;
                }
              }

              .paging {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.55);
                color: #fff;
                font-size: 1.8rem;
                cursor: pointer;
                z-index: 2;
                -webkit-tap-highlight-color: transparent;
              }

              .paging.prev {
                left: 8px;
              }

              .paging.next {
                right: 8px;
              }

              .paging:disabled {
                  opacity: 0.3;
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
              }

              .verse-chinese {
                font-size: 1.2rem;
                color: var(--color-gold-terniary);
                margin: 0 20px 8px;
                line-height: 1.6;
              }

              .verse-english {
                font-size: 1rem;
                font-style: italic;
                color: var(--text-secondary);
                margin: 0 20px 12px;
                line-height: 1.5;
              }

              .esv-credit {
                color: inherit;
                text-decoration: none;
                border-bottom: 1px dotted rgba(255, 255, 255, 0.45);
              }

              .esv-credit:hover {
                border-bottom-color: var(--color-gold-secondary);
              }

              .meta {
                display: flex;
                flex-direction: column;
                gap: 2px;
                font-size: 0.9rem;
                color: var(--text-secondary);
                margin: 0 0 16px;
              }

              .tag-group {
                margin: 0 0 16px;
              }

              .tag-group-label {
                display: block;
                font-size: 0.7rem;
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
                padding: 4px 12px;
                border-radius: 999px;
                font-size: 0.8rem;
                border: 1px solid rgba(255, 215, 0, 0.35);
                color: var(--color-gold-secondary);
                background: rgba(255, 215, 0, 0.06);
                white-space: nowrap;
              }

              .tag-spiritual {
                border-color: rgba(255, 255, 255, 0.3);
                color: var(--text-secondary);
                background: rgba(255, 255, 255, 0.04);
              }

              .sections {
                margin: 8px 0 20px;
                border-top: 1px solid rgba(255, 215, 0, 0.2);
              }

              .section {
                border-bottom: 1px solid rgba(255, 215, 0, 0.2);
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
                min-height: 44px;
                padding: 12px 4px;
                border: none;
                background: transparent;
                color: var(--color-gold-secondary);
                font-size: 1rem;
                text-align: left;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
              }

              .chevron {
                display: inline-block;
                transition: transform 0.2s ease;
                flex-shrink: 0;
              }

              .chevron.open {
                transform: rotate(180deg);
              }

              .section-body {
                padding: 0 4px 16px;
                text-align: left;
              }

              .section-body p {
                margin: 0;
                font-size: 0.95rem;
                line-height: 1.6;
                color: var(--text-secondary);
              }

              .share-button {
                min-height: 44px;
                min-width: 44px;
                padding: 0 20px;
                border: 1px solid rgba(255, 215, 0, 0.4);
                border-radius: 999px;
                background: transparent;
                color: var(--color-gold-secondary);
                font-size: 0.9rem;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
              }

              @media (hover: hover) {
                .close-details:hover,
                .paging:hover {
                  background: rgba(0, 0, 0, 0.75);
                }

                .share-button:hover {
                  background: rgba(255, 215, 0, 0.1);
                }

                .section-header:hover {
                  color: var(--color-gold-terniary);
                }
              }

              @media (min-width: 768px) {
                .details-image {
                  max-height: 65dvh;
                }

                .paging {
                  width: 56px;
                  height: 56px;
                  font-size: 2.2rem;
                }

                .paging.prev {
                  left: 24px;
                }

                .paging.next {
                  right: 24px;
                }
              }

              /* Desktop: image pinned left, info panel scrolls on the right. */
              @media (min-width: 1024px) {
                .details-content {
                  display: grid;
                  grid-template-columns: minmax(0, 1.3fr) minmax(340px, 1fr);
                  height: 100%;
                  padding: 0;
                  gap: 0;
                  overflow: hidden;
                }

                .image-column {
                  height: 100%;
                  padding: 72px 48px;
                  box-sizing: border-box;
                  border-right: 1px solid rgba(255, 215, 0, 0.15);
                }

                .details-image {
                  max-height: calc(100dvh - 144px);
                }

                .info-column {
                  height: 100%;
                  align-items: flex-start;
                  overflow-y: auto;
                  -webkit-overflow-scrolling: touch;
                  padding: 96px 56px 56px;
                  box-sizing: border-box;
                }

                .info-panel {
                  max-width: 480px;
                  text-align: left;
                }

                .verse-chinese {
                  font-size: 1.5rem;
                  margin: 0 0 12px;
                }

                .verse-english {
                  font-size: 1.15rem;
                  margin: 0 0 16px;
                }

                .meta {
                  flex-direction: row;
                  justify-content: flex-start;
                  gap: 24px;
                }

                .tag-list {
                  justify-content: flex-start;
                }

                .share-button {
                  align-self: flex-start;
                }
              }
            `}</style>
        </div>
    );
}
