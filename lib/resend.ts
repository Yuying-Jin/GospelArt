/**
 * Contact-form mail through Resend. Server-only: the key can send as any
 * address on the verified domain — see `app/api/contact/route.ts`, its one caller.
 */
export type ContactError = "not_configured" | "provider_error";

export type ContactOutcome = { status: "sent" } | { status: "error"; code: ContactError };

export type ContactMessage = { name: string; email: string; message: string };

type Config = { apiKey: string; from: string; to: string[] };

const API_URL = "https://api.resend.com/emails";

function readConfig(): Config | null {
    const apiKey = process.env.RESEND_API_CONTACT_KEY?.trim();
    const from = process.env.CONTACT_FROM_EMAIL?.trim();
    const to = (process.env.CONTACT_TO_EMAIL ?? "")
        .split(",")
        .map((address) => address.trim())
        .filter(Boolean);

    if (!apiKey || !from || to.length === 0) return null;

    return { apiKey, from, to };
}

/** Plain text only, so nothing the visitor typed is ever rendered as HTML. */
export async function sendContactMessage({ name, email, message }: ContactMessage): Promise<ContactOutcome> {
    const config = readConfig();

    if (!config) {
        console.error("[contact] RESEND_API_CONTACT_KEY, CONTACT_FROM_EMAIL or CONTACT_TO_EMAIL is not set");
        return { status: "error", code: "not_configured" };
    }

    const response = await fetch(API_URL, {
        method: "POST",
        cache: "no-store",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: config.from,
            to: config.to,
            // Replying in the inbox answers the visitor, not our own sender address.
            reply_to: email,
            subject: `Contact form: ${name}`,
            text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        }),
    }).catch((error: unknown) => {
        console.error(`[contact] Resend request failed: ${error instanceof Error ? error.message : error}`);
        return null;
    });

    if (!response) return { status: "error", code: "provider_error" };

    if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        console.error(`[contact] Resend ${response.status}: ${body.message ?? "unknown error"}`);
        return { status: "error", code: "provider_error" };
    }

    return { status: "sent" };
}
