import type { ProviderResult, ScriptureProvider } from "../types";

/**
 * Chinese Union Version (和合本) via Bible SuperSearch.
 *
 * ISOLATED ON PURPOSE — this file is the only place in the codebase that knows
 * this service exists. Replacing it means writing another module that satisfies
 * `ScriptureProvider` and changing one line in `lib/scripture/index.ts`; no
 * route, action, schema or frontend change is involved.
 *
 * Worth isolating: the host has been observed refusing TCP connections
 * outright (both the API and their website), so treat availability as a
 * question of when, not if. Failure here is reported per field and never
 * propagates — see `lib/scripture/index.ts`.
 *
 * Candidate replacements if it stops being viable: API.Bible (api.bible),
 * get.bible datasets, or a self-hosted copy of the CUV text (it is public
 * domain, 1919), which would remove the third party altogether.
 */

/**
 * Overridable because Bible SuperSearch is open source and explicitly supports
 * self-hosting ("install our API code on YOUR website! No usage limits!"),
 * which would remove both the daily cap and the dependency on their uptime.
 * Also the seam used to exercise the failure path in testing.
 */
const ENDPOINT = process.env.BIBLESUPERSEARCH_ENDPOINT?.trim() || "https://api.biblesupersearch.com/api";

/** Bible SuperSearch module identifiers, paired with the field each fills. */
const MODULES: Record<"zhTW" | "zhCN", string> = {
    zhTW: "chinese_union_trad",
    zhCN: "chinese_union_simp",
};

/**
 * The Chinese Union modules return a space between every character
 * ("耶 穌 對 他 說"), which has to go before the text reaches a verse field.
 */
function normalize(text: string): string {
    return text.replace(/\s+/g, "").trim();
}

type BssVerse = { text?: string };
type BssResult = {
    book_name?: string;
    chapter_verse?: string;
    verses_count?: number;
    verses?: Record<string, Record<string, Record<string, BssVerse>>>;
};

/**
 * Editor-facing text names the translation, never the service behind it. The
 * Studio is deliberately unaware of which API supplies the CUV, so an error
 * message must not be the thing that tells it.
 */
const LABEL = "和合本 Chinese Union Version";

/**
 * The free tier caps both requests per minute and hits per day, and says so in
 * the error body rather than only in the status. Either way nothing else will
 * succeed until it resets, which is what `unavailable` tells the caller.
 */
const QUOTA_SPENT = /maximum hits has been reached|rate limit/i;

function bothFieldsFailed(message: string, unavailable = false): ProviderResult {
    const prefixed = `${LABEL}: ${message}`;
    return {
        texts: {},
        errors: { zhTW: prefixed, zhCN: prefixed },
        ...(unavailable ? { unavailable: prefixed } : {}),
    };
}

export const bibleSuperSearchProvider: ScriptureProvider = {
    id: "biblesupersearch",
    label: LABEL,
    fields: ["zhTW", "zhCN"] as const,
    // No API key, so nothing can make it unavailable up front; reachability is
    // a per-request concern handled by the orchestrator's timeout.
    available: true,

    async fetchPassage(reference, signal): Promise<ProviderResult> {
        const params = new URLSearchParams();
        params.append("bible[]", MODULES.zhTW);
        params.append("bible[]", MODULES.zhCN);
        params.set("reference", reference);

        const response = await fetch(`${ENDPOINT}?${params}`, {
            signal,
            // An editor-triggered lookup should never serve a cached answer.
            cache: "no-store",
        });

        // An unusable reference is answered with HTTP 400 *and* a JSON body
        // naming the problem, so the body is read before the status is judged.
        // Testing `response.ok` first discarded that explanation and left the
        // editor with a bare status code.
        const payload = await response.json().catch(() => null);

        const reported: string[] = Array.isArray(payload?.errors)
            ? payload.errors.map(String)
            : [];

        // Checked before the generic error branch below: a spent quota arrives
        // in the same `errors` array as a bad book name, but means something
        // entirely different for every reference still to come.
        const quota = reported.find((message) => QUOTA_SPENT.test(message));
        if (quota) {
            return bothFieldsFailed(quota, true);
        }
        if (response.status === 429) {
            return bothFieldsFailed(`rate limited (HTTP ${response.status})`, true);
        }

        if (reported.length > 0) {
            // Typos land here, e.g. "Book not found: 'Matthews'" for the
            // workbook's misspellings.
            return bothFieldsFailed(reported[0]);
        }

        if (!response.ok) {
            return bothFieldsFailed(`lookup failed (HTTP ${response.status})`);
        }

        if (!payload) {
            return bothFieldsFailed("lookup returned an unreadable response");
        }

        const results: BssResult[] = Array.isArray(payload?.results) ? payload.results : [];
        if (results.length === 0) {
            return bothFieldsFailed("no passage found");
        }

        const texts: ProviderResult["texts"] = {};
        const canonicalParts: string[] = [];
        let verseCount = 0;

        for (const field of ["zhTW", "zhCN"] as const) {
            const collected: string[] = [];

            for (const result of results) {
                const chapters = result.verses?.[MODULES[field]] ?? {};
                for (const chapter of Object.values(chapters)) {
                    for (const verse of Object.values(chapter)) {
                        if (verse?.text) collected.push(normalize(verse.text));
                    }
                }
            }

            if (collected.length > 0) texts[field] = collected.join("");
        }

        for (const result of results) {
            verseCount += Number(result.verses_count ?? 0);
            if (result.book_name) {
                canonicalParts.push(`${result.book_name} ${result.chapter_verse ?? ""}`.trim());
            }
        }

        const errors: ProviderResult["errors"] = {};
        if (!texts.zhTW) errors.zhTW = `${LABEL}: no Traditional text returned`;
        if (!texts.zhCN) errors.zhCN = `${LABEL}: no Simplified text returned`;

        return {
            texts,
            errors,
            canonical: canonicalParts.join("; ") || undefined,
            verseCount,
        };
    },
};
