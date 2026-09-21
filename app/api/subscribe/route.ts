import { NextResponse, type NextRequest } from "next/server";
import { subscribe, type SubscribeError } from "@/lib/mailchimp";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * Newsletter signup for the footer form. The Mailchimp key never leaves the
 * server, which is why the form posts here rather than to Mailchimp directly.
 */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

/** Bots fill in every field they find; people never see this one. */
const HONEYPOT_FIELD = "website";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC 5321's limit on a whole address. */
const EMAIL_MAX_LENGTH = 254;

const ERROR_STATUS: Record<SubscribeError, number> = {
    not_configured: 500,
    invalid_email: 400,
    compliance_state: 409,
    forgotten_email: 409,
    provider_error: 502,
};

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: Record<string, unknown>, status: number, headers: Record<string, string> = {}) {
    return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export async function POST(request: NextRequest) {
    const limit = rateLimit(`subscribe:${clientIp(request.headers)}`, RATE_LIMIT, RATE_WINDOW_MS);

    if (!limit.allowed) {
        return json({ ok: false, error: "rate_limited" }, 429, {
            "Retry-After": String(limit.retryAfterSeconds),
        });
    }

    const payload = await request.json().catch(() => null);

    if (!payload || typeof payload !== "object") {
        return json({ ok: false, error: "invalid_request" }, 400);
    }

    const { email, [HONEYPOT_FIELD]: honeypot } = payload as Record<string, unknown>;

    // A filled honeypot gets the success shape: telling the bot it was caught
    // only teaches it which field to leave alone.
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
        return json({ ok: true, status: "pending" }, 200);
    }

    const address = typeof email === "string" ? email.trim() : "";

    if (!address || address.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(address)) {
        return json({ ok: false, error: "invalid_email" }, 400);
    }

    const outcome = await subscribe(address);

    if (outcome.status === "error") {
        return json({ ok: false, error: outcome.code }, ERROR_STATUS[outcome.code]);
    }

    return json({ ok: true, status: outcome.status }, 200);
}
