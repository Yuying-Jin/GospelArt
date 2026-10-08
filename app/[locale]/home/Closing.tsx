import EsvMark from "./EsvMark";
import homeStyles from "./home.module.css";

/**
 * The verse the page ends on, before a faint rose window. `note` marks it as
 * a placeholder while the site is in testing.
 */
export default function Closing({
    primary,
    reference,
    esv,
    note,
}: {
    primary: string;
    reference: string;
    esv: boolean;
    note: string;
}) {
    return (
        <section className={homeStyles.closing}>
            <p className={homeStyles.closingMain}>{primary}</p>
            {(reference || esv) && (
                <span className={homeStyles.reference}>
                    {reference}
                    {esv && <EsvMark alone={!reference} />}
                </span>
            )}
            <span className={`${homeStyles.draftNote} ${homeStyles.closingNote}`}>{note}</span>
        </section>
    );
}
