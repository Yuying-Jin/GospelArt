'use client';

import { useTranslations } from 'next-intl';
import Header from "@/components/Header";
import Card from "@/components/gallery/Card";
import galleryStyle from './gallery.module.css';
import artworksData from "@/data/artworks.json";
import { Suspense, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import DetailsModal from "@/components/gallery/DetailsModal";
import type { Artwork } from "@/types/artwork";

const artworks: Artwork[] = artworksData;

export default function GalleryPage() {
    return (
        <Suspense fallback={null}>
            <GalleryPageContent />
        </Suspense>
    );
}

function GalleryPageContent() {
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
        });
        return map;
    }, []);

    const activeSlug = searchParams.get('artwork');
    const currentIndex = activeSlug !== null ? slugToIndex.get(activeSlug) : undefined;

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
        if (currentIndex === undefined) return;
        goToIndex(currentIndex === 0 ? artworks.length - 1 : currentIndex - 1);
    };

    const nextSlide = () => {
        if (currentIndex === undefined) return;
        goToIndex(currentIndex === artworks.length - 1 ? 0 : currentIndex + 1);
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
                />
            )}
        </>
    );
}
