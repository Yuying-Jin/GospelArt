import homeStyles from "./home.module.css";

/**
 * A verse as the home page sets it: the page's language large, the other
 * underneath. On English pages the Chinese goes second.
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
    const quote = (text: string, isEnglish: boolean) => (isEnglish && text ? `“${text}”` : text);

    return (
        <div className={className}>
            {primary && (
                <p className={`${homeStyles.verseMain} ${englishFirst ? homeStyles.en : homeStyles.zh}`}>
                    {quote(primary, englishFirst)}
                </p>
            )}
            {secondary && (
                <p className={`${homeStyles.verseSub} ${englishFirst ? homeStyles.zh : homeStyles.en}`}>
                    {quote(secondary, !englishFirst)}
                </p>
            )}
        </div>
    );
}
