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

/** A lost confirmation email can be re-sent once this long has passed, and no sooner. */
const RESEND_AFTER_MS = 60 * 60 * 1000;

/**
 * A contact EmailOctopus already knows is either on the list, mid-confirmation,
 * or gone. A live subscriber is left alone; the other two get a fresh opt-in.
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
    if (status === "pending") return resendPending(config, email, path, existing.body);

    const revived = await call(config, path, { method: "PUT", body: { status: "pending" } });

    if (revived.ok) return { status: "pending" };

    return fail(revived.status, revived.body as Problem, "resubscribe");
}

/**
 * EmailOctopus only sends the opt-in email when a contact is created, so an
 * unconfirmed one is deleted and recreated. The cooldown keeps the form from
 * being used to flood someone else's inbox.
 */
async function resendPending(
    config: Config,
    email: string,
    path: string,
    contact: Record<string, unknown>,
): Promise<SubscribeOutcome> {
    const updated = Date.parse(String(contact.last_updated_at ?? contact.created_at ?? ""));

    if (!(Date.now() - updated >= RESEND_AFTER_MS)) return { status: "already_pending" };

    const removed = await call(config, path, { method: "DELETE" });

    if (!removed.ok) return fail(removed.status, removed.body as Problem, "resend");

    const created = await call(config, `/lists/${config.listId}/contacts`, {
        method: "POST",
        body: { email_address: email, status: "pending" },
    });

    if (created.ok) return { status: "pending" };

    return fail(created.status, created.body as Problem, "resend");
}

/** At most this many pages are read, so a flood cannot keep the daily check running. */
const MAX_PAGES = 10;

export type RecentPending = { count: number; addresses: string[]; truncated: boolean };

/**
 * Contacts created as `pending` since `since`, for the daily signup check in
 * `app/api/cron/signup-check/route.ts`. Read-only. `null` when unconfigured or
 * when EmailOctopus fails.
 */
export async function recentPendingContacts(since: Date): Promise<RecentPending | null> {
    const config = readConfig();
    if (!config) return null;

    const addresses: string[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
        const query = new URLSearchParams({
            status: "pending",
            "created_at.gte": since.toISOString().replace(/\.\d{3}Z$/, "Z"),
            limit: "100",
        });
        if (cursor) query.set("starting_after", cursor);

        const result = await call(config, `/lists/${config.listId}/contacts?${query}`, { method: "GET" });
        if (!result.ok) {
            console.error(`[signup-check] EmailOctopus list contacts ${result.status}`);
            return null;
        }

        const data = Array.isArray(result.body.data) ? (result.body.data as Record<string, unknown>[]) : [];
        for (const contact of data) addresses.push(String(contact.email_address ?? ""));

        const paging = result.body.paging as { next?: { starting_after?: string } | null } | undefined;
        cursor = paging?.next?.starting_after;
        if (!cursor) return { count: addresses.length, addresses, truncated: false };
    }

    return { count: addresses.length, addresses, truncated: true };
}
