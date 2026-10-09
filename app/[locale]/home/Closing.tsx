import EsvMark from "./EsvMark";
import homeStyles from "./home.module.css";

/** The verse the page ends on, before a faint rose window. */
export default function Closing({
    primary,
    reference,
    esv,
}: {
    primary: string;
    reference: string;
    esv: boolean;
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
        </section>
    );
}
