'use client';

import { useLocale, useTranslations } from 'next-intl';
import Card from "@/components/gallery/Card";
import galleryStyle from './gallery.module.css';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import DetailsModal from "@/components/gallery/DetailsModal";
import type { GalleryArtworkRef } from "@/lib/sanity/getGalleryArtworks";
import type { Artwork } from "@/types/artwork";

/** How far below the last card the next batch starts loading. */
const PRELOAD_MARGIN = '800px 0px';

/**
 * Batches appended by scrolling before the grid pauses and offers Load More —
 * endless auto-loading would keep the site footer out of reach. Scrolling
 * only; the modal walks the whole collection and never consults this.
 */
const AUTO_BATCH_LIMIT = 3;

type Props = {
    initialArtworks: Artwork[];
    /** Every artwork in the gallery, in display order — slugs only. */
    order: GalleryArtworkRef[];
    /** The artwork `?artwork=` points at, resolved server-side. */
    activeArtwork: Artwork | null;
    /** Narrows the feed to one collection. Absent means the whole gallery. */
    collectionSlug?: string;
};

export default function GalleryClient(props: Props) {
    return (
        <Suspense fallback={null}>
            <GalleryContent {...props} />
        </Suspense>
    );
}

function GalleryContent({ initialArtworks, order, activeArtwork, collectionSlug }: Props) {
    const t = useTranslations('public.gallery');
    const locale = useLocale();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Whether the modal was opened from the gallery in this session.
    const openedFromGalleryRef = useRef(false);

    // Always a prefix of `order`. Seeded once: a `?artwork=` navigation
    // re-renders the server component, and scrolled-in batches must survive it.
    const [artworks, setArtworks] = useState<Artwork[]>(initialArtworks);
    const [isLoading, setIsLoading] = useState(false);
    // Stops the observer from retrying on every scroll tick after a failure.
    const [loadFailed, setLoadFailed] = useState(false);
    const [autoLoadCount, setAutoLoadCount] = useState(0);

    const isComplete = artworks.length >= order.length;
    const hasMore = !isComplete && !loadFailed;
    const isPaused = autoLoadCount >= AUTO_BATCH_LIMIT;
    const canAutoLoad = hasMore && !isPaused;

    // How far into `order` the grid reaches, and so where the next batch
    // starts. `loadMore` takes it as a dependency rather than reading it from a
    // ref: the observer effect below is already re-created on every batch, so
    // a new `loadMore` each batch costs nothing.
    const loadedCount = artworks.length;
    const isLoadingRef = useRef(false);

    const loadMore = useCallback(async (trigger: 'auto' | 'manual') => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        setIsLoading(true);
        setLoadFailed(false);

        const offset = loadedCount;

        // The collection travels with the offset: a position only means
        // anything within the set the page was rendered from.
        const collectionParam = collectionSlug
            ? `&collection=${encodeURIComponent(collectionSlug)}`
            : '';

        try {
            const response = await fetch(
                `/api/gallery?locale=${encodeURIComponent(locale)}&offset=${offset}${collectionParam}`,
            );
            if (!response.ok) throw new Error(`Gallery batch failed: ${response.status}`);

            const batch = (await response.json()) as { artworks?: Artwork[] };
            const next = batch.artworks ?? [];

            if (!next.length) {
                // The order said there was more, so artworks were unpublished
                // since the page loaded. Stop rather than ask again forever.
                setLoadFailed(true);
                return;
            }

            // Drop a batch that raced another one in.
            setArtworks((prev) => (prev.length === offset ? [...prev, ...next] : prev));
            // Asking for more explicitly buys another run of automatic ones.
            setAutoLoadCount((count) => (trigger === 'auto' ? count + 1 : 0));
        } catch (error) {
            console.error(error);
            setLoadFailed(true);
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    }, [locale, collectionSlug, loadedCount]);

    // Re-created after each batch so a sentinel still on screen (tall viewport,
    // short batch) triggers the next one without waiting for a scroll event.
    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !canAutoLoad) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) void loadMore('auto');
            },
            { rootMargin: PRELOAD_MARGIN },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [canAutoLoad, loadMore, artworks.length]);

    // Position in the whole gallery, not in what is loaded: this is what lets
    // the modal's prev/next run past the loaded batches. Retired URLs resolve
    // here too.
    const slugToPosition = useMemo(() => {
        const map = new Map<string, number>();
        order.forEach((ref, position) => {
            if (ref.slug) map.set(ref.slug, position);
            ref.previousSlugs?.forEach((previous) => {
                if (previous && !map.has(previous)) map.set(previous, position);
            });
        });
        return map;
    }, [order]);

    const loadedBySlug = useMemo(() => {
        const map = new Map<string, Artwork>();
        artworks.forEach((artwork) => {
            if (artwork.slug) map.set(artwork.slug, artwork);
        });
        return map;
    }, [artworks]);

    const activeSlug = searchParams.get('artwork');
    const position = activeSlug !== null ? slugToPosition.get(activeSlug) : undefined;
    const canonicalSlug = position !== undefined ? order[position].slug : undefined;

    // Prefer the copy already in the grid; the server-resolved one covers
    // artworks the visitor has not scrolled to yet.
    const shownArtwork =
        (canonicalSlug ? loadedBySlug.get(canonicalSlug) : undefined) ??
        (activeArtwork?.slug && activeArtwork.slug === canonicalSlug ? activeArtwork : undefined);

    // Rewrite a `previousSlugs` hit to the canonical URL, so the address the
    // visitor copies is the current one.
    useEffect(() => {
        if (!activeSlug || !canonicalSlug || activeSlug === canonicalSlug) return;
        router.replace({ pathname, query: { artwork: canonicalSlug } }, { scroll: false });
    }, [activeSlug, canonicalSlug, pathname, router]);

    const openModal = (index: number) => {
        openedFromGalleryRef.current = true;
        router.push({ pathname, query: { artwork: artworks[index].slug } }, { scroll: false });
    };

    const closeModal = () => {
        if (openedFromGalleryRef.current) {
            router.back();
        } else {
            router.push(pathname, { scroll: false });
        }
    };

    const goToPosition = (target: number) => {
        const ref = order[target];
        if (!ref) return;
        router.replace({ pathname, query: { artwork: ref.slug } }, { scroll: false });
    };

    const prevSlide = () => {
        if (position === undefined || position === 0) return;
        goToPosition(position - 1);
    };

    const nextSlide = () => {
        if (position === undefined || position === order.length - 1) return;
        goToPosition(position + 1);
    };

    return (
        <>
            <section className={galleryStyle.gallery}>
                {artworks.map((artwork, index) => (
                    <Card
                        key={artwork.slug || index}
                        scripture_chinese={artwork.scripture_chinese}
                        scripture_english={artwork.scripture_english}
                        image_path={artwork.thumbnail_path || artwork.image_path}
                        date={artwork.date}
                        bible_reference={artwork.bible_reference}
                        onClick={() => openModal(index)}
                    />
                ))}
            </section>

            <div className={galleryStyle.feedFooter}>
                {canAutoLoad && (
                    <div ref={sentinelRef} className={galleryStyle.feedSentinel} aria-hidden="true" />
                )}
                {isLoading && (
                    <p className={galleryStyle.feedStatus} role="status">{t('feed.loading')}</p>
                )}
                {hasMore && isPaused && !isLoading && (
                    <button className={galleryStyle.loadMore} onClick={() => void loadMore('manual')}>
                        {t('feed.load_more')}
                    </button>
                )}
                {loadFailed && !isLoading && (
                    <p className={galleryStyle.feedStatus} role="status">
                        {t('feed.error')}
                        <button
                            className={galleryStyle.feedRetry}
                            onClick={() => void loadMore('manual')}
                        >
                            {t('feed.retry')}
                        </button>
                    </p>
                )}
                {isComplete && artworks.length > 0 && (
                    <p className={galleryStyle.feedStatus}>{t('feed.end')}</p>
                )}
            </div>

            {shownArtwork && position !== undefined && (
                <DetailsModal
                    artwork={shownArtwork}
                    onClose={closeModal}
                    onPrev={prevSlide}
                    onNext={nextSlide}
                    isFirst={position === 0}
                    isLast={position === order.length - 1}
                />
            )}
        </>
    );
}
