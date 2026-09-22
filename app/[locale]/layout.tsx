import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {hasLocale, NextIntlClientProvider, useMessages} from 'next-intl';
import { notFound } from 'next/navigation';
import '@/styles/globals.css'
import '@/styles/variables.css'
import '@/styles/animations.css'
import {routing} from '@/i18n/routing';
import Footer from "@/components/Footer";
import GoToTopButton from "@/components/GoToTopButton";
import SkylightWrapper from "@/components/SkylightWrapper";
import Navbar from "@/components/Navbar";
import {getNavCollections} from "@/lib/sanity/getCollections";
import type {AppLocale} from "@/lib/sanity/mapArtwork";
import {getLocale, getTranslations} from "next-intl/server";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Absolute base for OG tags. Point it at the ministry's own domain once there is one. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gospel-art.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("site");

    return {
        metadataBase: new URL(SITE_URL),
        title: {default: t("title"), template: `%s · ${t("title")}`},
        description: t("description"),
        openGraph: {
            title: t("title"),
            description: t("description"),
            siteName: t("title"),
            type: "website",
        },
    };
}


export default async function LocaleLayout({
    children
    }: {
    children: React.ReactNode;
}) {
    // Ensure that the incoming `locale` is valid
    const locale = await getLocale();
    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    // The gallery menu is whatever collections the CMS holds, so the nav is
    // built here rather than from a list in the code.
    const collections = await getNavCollections(locale as AppLocale);

    return (
        <html lang={locale}>
            <body>
                <GoToTopButton/>
                <NextIntlClientProvider>
                    <SkylightWrapper/>
                    <Navbar collections={collections}/>
                    {children}
                    <Footer/>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}