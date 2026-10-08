import { ESV_URL } from "@/lib/esvCredit";
import homeStyles from "./home.module.css";

/** Crossway asks for the ESV mark, linked to esv.org, wherever ESV text is shown. */
/** After a reference by default; `alone` drops the separator when there is none. */
export default function EsvMark({ alone = false }: { alone?: boolean }) {
    return (
        <span className={homeStyles.esvMark}>
            {!alone && " · "}
            <a className={homeStyles.esv} href={ESV_URL} target="_blank" rel="noopener noreferrer">
                ESV
            </a>
        </span>
    );
}
