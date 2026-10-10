import { NextResponse, type NextRequest } from "next/server";
import { recentPendingContacts } from "@/lib/emailoctopus";
import { sendStaffAlert } from "@/lib/resend";
import { buildSignupAlert, DEFAULT_SIGNUP_THRESHOLD } from "@/lib/signupAlert";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The daily signup check, run by the Vercel cron in `vercel.json`. Emails staff
 * only on a day with too many unconfirmed signups; a normal day sends nothing.
 * Vercel sends `CRON_SECRET` as a bearer token; without it set, nothing runs.
 */
export async function GET(request: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const recent = await recentPendingContacts(new Date(Date.now() - DAY_MS));
    if (!recent) return NextResponse.json({ error: "emailoctopus_unavailable" }, { status: 502 });

    const configured = Number(process.env.SIGNUP_ALERT_THRESHOLD);
    const threshold = Number.isInteger(configured) && configured >= 0 ? configured : DEFAULT_SIGNUP_THRESHOLD;

    const alert = buildSignupAlert(recent, threshold);
    const alerted = alert ? await sendStaffAlert(alert.subject, alert.text) : false;

    return NextResponse.json({ pending: recent.count, threshold, alerted });
}
