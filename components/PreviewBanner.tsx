"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Shown while Draft Mode is on, which only the Studio's Preview tab turns
 * on. Exiting returns to the same page, published.
 */
export default function PreviewBanner() {
    const t = useTranslations("public.preview");

    return (
        <form
            className="preview-banner"
            role="status"
            method="post"
            action="/api/draft-mode/disable"
            onSubmit={(event) => {
                const path = event.currentTarget.elements.namedItem("path") as HTMLInputElement;
                path.value = window.location.pathname + window.location.search;
            }}
        >
            <Eye size={16} aria-hidden />
            <span>{t("notice")}</span>
            <input type="hidden" name="path" defaultValue="/" />
            <button type="submit">{t("exit")}</button>

            <style jsx>{`
                .preview-banner {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem 0.75rem;
                    padding: 0.5rem 1rem;
                    background: var(--color-highlight);
                    color: var(--color-highlight-text);
                    font-size: 0.875rem;
                    text-align: center;
                }
                button {
                    padding: 0.2rem 0.75rem;
                    border: 1px solid currentColor;
                    border-radius: 999px;
                    background: transparent;
                    color: inherit;
                    font: inherit;
                    cursor: pointer;
                }
                button:hover {
                    background: var(--color-gold-glow);
                }
            `}</style>
        </form>
    );
}
