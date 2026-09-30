'use client'

import {useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {flip, UNCLIPPED} from '@/lib/flip';

// Mirrors --fs-dur below; a fallback for when transitionend never fires.
const TRANSITION_MS = 320;
const SWIPE_THRESHOLD = 50;

export type FullscreenPhase = 'closed' | 'open' | 'closing';

type Props = {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    /** A larger rendition for the viewer; defaults to `src`. */
    fullSrc?: string;
    /** Styles the thumbnail. In styled-jsx, pass it through `:global()`. */
    className?: string;
    style?: CSSProperties;
    loading?: 'lazy' | 'eager';
    onSwipePrev?: () => void;
    onSwipeNext?: () => void;
    /** Lets a parent that also listens for Escape stand aside while the viewer is up. */
    onPhaseChange?: (phase: FullscreenPhase) => void;
};

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


/**
 * An image that opens full screen when clicked, growing out of its own place
 * on the page and shrinking back on close; Escape or a click anywhere closes
 * it. The viewer is portalled to <body>, so an
 * ancestor with a transform or filter cannot trap its fixed position.
 */
export default function FullscreenImage({
    src,
    alt,
    width,
    height,
    fullSrc,
    className,
    style,
    loading,
    onSwipePrev,
    onSwipeNext,
    onPhaseChange,
}: Props) {
    const [phase, setPhase] = useState<FullscreenPhase>('closed');
    // Lets the viewer's <img> take its size before it decodes, which avoids a
    // reflow mid-transition; set in the same handler that opens the viewer.
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const thumbRef = useRef<HTMLImageElement>(null);
    const fullRef = useRef<HTMLImageElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);

    const open = () => {
        if (phase !== 'closed') return;
        const thumb = thumbRef.current;
        setAspectRatio(thumb?.naturalWidth && thumb?.naturalHeight ? thumb.naturalWidth / thumb.naturalHeight : null);
        setPhase('open');
    };

    // 'closing' only keeps the viewer mounted for the exit transition, so with
    // motion reduced there is nothing to wait for.
    const close = useCallback(
        () => setPhase((prev) => (prev === 'open' ? (prefersReducedMotion() ? 'closed' : 'closing') : prev)),
        [],
    );

    useEffect(() => {
        onPhaseChange?.(phase);
    }, [phase, onPhaseChange]);

    useEffect(() => {
        if (phase === 'open') viewerRef.current?.focus();
        else if (phase === 'closed' && document.activeElement === document.body) thumbRef.current?.focus();
    }, [phase]);

    useEffect(() => {
        if (phase !== 'open') return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = overflow;
        };
    }, [phase, close]);

    // FLIP: pin the full image over the thumbnail with transitions off, then
    // release it next frame so it grows into place.
    useLayoutEffect(() => {
        if (phase !== 'open') return;
        const thumb = thumbRef.current;
        const full = fullRef.current;
        if (!thumb || !full) return;

        if (prefersReducedMotion()) {
            full.style.transition = 'none';
            full.style.transform = 'none';
            full.style.clipPath = 'none';
            return;
        }

        const finalRect = full.getBoundingClientRect();
        if (finalRect.width === 0 || finalRect.height === 0) return;

        const start = flip(thumb.getBoundingClientRect(), finalRect);
        full.style.transition = 'none';
        full.style.transform = start.transform;
        full.style.clipPath = start.clipPath;

        let raf2 = 0;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                full.style.transition = '';
                full.style.transform = 'translate(0, 0) scale(1)';
                full.style.clipPath = UNCLIPPED;
            });
        });
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [phase]);

    // The reverse, unmounting only once the transition has actually finished.
    useLayoutEffect(() => {
        if (phase !== 'closing') return;
        const thumb = thumbRef.current;
        const full = fullRef.current;
        if (!thumb || !full) {
            setPhase('closed');
            return;
        }

        const end = flip(thumb.getBoundingClientRect(), full.getBoundingClientRect());
        full.style.transition = 'transform var(--fs-dur) var(--fs-ease), clip-path var(--fs-dur) var(--fs-ease)';
        full.style.transform = end.transform;
        full.style.clipPath = end.clipPath;

        const onEnd = (event: TransitionEvent) => {
            if (event.propertyName === 'transform') setPhase('closed');
        };
        full.addEventListener('transitionend', onEnd);
        const fallback = window.setTimeout(() => setPhase('closed'), TRANSITION_MS + 80);
        return () => {
            full.removeEventListener('transitionend', onEnd);
            window.clearTimeout(fallback);
        };
    }, [phase]);

    const onTouchEnd = (event: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const deltaX = event.changedTouches[0].clientX - touchStartX.current;
        if (deltaX > SWIPE_THRESHOLD) onSwipePrev?.();
        else if (deltaX < -SWIPE_THRESHOLD) onSwipeNext?.();
        touchStartX.current = null;
    };

    return (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element -- sized in the URL by the caller */}
            <img
                ref={thumbRef}
                src={src}
                alt={alt}
                width={width}
                height={height}
                loading={loading}
                decoding="async"
                className={['fullscreen-thumb', className].filter(Boolean).join(' ')}
                style={style}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        open();
                    }
                }}
            />

            {phase !== 'closed' && createPortal(
                <div
                    ref={viewerRef}
                    className="fullscreen-viewer"
                    role="dialog"
                    aria-modal="true"
                    aria-label={alt}
                    tabIndex={-1}
                    onClick={close}
                    onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
                    onTouchEnd={onTouchEnd}
                >
                    <div className={`fullscreen-backdrop${phase === 'closing' ? ' closing' : ''}`} />
                    {/* eslint-disable-next-line @next/next/no-img-element -- sized in the URL by the caller */}
                    <img
                        ref={fullRef}
                        src={fullSrc ?? src}
                        alt={alt}
                        className="fullscreen-image"
                        style={aspectRatio ? {aspectRatio: String(aspectRatio)} : undefined}
                    />
                </div>,
                document.body,
            )}

            <style jsx>{`
              .fullscreen-thumb {
                cursor: zoom-in;
                -webkit-tap-highlight-color: transparent;
              }

              .fullscreen-thumb:focus-visible {
                outline: 2px solid var(--color-gold-secondary);
                outline-offset: 3px;
              }

              .fullscreen-viewer {
                --fs-dur: 320ms;
                --fs-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
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
                outline: none;
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
                transform: translate(0, 0) scale(1);
                clip-path: inset(0px 0px);
                transition: transform var(--fs-dur) var(--fs-ease), clip-path var(--fs-dur) var(--fs-ease);
                transform-origin: center center;
                will-change: transform;
              }

              @media (prefers-reduced-motion: reduce) {
                .fullscreen-backdrop,
                .fullscreen-image {
                  transition-duration: 0.01ms;
                  animation-duration: 0.01ms;
                }
              }
            `}</style>
        </>
    );
}
