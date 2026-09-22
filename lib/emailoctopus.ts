import { createHash } from "node:crypto";

/**
 * Newsletter signup against one EmailOctopus list. The key can read and write
 * every list on the account, so this module is server-only — see
 * `app/api/subscribe/route.ts`, its one caller.
 */
export type SubscribeError = "not_configured" | "invalid_email" | "provider_error";

export type SubscribeOutcome =
    | { status: "pending" | "already_subscribed" | "already_pending" }
    | { status: "error"; code: SubscribeError };

type Config = { apiKey: string; listId: string };

const API_BASE = "https://api.emailoctopus.com";

function readConfig(): Config | null {
    const apiKey = process.env.EMAILOCTOPUS_API_KEY?.trim();
    const listId = process.env.EMAILOCTOPUS_LIST_ID?.trim();

    if (!apiKey || !listId) return null;

    return { apiKey, listId };
}

async function call(
    config: Config,
    path: string,
    init: { method: string; body?: unknown },
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
    const response = await fetch(`${API_BASE}${path}`, {
        method: init.method,
        cache: "no-store",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const body = await response.json().catch(() => ({}));

    return { ok: response.ok, status: response.status, body: body as Record<string, unknown> };
}

/** EmailOctopus addresses a contact by the MD5 of their lowercased address. */
function contactId(email: string): string {
    return createHash("md5").update(email.toLowerCase()).digest("hex");
}

/** Errors are RFC 7807 problem details: `{ title, detail, status, type }`. */
type Problem = {title?: string; detail?: string; status?: number; type?: string};

/** A duplicate is reported by status; the type and detail are read as a fallback. */
function alreadyExists(status: number, problem: Problem): boolean {
    return status === 409 || /exist/i.test(`${problem.type ?? ""} ${problem.detail ?? ""}`);
}

function fail(status: number, problem: Problem, stage: string): SubscribeOutcome {
    // EmailOctopus rejects addresses our own validation accepts, such as role
    // accounts and domains that do not resolve.
    if (status === 400 || status === 422) return {status: "error", code: "invalid_email"};

    console.error(
        `[subscribe] EmailOctopus ${stage} ${status}: ${problem.detail ?? problem.title ?? "unknown error"}`,
    );

    return {status: "error", code: "provider_error"};
}

/**
 * Adds an address as `pending`, so EmailOctopus sends the double opt-in email
 * and nobody is subscribed without confirming. This relies on double opt-in
 * being enabled on the list itself.
 */
export async function subscribe(email: string): Promise<SubscribeOutcome> {
    const config = readConfig();

    if (!config) {
        console.error("[subscribe] EmailOctopus environment variables are missing");
        return { status: "error", code: "not_configured" };
    }

    const created = await call(config, `/lists/${config.listId}/contacts`, {
        method: "POST",
        body: { email_address: email, status: "pending" },
    });

    if (created.ok) return { status: "pending" };

    const problem = created.body as Problem;

    if (alreadyExists(created.status, problem)) return resolveExisting(config, email);

    return fail(created.status, problem, "create");
}

/**
 * A contact EmailOctopus already knows is either on the list, mid-confirmation,
 * or gone — only the last needs a fresh opt-in, and re-sending it for the
 * others would knock a live subscriber back to pending.
 */
async function resolveExisting(config: Config, email: string): Promise<SubscribeOutcome> {
    const path = `/lists/${config.listId}/contacts/${contactId(email)}`;
    const existing = await call(config, path, { method: "GET" });

    if (!existing.ok) {
        console.error(`[subscribe] EmailOctopus contact lookup failed: ${existing.status}`);
        return { status: "error", code: "provider_error" };
    }

    const status = String(existing.body.status ?? "").toLowerCase();

    if (status === "subscribed") return { status: "already_subscribed" };
    if (status === "pending") return { status: "already_pending" };

    const revived = await call(config, path, { method: "PUT", body: { status: "pending" } });

    if (revived.ok) return { status: "pending" };

    return fail(revived.status, revived.body as Problem, "resubscribe");
}
