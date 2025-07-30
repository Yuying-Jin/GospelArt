'use client';

import { useTranslations } from 'next-intl';

export default function GalleryPage() {
    const t = useTranslations('public.gallery' as any);

    return (
        <main className="p-6">
            <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
            <p className="text-lg">{t('description')}</p>
        </main>
    );
}
