import type { ReactNode } from "react";
import homeStyles from "./home.module.css";

/** A section's heading between two fine gold lines. */
export default function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
    return (
        <div className={homeStyles.sectionHead}>
            <span className={homeStyles.headRule} aria-hidden="true" />
            <h2 id={id} className={homeStyles.sectionTitle}>
                {children}
            </h2>
            <span className={`${homeStyles.headRule} ${homeStyles.headRuleEnd}`} aria-hidden="true" />
        </div>
    );
}
