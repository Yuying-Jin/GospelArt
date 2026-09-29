import { NextResponse, type NextRequest } from "next/server";
import { sendContactMessage, type ContactError } from "@/lib/resend";
import { domainAcceptsMail } from "@/lib/emailDomain";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Contact Us form. The Resend key never leaves the server. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

/** Bots fill in every field they find; people never see this one. */
const HONEYPOT_FIELD = "website";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC 5321's limit on a whole address. */
const EMAIL_MAX_LENGTH = 254;
const NAME_MAX_LENGTH = 100;
/** Mirrored on the form in contact/page.tsx. */
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;

const ERROR_STATUS: Record<ContactError, number> = {
    not_configured: 500,
    provider_error: 502,
};

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: Record<string, unknown>, status: number, headers: Record<string, string> = {}) {
    return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
    const limit = rateLimit(`contact:${clientIp(request.headers)}`, RATE_LIMIT, RATE_WINDOW_MS);

    if (!limit.allowed) {
        return json({ ok: false, error: "rate_limited" }, 429, {
            "Retry-After": String(limit.retryAfterSeconds),
        });
    }

    const payload = await request.json().catch(() => null);

    if (!payload || typeof payload !== "object") {
        return json({ ok: false, error: "invalid_request" }, 400);
    }

    const fields = payload as Record<string, unknown>;

    // A filled honeypot gets the success shape: telling the bot it was caught
    // only teaches it which field to leave alone.
    if (text(fields[HONEYPOT_FIELD]) !== "") {
        return json({ ok: true }, 200);
    }

    // Line breaks in the name would end up in the subject line.
    const name = text(fields.name).replace(/\s+/g, " ");
    const email = text(fields.email);
    const message = text(fields.message);

    if (!name || name.length > NAME_MAX_LENGTH) {
        return json({ ok: false, error: "invalid_request" }, 400);
    }

    if (message.length < MESSAGE_MIN_LENGTH || message.length > MESSAGE_MAX_LENGTH) {
        return json({ ok: false, error: "invalid_message" }, 400);
    }

    if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
        return json({ ok: false, error: "invalid_email" }, 400);
    }

    // Catches typo'd and made-up domains; whether the mailbox exists cannot be told without mailing it.
    if (!(await domainAcceptsMail(email))) {
        return json({ ok: false, error: "invalid_email" }, 400);
    }

    const outcome = await sendContactMessage({ name, email, message });

    if (outcome.status === "error") {
        return json({ ok: false, error: outcome.code }, ERROR_STATUS[outcome.code]);
    }

    return json({ ok: true }, 200);
}
