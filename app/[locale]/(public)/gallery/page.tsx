'use client';

import { useTranslations } from 'next-intl';
import Header from "@/components/Header";
import Card from "@/components/gallery/Card";
import galleryStyle from './gallery.module.css';
import artworks from "@/data/artworks.json";
import {useEffect, useState} from "react";
import {TranslationTypes} from "@/messages/types";
import {useModal} from "@/stores/GalleryModalContext";
import PreviewModal from "@/components/gallery/PreviewModal";

type Artwork = {
    scripture_chinese: string;
    scripture_english: string;
    image_path: string;
    date: string;
    bible_reference: string;
};

export default function GalleryPage() {
    // const t = useTranslations<TranslationTypes['public']['gallery']>('public.gallery');
    const t = useTranslations('public.gallery');

    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const openModal = (index: number) => {
        setCurrentIndex(index);
        setIsOpen(true);
        console.log(artworks[currentIndex])
        console.log(index)
    };

    const closeModal = () => setIsOpen(false);

    const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? artworks.length - 1 : prev - 1));
    const nextSlide = () => setCurrentIndex((prev) => (prev === artworks.length - 1 ? 0 : prev + 1));



    // const [artworks, setArtworks] = useState<Artwork[]>([]);
    //
    // useEffect(() => {
    //     async function loadArtworks() {
    //         const res = await fetch("/api/artworks");
    //         const data = await res.json();
    //         setArtworks(data);
    //         console.log(data);
    //     }
    //     loadArtworks().then(r => {});
    // }, []);


    return (
        <>
            <Header title={t('title')} description={t('description')}/>
            <section className={galleryStyle.gallery}>
                {artworks.map((artwork, index) => (
                    <Card
                        key={index}
                        scripture_chinese={artwork.scripture_chinese}
                        scripture_english={artwork.scripture_english}
                        image_path={artwork.image_path}
                        date={artwork.date}
                        bible_reference={artwork.bible_reference}
                        onClick={() => openModal(index)}
                    />
                ))}
            </section>

            {
                isOpen && (
                    <PreviewModal
                        artwork={artworks[currentIndex]}
                        onClose={closeModal}
                        onPrev={prevSlide}
                        onNext={nextSlide}
                    />
                )
            }
        </>
    );
}
