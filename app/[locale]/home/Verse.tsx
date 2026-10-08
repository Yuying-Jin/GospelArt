import homeStyles from "./home.module.css";

/**
 * A verse as the home page sets it: the page's language large, the other
 * underneath. On English pages the Chinese goes second. The text is shown
 * as written, as in the gallery: an ESV verse carries its own quotation marks.
 */
export default function Verse({
    locale,
    chinese,
    english,
    className,
}: {
    locale: string;
    chinese: string;
    english: string;
    className?: string;
}) {
    const englishFirst = locale === "en";
    const primary = englishFirst ? english : chinese;
    const secondary = englishFirst ? chinese : english;

    return (
        <div className={className}>
            {primary && (
                <p className={`${homeStyles.verseMain} ${englishFirst ? homeStyles.en : homeStyles.zh}`}>
                    {primary}
                </p>
            )}
            {secondary && (
                <p className={`${homeStyles.verseSub} ${englishFirst ? homeStyles.zh : homeStyles.en}`}>
                    {secondary}
                </p>
            )}
        </div>
    );
}
