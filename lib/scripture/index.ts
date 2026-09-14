import { bibleSuperSearchProvider } from "./providers/bibleSuperSearch";
import { esvProvider } from "./providers/esv";
import type { LookupResult, ProviderResult, ScriptureProvider } from "./types";

export type { LookupResult, ScriptureField, ScriptureProvider } from "./types";

/**
 * The registry. Swapping a translation source means adding a module that
 * satisfies `ScriptureProvider` and editing this array — nothing else.
 */
const PROVIDERS: ScriptureProvider[] = [esvProvider, bibleSuperSearchProvider];

/**
 * A provider that stops answering must not hold up the editor. Bible
 * SuperSearch has been observed accepting no TCP connections at all, in which
 * case an unbounded fetch simply hangs.
 */
const PROVIDER_TIMEOUT_MS = 8_000;

/** Marks every field a provider owns as failed, with one shared reason. */
function failAllFields(provider: ScriptureProvider, message: string): ProviderResult {
    const errors: ProviderResult["errors"] = {};
    for (const field of provider.fields) {
        errors[field] = `${provider.label}: ${message}`;
    }
    return { texts: {}, errors };
}

/**
 * Runs one provider in isolation. Never throws: an unavailable, timed-out or
 * broken provider becomes per-field error messages, so the other providers'
 * results still reach the editor.
 */
async function runProvider(
    provider: ScriptureProvider,
    reference: string,
): Promise<ProviderResult> {
    if (!provider.available) {
        return failAllFields(provider, provider.unavailableReason ?? "unavailable");
    }

    try {
        return await provider.fetchPassage(reference, AbortSignal.timeout(PROVIDER_TIMEOUT_MS));
    } catch (error) {
        const timedOut =
            error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

        if (timedOut) {
            return failAllFields(provider, `did not respond within ${PROVIDER_TIMEOUT_MS / 1000}s`);
        }

        // Node surfaces connection failures as a bare "fetch failed"; the cause
        // carries the useful part (e.g. UND_ERR_CONNECT_TIMEOUT).
        const cause = (error as { cause?: { code?: string } })?.cause?.code;
        const message = error instanceof Error ? error.message : "lookup failed";
        return failAllFields(provider, cause ? `${message} (${cause})` : message);
    }
}

/**
 * Looks a reference up across every provider and merges the results.
 *
 * Always resolves. Partial success is the expected case — a reference may be
 * found by one provider and not another, and some of this collection's
 * references (typos such as "Matthews", verse-part suffixes such as
 * "1 John 4:16b") resolve nowhere and need manual entry.
 */
export async function lookupScripture(reference: string): Promise<LookupResult> {
    const results = await Promise.all(
        PROVIDERS.map((provider) => runProvider(provider, reference)),
    );

    const merged: LookupResult = {
        reference,
        canonical: reference,
        verseCount: 0,
        texts: {},
        errors: {},
    };

    for (const result of results) {
        Object.assign(merged.texts, result.texts);
        Object.assign(merged.errors, result.errors);
        if (result.verseCount) merged.verseCount += result.verseCount;
    }

    // Prefer any provider's canonical spelling over the raw input, so the editor
    // can see how the reference was actually interpreted.
    const canonical = results.find((result) => result.canonical)?.canonical;
    if (canonical) merged.canonical = canonical;

    // A field that came back with text has no error worth showing.
    for (const field of Object.keys(merged.texts) as (keyof LookupResult["texts"])[]) {
        if (merged.texts[field]) delete merged.errors[field];
    }

    return merged;
}
