'use client';

import { useTranslations } from 'next-intl';
import Header from "@/components/Header";
import Card from "@/components/gallery/Card";
import galleryStyle from './gallery.module.css';
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import DetailsModal from "@/components/gallery/DetailsModal";
import type { Artwork } from "@/types/artwork";

type Props = {
    artworks: Artwork[];
};

export default function GalleryClient({ artworks }: Props) {
    return (
        <Suspense fallback={null}>
            <GalleryContent artworks={artworks} />
        </Suspense>
    );
}

function GalleryContent({ artworks }: Props) {
    const t = useTranslations('public.gallery');

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Tracks whether the modal was opened from the gallery in this session.
    const openedFromGalleryRef = useRef(false);

    const slugToIndex = useMemo(() => {
        const map = new Map<string, number>();
        artworks.forEach((artwork, index) => {
            if (artwork.slug) map.set(artwork.slug, index);
            // Retired URLs resolve too, so a link shared before the artwork's
            // URL changed still opens the right artwork instead of nothing.
            artwork.previousSlugs?.forEach((previous) => {
                if (previous && !map.has(previous)) map.set(previous, index);
            });
        });
        return map;
    }, [artworks]);

    const activeSlug = searchParams.get('artwork');
    const currentIndex = activeSlug !== null ? slugToIndex.get(activeSlug) : undefined;
    const canonicalSlug = currentIndex !== undefined ? artworks[currentIndex].slug : undefined;

    // When an old URL resolved through `previousSlugs`, quietly rewrite the
    // address bar to the current one so the link the visitor copies is canonical.
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

    const goToIndex = (index: number) => {
        router.replace({ pathname, query: { artwork: artworks[index].slug } }, { scroll: false });
    };

    const prevSlide = () => {
        if (currentIndex === undefined || currentIndex === 0) return;
        goToIndex(currentIndex - 1);
    };

    const nextSlide = () => {
        if (currentIndex === undefined || currentIndex === artworks.length - 1) return;
        goToIndex(currentIndex + 1);
    };

    return (
        <>
            <Header title={t('title')} description={t('description')}/>
            <section className={galleryStyle.gallery}>
                {artworks.map((artwork, index) => (
                    <Card
                        key={artwork.slug || index}
                        scripture_chinese={artwork.scripture_chinese}
                        scripture_english={artwork.scripture_english}
                        image_path={artwork.image_path}
                        date={artwork.date}
                        bible_reference={artwork.bible_reference}
                        onClick={() => openModal(index)}
                    />
                ))}
            </section>

            {currentIndex !== undefined && (
                <DetailsModal
                    artwork={artworks[currentIndex]}
                    onClose={closeModal}
                    onPrev={prevSlide}
                    onNext={nextSlide}
                    isFirst={currentIndex === 0}
                    isLast={currentIndex === artworks.length - 1}
                />
            )}
        </>
    );
}
