'use client'

import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useRef, useState} from 'react';
import type {Artwork, ArtworkSectionText} from '@/types/artwork';

type Props = {
    artwork: Artwork;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
};

const SWIPE_THRESHOLD = 50;

export default function DetailsModal({ artwork, onClose, onPrev, onNext }: Props) {

    const t = useTranslations('public.gallery.card');
    const tModal = useTranslations('public.gallery.modal');
    const locale = useLocale();
    // Unlike scripture (always shown bilingually), section content renders in
    // a single language — whichever matches the current UI locale.
    const sectionLocale: keyof ArtworkSectionText =
        locale === 'zh-TW' ? 'zh-TW' : locale === 'zh-CN' ? 'zh-CN' : 'en';

    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const fullscreenCloseButtonRef = useRef<HTMLButtonElement>(null);
    const touchStartXRef = useRef<number | null>(null);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
    // Purely local UI state — tapping the artwork opens a chrome-free, larger
    // view of the same image. It never touches the URL/history: the artwork
    // being viewed doesn't change, only how much of the modal's chrome is shown.
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Independent toggles: any number of expandable sections can be open at once.
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

    // Move focus to whichever Close button is relevant, so opening/closing the
    // fullscreen layer doesn't strand keyboard/screen-reader focus.
    useEffect(() => {
        if (isFullscreen) {
            fullscreenCloseButtonRef.current?.focus();
        } else {
            closeButtonRef.current?.focus();
        }
    }, [isFullscreen]);

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
                // Escape backs out one level at a time: fullscreen first, then the modal.
                if (isFullscreen) setIsFullscreen(false);
                else onClose();
            } else if (e.key === 'ArrowLeft') onPrev();
            else if (e.key === 'ArrowRight') onNext();
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, onClose, onPrev, onNext]);

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
                    <button className="paging prev" onClick={onPrev} aria-label={tModal('previous')}>‹</button>
                    <img
                        src={artwork.image_path || undefined}
                        alt={artwork.bible_reference}
                        className="details-image"
                        role="button"
                        tabIndex={0}
                        onClick={() => setIsFullscreen(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsFullscreen(true);
                            }
                        }}
                    />
                    <button className="paging next" onClick={onNext} aria-label={tModal('next')}>›</button>
                </div>

                <div className="info-column">
                    <div className="info-panel">
                        <p className="verse-chinese">{artwork.scripture_chinese}</p>
                        {artwork.scripture_english && (
                            <p className="verse-english">{artwork.scripture_english}(ESV)</p>
                        )}
                        <p className="meta">
                            <span>{t('bible_reference')}{artwork.bible_reference}</span>
                            <span>{t('date')}{artwork.date}</span>
                        </p>

                        {(bibleThemes.length > 0 || spiritualThemes.length > 0) && (
                            <div className="tag-group">
                                <span className="tag-group-label">{tModal('themes')}</span>
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

            {isFullscreen && (
                <div
                    className="fullscreen-viewer"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <button
                        ref={fullscreenCloseButtonRef}
                        className="close-details close-fullscreen"
                        onClick={() => setIsFullscreen(false)}
                        aria-label={tModal('close')}
                    >
                        ×
                    </button>
                    <img
                        src={artwork.image_path || undefined}
                        alt={artwork.bible_reference}
                        className="fullscreen-image"
                        onClick={() => setIsFullscreen(false)}
                    />
                </div>
            )}

            <style jsx>{`
              .details-modal {
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
                padding: 64px 16px 24px;
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
                max-height: 50dvh;
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
                background: #000;
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

              .fullscreen-image {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
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
                font-size: 1rem;
                color: var(--color-gold-terniary);
                margin: 0 0 8px;
                line-height: 1.6;
              }

              .verse-english {
                font-size: 0.85rem;
                font-style: italic;
                color: var(--text-secondary);
                margin: 0 0 12px;
                line-height: 1.5;
              }

              .meta {
                display: flex;
                flex-direction: column;
                gap: 4px;
                font-size: 0.8rem;
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
                font-size: 0.78rem;
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
                font-size: 0.9rem;
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
                font-size: 0.85rem;
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

              /* Desktop: gallery-exhibition two-column layout — image pinned on
                 the left, information panel scrolls independently on the right. */
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
