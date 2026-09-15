import type { ProviderResult, ScriptureProvider } from "../types";

/**
 * English Standard Version via Crossway's own API.
 *
 * ESV is licensed exclusively by Crossway and is not obtainable from any other
 * source, so unlike the Chinese provider this one is not interchangeable — the
 * translation choice is fixed. It is still behind the same interface so the
 * orchestrator treats every provider identically.
 *
 * The key must stay server-side: Crossway's terms forbid sharing or publishing
 * it, and the Studio is a browser application. That is the whole reason
 * `app/api/scripture/route.ts` exists.
 */

const ENDPOINT = "https://api.esv.org/v3/passage/text/";

/** Bare verse text, no apparatus. */
const TEXT_OPTIONS: Record<string, string> = {
    "include-passage-references": "false",
    "include-verse-numbers": "false",
    "include-footnotes": "false",
    "include-headings": "false",
    // The API otherwise appends "(ESV)" itself, and the gallery already renders
    // that label as the attribution link Crossway requires.
    "include-short-copyright": "false",
    "include-passage-horizontal-lines": "false",
    "include-heading-horizontal-lines": "false",
};

/** ESV returns poetry with newlines and indentation; verse fields are one line. */
function normalize(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

const apiKey = process.env.ESV_API_KEY?.trim() ?? "";

export const esvProvider: ScriptureProvider = {
    id: "esv",
    label: "ESV",
    fields: ["en"] as const,
    available: apiKey.length > 0,
    unavailableReason: "ESV_API_KEY is not configured on the server",

    async fetchPassage(reference, signal): Promise<ProviderResult> {
        const params = new URLSearchParams({ q: reference, ...TEXT_OPTIONS });

        const response = await fetch(`${ENDPOINT}?${params}`, {
            headers: { Authorization: `Token ${apiKey}` },
            signal,
            cache: "no-store",
        });

        if (!response.ok) {
            const message = `ESV API returned HTTP ${response.status}`;

            // Throttling or a rejected key stops every remaining reference too,
            // so it is reported as the provider being unavailable rather than
            // as this passage failing.
            const unavailable = [429, 401, 403].includes(response.status);

            return {
                texts: {},
                errors: { en: message },
                ...(unavailable ? { unavailable: message } : {}),
            };
        }

        const payload = await response.json();

        if (payload?.detail) {
            return { texts: {}, errors: { en: String(payload.detail) } };
        }

        const passage = normalize(String(payload?.passages?.[0] ?? ""));
        if (!passage) {
            return { texts: {}, errors: { en: "No passage found" } };
        }

        return {
            texts: { en: passage },
            errors: {},
            canonical: typeof payload?.canonical === "string" ? payload.canonical : undefined,
        };
    },
};
