import { draftMode } from "next/headers";
import { getTranslations } from "next-intl/server";
import PreviewBanner from "@/components/PreviewBanner";
import { getHomePage } from "@/lib/sanity/getHomePage";
import type { AppLocale } from "@/lib/sanity/mapArtwork";
import Closing from "./Closing";
import Creed from "./Creed";
import HomeHero from "./HomeHero";
import LatestNews from "./LatestNews";
import NewWorks from "./NewWorks";
import homeStyles from "./home.module.css";

/**
 * The opening artwork, who we are, the newest artworks, the latest news and a
 * closing verse. What the page says and which artwork opens it is the Studio's
 * "Home page" document; the lists follow the gallery and the news on their own.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const home = await getHomePage(locale as AppLocale);
    const t = await getTranslations("home");
    const { isEnabled: preview } = await draftMode();

    return (
        <div className={homeStyles.page} lang={locale}>
            {preview && <PreviewBanner />}
            <HomeHero
                locale={locale}
                artwork={home.hero.artwork}
                tone={home.hero.tone}
                zoom={home.hero.zoom}
                intro={home.hero.intro}
                button={home.hero.button || t("enter_gallery")}
                note={t("placeholder_copy")}
            />
            <Creed line={home.creed.line} items={home.creed.items} aboutLabel={t("about")} note={t("placeholder_copy")} />
            {home.latest.length > 0 && (
                <NewWorks
                    locale={locale}
                    works={home.latest}
                    heading={t("latest_works")}
                    viewAll={t("view_all")}
                    previous={t("previous")}
                    next={t("next")}
                />
            )}
            {home.news.length > 0 && (
                <LatestNews locale={locale} items={home.news} heading={t("latest_news")} viewAll={t("view_all")} />
            )}
            {home.closing && <Closing {...home.closing} note={t("placeholder_verse")} />}
        </div>
    );
}
