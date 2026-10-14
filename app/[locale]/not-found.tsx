import { getLocale, getTranslations } from "next-intl/server";
import { ESV_URL } from "@/lib/esvCredit";
import type { AppLocale } from "@/lib/sanity/locale";
import Header from "@/components/Header";
import { Link } from "@/i18n/navigation";
import { getRandomArtwork, type FeaturedArtwork } from "@/lib/sanity/getRandomArtwork";
import { localizeReference } from "@/lib/scripture/citation";
import publicStyle from "./(public)/public.module.css";
import styles from "./not-found.module.css";
import StainedGlassWindow from "./StainedGlassWindow";

/**
 * The 404 for every page under a locale, whether no route matched or a page
 * called notFound() (an unknown article or collection). It sits inside the
 * locale layout, so the navbar and footer are there and the text is the
 * visitor's language. One of the newest artworks stands in a small
 * stained-glass window with its scripture beneath; the way on is the three
 * main sections below it.
 */
/**
 * The verse as the home page sets it: the page's language first and large,
 * the other beneath; on English pages the Chinese goes second.
 */
function verseLines(artwork: FeaturedArtwork, locale: AppLocale) {
    const chinese = {
        text: artwork.scriptureChinese,
        script: "zh" as const,
        lang: locale === "zh-CN" ? "zh-CN" : "zh-TW",
    };
    const english = { text: artwork.scriptureEnglish, script: "en" as const, lang: "en" };
    const [main, sub] = locale === "en" ? [english, chinese] : [chinese, english];
    return [
        { ...main, role: "verseMain" as const },
        { ...sub, role: "verseSub" as const },
    ].filter((line) => line.text);
}

export default async function NotFound() {
    const locale = (await getLocale()) as AppLocale;
    const [t, nav, artwork] = await Promise.all([
        getTranslations("public.not_found"),
        getTranslations("menu.navigation.items"),
        getRandomArtwork(locale),
    ]);
    const reference = artwork ? localizeReference(artwork.reference, locale) : "";

    return (
        <main className={publicStyle.content}>
            <Header title={t("title")} description={t("description")} />
            {artwork && (
                <figure className={styles.window}>
                    <StainedGlassWindow artwork={artwork} />
                    <figcaption className={styles.verse}>
                        {verseLines(artwork, locale).map((line) => (
                            <p key={line.role} className={`${styles[line.role]} ${styles[line.script]}`} lang={line.lang}>
                                {line.text}
                            </p>
                        ))}
                        {reference && (
                            <p className={styles.reference}>
                                {reference}
                                {/* Crossway asks for the ESV mark, linked to esv.org, wherever ESV text is shown. */}
                                {artwork.scriptureEnglish && (
                                    <>
                                        {" · "}
                                        <a className={styles.esv} href={ESV_URL} target="_blank" rel="noopener noreferrer">
                                            ESV
                                        </a>
                                    </>
                                )}
                            </p>
                        )}
                    </figcaption>
                </figure>
            )}
            <nav className={styles.ways} aria-label={t("ways")}>
                <Link href="/home" className={styles.way}>{nav("home")}</Link>
                <Link href="/gallery" className={styles.way}>{nav("gallery")}</Link>
                <Link href="/news" className={styles.way}>{nav("news")}</Link>
            </nav>
        </main>
    );
}
