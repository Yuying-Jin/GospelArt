import {hasLocale, useMessages} from 'next-intl';
import { notFound } from 'next/navigation';
import {routing} from '@/i18n/routing';
import publicStyle from './public.module.css';
import {getLocale} from "next-intl/server";
import React from "react";

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

    return (
        <>
            <main className={publicStyle.content}>
                {children}
            </main>
        </>
    );
}