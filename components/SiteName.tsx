/**
 * The ministry's name, English in every locale. Its apostrophe comes from the
 * Latin punctuation face: Noto's, which Chinese pages use, is a full em wide.
 * Only that one mark, so the page's own Chinese quotes stay full width.
 */
export default function SiteName() {
    return (
        <>
            St. John<span className="latin-mark">’</span>s Gospel Arts
        </>
    );
}
