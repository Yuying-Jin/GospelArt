'use client'

import {useTranslations} from 'next-intl';
import {useEffect, useRef, useState} from 'react';

type Props = {
    artwork: {
        scripture_chinese: string;
        scripture_english: string;
        image_path: string;
        date: string;
        bible_reference: string;
    };
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
};

const SWIPE_THRESHOLD = 50;

export default function PreviewModal({ artwork, onClose, onPrev, onNext }: Props) {

    const t = useTranslations('public.gallery.card');
    const tModal = useTranslations('public.gallery.modal');

    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const fullscreenCloseButtonRef = useRef<HTMLButtonElement>(null);
    const touchStartXRef = useRef<number | null>(null);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
    // Purely local UI state — tapping the artwork opens a chrome-free, larger
    // view of the same image. It never touches the URL/history: the artwork
    // being viewed doesn't change, only how much of the modal's chrome is shown.
    const [isFullscreen, setIsFullscreen] = useState(false);

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

    return (
        <div className="preview-modal" role="dialog" aria-modal="true" aria-label={artwork.bible_reference}>
            <button
                ref={closeButtonRef}
                className="close-preview"
                onClick={onClose}
                aria-label={tModal('close')}
            >
                ×
            </button>

            <div className="preview-content">
                <div
                    className="image-wrapper"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <button className="paging prev" onClick={onPrev} aria-label={tModal('previous')}>‹</button>
                    <img
                        src={artwork.image_path || undefined}
                        alt={artwork.bible_reference}
                        className="preview-image"
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

                <div className="preview-info">
                    <p className="preview-verse-chinese">{artwork.scripture_chinese}</p>
                    {artwork.scripture_english && (
                        <p className="preview-verse-english">{artwork.scripture_english}(ESV)</p>
                    )}
                    <p className="preview-meta">
                        <span>{t('bible_reference')}{artwork.bible_reference}</span>
                        <span>{t('date')}{artwork.date}</span>
                    </p>
                    <button className="share-button" onClick={handleShare}>
                        {shareStatus === 'copied' ? tModal('share_copied') : tModal('share')}
                    </button>
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
                        className="close-preview close-fullscreen"
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
              .preview-modal {
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

              .close-preview {
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

              .close-preview:focus-visible,
              .paging:focus-visible,
              .share-button:focus-visible {
                outline: 2px solid var(--color-gold-secondary);
                outline-offset: 2px;
              }

              .preview-content {
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                padding: 64px 16px 24px;
                gap: 16px;
              }

              .image-wrapper {
                position: relative;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                touch-action: pan-y;
              }

              .preview-image {
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

              .preview-info {
                width: 100%;
                max-width: 640px;
                text-align: center;
                flex-shrink: 0;
              }

              .preview-verse-chinese {
                font-size: 1rem;
                color: var(--color-gold-terniary);
                margin: 0 0 8px;
                line-height: 1.6;
              }

              .preview-verse-english {
                font-size: 0.85rem;
                font-style: italic;
                color: var(--text-secondary);
                margin: 0 0 12px;
                line-height: 1.5;
              }

              .preview-meta {
                display: flex;
                flex-direction: column;
                gap: 4px;
                font-size: 0.8rem;
                color: var(--text-secondary);
                margin: 0 0 16px;
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
                .close-preview:hover,
                .paging:hover {
                  background: rgba(0, 0, 0, 0.75);
                }

                .share-button:hover {
                  background: rgba(255, 215, 0, 0.1);
                }
              }

              @media (min-width: 768px) {
                .preview-image {
                  max-height: 65dvh;
                }

                .preview-meta {
                  flex-direction: row;
                  justify-content: center;
                  gap: 24px;
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
            `}</style>
        </div>
    );
}
