'use client'
import {hasLocale, NextIntlClientProvider, useMessages} from 'next-intl';
import { notFound } from 'next/navigation';
import {routing} from '@/i18n/routing';
import Navbar from "@/components/Navbar";
import publicStyle from './public.module.css';
import SkylightWrapper from "@/components/SkylightWrapper";

export default async function LocaleLayout({
    children,
    params,
    title
                                           }: {
    children: React.ReactNode;
    params: Promise<{locale: string}>;
    title: string;
}) {
    // Ensure that the incoming `locale` is valid
    const {locale} = await params;
    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    return (
        <>
            <main className={publicStyle.content}>
                {children}
            </main>
        </>
    );
}