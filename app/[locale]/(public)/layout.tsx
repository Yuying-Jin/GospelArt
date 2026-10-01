import {hasLocale, useMessages} from 'next-intl';
import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import {routing} from '@/i18n/routing';
import publicStyle from './public.module.css';
import {getLocale} from "next-intl/server";
import React from "react";
import PreviewBanner from "@/components/PreviewBanner";

export default async function Layout({
    children,
    }: {
    children: React.ReactNode;
}) {
    // Ensure that the incoming `locale` is valid
    const locale = await getLocale();
    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }
    const { isEnabled: preview } = await draftMode();

    return (
        <>
            {preview && <PreviewBanner />}
            <main className={publicStyle.content}>
                {children}
            </main>
        </>
    );
}