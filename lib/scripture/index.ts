import { bibleSuperSearchProvider } from "./providers/bibleSuperSearch";
import { esvProvider } from "./providers/esv";
import { stripVerseParts } from "./reference";
import type { LookupResult, ProviderResult, ScriptureField, ScriptureProvider } from "./types";
import { validateReference } from "./validate";

export type { LookupResult, ScriptureField, ScriptureProvider } from "./types";
export { hasVersePart, stripVerseParts } from "./reference";
export { validateReference } from "./validate";

/** The scripture fields a rejected reference reports its reason against. */
const SCRIPTURE_FIELDS: ScriptureField[] = ["zhTW", "zhCN", "en"];

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
function failAllFields(
    provider: ScriptureProvider,
    message: string,
    unavailable = false,
): ProviderResult {
    const errors: ProviderResult["errors"] = {};
    for (const field of provider.fields) {
        errors[field] = `${provider.label}: ${message}`;
    }
    return {
        texts: {},
        errors,
        ...(unavailable ? { unavailable: `${provider.label}: ${message}` } : {}),
    };
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
    // A missing credential is structural, not a property of this reference.
    if (!provider.available) {
        return failAllFields(provider, provider.unavailableReason ?? "unavailable", true);
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
 * references (typos such as "Matthews") resolve nowhere and need manual entry.
 */
export async function lookupScripture(reference: string): Promise<LookupResult> {
    // Providers reject verse-part suffixes, so they are asked for the whole
    // verse or range. The text that comes back is never cropped to the part —
    // see lib/scripture/reference.ts.
    const lookupReference = stripVerseParts(reference);

    // Nothing malformed is ever put to a provider: they answer a bad reference
    // with a plausible wrong one rather than an error. See ./validate.ts.
    const validation = validateReference(lookupReference);
    if (!validation.valid) {
        const errors: LookupResult["errors"] = {};
        for (const field of SCRIPTURE_FIELDS) {
            errors[field] = validation.reason;
        }

        return {
            reference,
            lookupReference,
            canonical: lookupReference,
            invalid: validation.reason,
            verseCount: 0,
            texts: {},
            errors,
        };
    }

    const results = await Promise.all(
        PROVIDERS.map((provider) => runProvider(provider, lookupReference)),
    );

    const merged: LookupResult = {
        reference,
        lookupReference,
        canonical: lookupReference,
        verseCount: 0,
        texts: {},
        errors: {},
    };

    const unavailableProviders: NonNullable<LookupResult["unavailableProviders"]> = [];

    for (const [index, result] of results.entries()) {
        Object.assign(merged.texts, result.texts);
        Object.assign(merged.errors, result.errors);
        if (result.verseCount) merged.verseCount += result.verseCount;
        if (result.unavailable) {
            unavailableProviders.push({id: PROVIDERS[index].id, reason: result.unavailable});
        }
    }

    // Left absent rather than empty, so "is anything unavailable" is a plain
    // truthiness check for callers reading this back off the wire as JSON.
    if (unavailableProviders.length > 0) {
        merged.unavailableProviders = unavailableProviders;
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
