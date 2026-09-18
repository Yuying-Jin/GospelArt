import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { NavCollection } from "@/types/collection";
import galleryStyle from "./gallery.module.css";

/**
 * The gallery's collection switcher. "All artworks" leads the row and is not a
 * collection document — it is the archive every collection is a subset of, so
 * the complete gallery is always one click away.
 *
 * A server component: the active item comes from the route that rendered it,
 * so there is nothing to hold in state.
 */
export default async function CollectionTabs({
    collections,
    activeSlug,
}: {
    collections: NavCollection[];
    /** Absent on the complete gallery. */
    activeSlug?: string;
}) {
    const t = await getTranslations("public.gallery.collections");

    return (
        <nav className={galleryStyle.collectionTabs} aria-label={t("switch_label")}>
            <ul>
                <li>
                    <Link
                        href="/gallery"
                        className={activeSlug ? undefined : galleryStyle.collectionTabActive}
                        aria-current={activeSlug ? undefined : "page"}
                    >
                        {t("all")}
                    </Link>
                </li>
                {collections.map(({ slug, title }) => {
                    const isActive = slug === activeSlug;

                    return (
                        <li key={slug}>
                            <Link
                                href={`/gallery/${slug}`}
                                className={isActive ? galleryStyle.collectionTabActive : undefined}
                                aria-current={isActive ? "page" : undefined}
                            >
                                {title}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
