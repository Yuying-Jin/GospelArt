import { Link } from "@/i18n/navigation";
import type { HomeCreedItem } from "@/types/home";
import Flowers from "./Flowers";
import homeStyles from "./home.module.css";

/**
 * Who we are, in a sentence and up to three short items, between the opening
 * and the artworks. Hidden when the Studio has nothing to say here.
 */
export default function Creed({ line, items, aboutLabel }: { line: string; items: HomeCreedItem[]; aboutLabel: string }) {
    if (!line && items.length === 0) return null;

    return (
        <section className={homeStyles.creed} aria-label={aboutLabel}>
            <svg className={homeStyles.creedMark} viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <path d="M15 3v24M8 10h14" />
            </svg>
            {line && <p className={homeStyles.creedLine}>{line}</p>}
            {items.length > 0 && (
                <div className={homeStyles.creedBody}>
                    <Flowers side="left" />
                    <ul className={homeStyles.creedList}>
                        {items.map((item) => (
                            <li key={item.key}>
                                <h3 className={homeStyles.creedTitle}>{item.title}</h3>
                                <p>{item.body}</p>
                            </li>
                        ))}
                    </ul>
                    <Flowers side="right" />
                </div>
            )}
            <Link href="/about" className={homeStyles.more}>
                {aboutLabel} →
            </Link>
        </section>
    );
}
