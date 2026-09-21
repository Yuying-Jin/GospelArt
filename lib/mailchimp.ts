import { createHash } from "node:crypto";

/**
 * Newsletter signup against one Mailchimp audience. The key is an admin
 * credential for the whole account, so this module is server-only — see
 * `app/api/subscribe/route.ts`, its one caller.
 */
export type SubscribeError =
    | "not_configured"
    | "invalid_email"
    | "compliance_state"
    | "forgotten_email"
    | "provider_error";

export type SubscribeOutcome =
    | { status: "pending" | "already_subscribed" | "already_pending" }
    | { status: "error"; code: SubscribeError };

type Config = { apiKey: string; audienceId: string; serverPrefix: string };

type ProblemDetail = { title?: string; detail?: string; status?: number };

function readConfig(): Config | null {
    const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();
    // The datacentre is the suffix of the key itself, so the explicit variable
    // is only an override.
    const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX?.trim() || apiKey?.split("-")[1];

    if (!apiKey || !audienceId || !serverPrefix) return null;

    return { apiKey, audienceId, serverPrefix };
}

async function call(
    config: Config,
    path: string,
    init: { method: string; body?: unknown },
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
    const response = await fetch(`https://${config.serverPrefix}.api.mailchimp.com/3.0${path}`, {
        method: init.method,
        cache: "no-store",
        headers: {
            // Mailchimp ignores the username half of basic auth.
            Authorization: `Basic ${Buffer.from(`key:${config.apiKey}`).toString("base64")}`,
            "Content-Type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const body = await response.json().catch(() => ({}));

    return { ok: response.ok, status: response.status, body: body as Record<string, unknown> };
}

/** Mailchimp addresses a member by the MD5 of their lowercased address. */
function subscriberHash(email: string): string {
    return createHash("md5").update(email.toLowerCase()).digest("hex");
}

function classify(problem: ProblemDetail): SubscribeError {
    switch (problem.title) {
        case "Invalid Resource":
            // Mailchimp rejects addresses our own validation accepts, such as
            // role accounts and domains that do not resolve.
            return "invalid_email";
        case "Member In Compliance State":
            return "compliance_state";
        case "Forgotten Email Not Subscribed":
            // A contact permanently deleted in the dashboard can never be re-added
            // by API — only by subscribing again through Mailchimp's own form.
            return "forgotten_email";
        default:
            return "provider_error";
    }
}

/**
 * Adds an address as `pending`, so Mailchimp sends the double opt-in email and
 * nobody is subscribed without confirming.
 */
export async function subscribe(email: string): Promise<SubscribeOutcome> {
    const config = readConfig();

    if (!config) {
        console.error("[subscribe] Mailchimp environment variables are missing");
        return { status: "error", code: "not_configured" };
    }

    const created = await call(config, `/lists/${config.audienceId}/members`, {
        method: "POST",
        body: { email_address: email, status: "pending" },
    });

    if (created.ok) return { status: "pending" };

    const problem = created.body as ProblemDetail;

    if (problem.title === "Member Exists") return resolveExisting(config, email);

    const code = classify(problem);
    if (code === "provider_error") {
        console.error(`[subscribe] Mailchimp ${created.status}: ${problem.title ?? "unknown error"}`);
    }

    return { status: "error", code };
}

/**
 * A member Mailchimp already knows is either on the list, mid-confirmation, or
 * gone — only the last needs a fresh opt-in, and re-sending it for the others
 * would knock a live subscriber back to pending.
 */
async function resolveExisting(config: Config, email: string): Promise<SubscribeOutcome> {
    const path = `/lists/${config.audienceId}/members/${subscriberHash(email)}`;
    const existing = await call(config, path, { method: "GET" });

    if (!existing.ok) {
        console.error(`[subscribe] Mailchimp member lookup failed: ${existing.status}`);
        return { status: "error", code: "provider_error" };
    }

    if (existing.body.status === "subscribed") return { status: "already_subscribed" };
    // No API resends the opt-in email, so a contact stuck here can only be nudged
    // from the Mailchimp dashboard: contact → Actions → Subscribe email.
    if (existing.body.status === "pending") return { status: "already_pending" };

    const revived = await call(config, path, {
        method: "PUT",
        body: { email_address: email, status: "pending" },
    });

    if (revived.ok) return { status: "pending" };

    const problem = revived.body as ProblemDetail;
    const code = classify(problem);
    if (code === "provider_error") {
        console.error(`[subscribe] Mailchimp resubscribe ${revived.status}: ${problem.title ?? "unknown error"}`);
    }

    return { status: "error", code };
}
