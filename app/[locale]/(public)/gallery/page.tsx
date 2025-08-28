'use client';

import { useTranslations } from 'next-intl';
import Header from "@/components/Header";
import Card from "@/components/gallery/Card";
import galleryStyle from './gallery.module.css';
import artworks from "./artworks.json";
import {useEffect, useState} from "react";

type Artwork = {
    scripture_chinese: string;
    scripture_english: string;
    image_path: string;
    date: string;
    bible_reference: string;
};

export default function GalleryPage() {
    const t = useTranslations('public.gallery' as any);

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
                    />
                ))}
            </section>
        </>
    );
}
