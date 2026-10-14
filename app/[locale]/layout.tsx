import type { Metadata } from "next";
import {hasLocale, NextIntlClientProvider, useMessages} from 'next-intl';
import { notFound } from 'next/navigation';
import '@/styles/globals.css'
import '@/styles/variables.css'
import '@/styles/animations.css'
import {routing} from '@/i18n/routing';
import Footer from "@/components/Footer";
import GoToTopButton from "@/components/GoToTopButton";
import SkylightWrapper from "@/components/SkylightWrapper";
import StyledJsxRegistry from "@/components/StyledJsxRegistry";
import ArtworkImageGuard from "@/components/ArtworkImageGuard";
import Navbar from "@/components/Navbar";
import {getNavCollections} from "@/lib/sanity/getCollections";
import type {AppLocale} from "@/lib/sanity/mapArtwork";
import {getLocale, getTranslations} from "next-intl/server";
import React from "react";
import {fontVariables} from "@/app/fonts";
import {SITE_URL} from "@/lib/siteUrl";


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
        <html lang={locale} className={fontVariables}>
            <body>
                <StyledJsxRegistry>
                    <ArtworkImageGuard />
                    <GoToTopButton/>
                    <NextIntlClientProvider>
                        <SkylightWrapper/>
                        <Navbar collections={collections}/>
                        {children}
                        <Footer/>
                    </NextIntlClientProvider>
                </StyledJsxRegistry>
            </body>
        </html>
    );
}