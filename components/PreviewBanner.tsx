"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Shown while Draft Mode is on, which only the Studio's Preview tab turns
 * on. Exiting returns to the same page, published. A small pill, so the
 * page is seen as visitors will see it: in the empty middle of the nav bar on
 * a phone, at the bottom centre on wider screens, clear of the go-to-top
 * button. The notice itself is its tooltip and accessible label.
 */
export default function PreviewBanner() {
    const t = useTranslations("public.preview");

    return (
        <form
            className="preview-banner"
            role="status"
            aria-label={t("notice")}
            title={t("notice")}
            method="post"
            action="/api/draft-mode/disable"
            onSubmit={(event) => {
                const path = event.currentTarget.elements.namedItem("path") as HTMLInputElement;
                path.value = window.location.pathname + window.location.search;
            }}
        >
            <input type="hidden" name="path" defaultValue="/" />
            <button type="submit">
                <Eye size={14} aria-hidden />
                <span>{t("exit")}</span>
            </button>

            <style jsx>{`
                .preview-banner {
                    position: fixed;
                    left: 50%;
                    bottom: 12px;
                    transform: translateX(-50%);
                    z-index: 98;
                    margin: 0;
                }
                @media (max-width: 1023px) {
                    .preview-banner {
                        top: 19px;
                        bottom: auto;
                    }
                }
                button {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border: 1px solid rgba(255, 230, 135, 0.45);
                    border-radius: 999px;
                    background: rgba(59, 34, 12, 0.85);
                    color: var(--color-highlight-text);
                    font: 12px/1 system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif;
                    cursor: pointer;
                    opacity: 0.75;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
                    transition: opacity 0.2s ease;
                }
                button:hover,
                button:focus-visible {
                    opacity: 1;
                }
            `}</style>
        </form>
    );
}
