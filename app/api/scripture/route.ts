import { NextResponse, type NextRequest } from "next/server";
import { lookupScripture } from "@/lib/scripture";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * Studio-only scripture lookup: any other origin is refused.
 * The ESV key stays server-side because it must not be exposed in the browser.
 * The public site reads scripture from Sanity.
 */
/** The deployed Studio by its exact host: any Sanity customer can deploy to `*.sanity.studio`. */
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3333", "http://localhost:3000", "https://gospel-art.sanity.studio"];

/** An editor fetching artwork by artwork; the Vercel Firewall's one rate-limit rule guards the forms. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

/**
 * Under `pnpm dev` neither the origin nor the limit applies: the backfill and
 * verify scripts call it from Node, with no Origin and in bulk.
 */
const LOCAL_DEV = process.env.NODE_ENV === "development";

/**
 * Resolved references and validation failures are cached to avoid repeated
 * upstream calls. Deployment clears the shared cache.
 */
const IMMUTABLE = "public, max-age=3600, s-maxage=31536000";

/**
 * Provider failures are not cached because they may recover.
 */
const VOLATILE = "no-store";

function isAllowedOrigin(origin: string | null): origin is string {
    if (!origin) return false;

    const configured = (process.env.SCRIPTURE_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    return (
        DEFAULT_ALLOWED_ORIGINS.includes(origin) ||
        configured.includes(origin)
    );
}

function corsHeaders(origin: string | null): Record<string, string> {
    // Always present, even when no allow-origin header is added: the response
    // is cacheable, and a copy made for one origin must never be handed to
    // another. Without this the shared cache could serve a browser a body that
    // carries no CORS header, or the reverse.
    const headers: Record<string, string> = { Vary: "Origin" };

    if (!isAllowedOrigin(origin)) return headers;

    return {
        ...headers,
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            ...corsHeaders(request.headers.get("origin")),
            // The allowlist changes only on deploy, so the browser need not ask
            // again before every lookup.
            "Access-Control-Max-Age": "86400",
        },
    });
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin);

    // Only the Studio calls this, always cross-origin, so its browser always
    // sends Origin. Anyone else would be spending the ESV key's quota. A script
    // can forge the header, which the rate limit below blunts.
    if (!LOCAL_DEV && !isAllowedOrigin(origin)) {
        return NextResponse.json(
            { error: "此查詢僅供本事工的 Studio 使用。This lookup is only available to our Studio." },
            { status: 403, headers: { ...cors, "Cache-Control": VOLATILE } },
        );
    }
    const limit = LOCAL_DEV ? null : rateLimit(`scripture:${clientIp(request.headers)}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (limit && !limit.allowed) {
        return NextResponse.json(
            { error: "查詢太頻繁，請一分鐘後再試。Too many lookups; try again in a minute." },
            { status: 429, headers: { ...cors, "Cache-Control": VOLATILE, "Retry-After": String(limit.retryAfterSeconds) } },
        );
    }

    const reference = request.nextUrl.searchParams.get("reference")?.trim();

    if (!reference) {
        return NextResponse.json(
            { error: "A ?reference= parameter is required" },
            { status: 400, headers: { ...cors, "Cache-Control": IMMUTABLE } },
        );
    }

    const result = await lookupScripture(reference);

    // A rejected reference is decided by pure validation, so it caches like a
    // success. Anything else with errors against it went out to a provider and
    // may resolve on the next try.
    const settled =
        Boolean(result.invalid) ||
        (Object.keys(result.errors).length === 0 && !result.unavailableProviders);

    return NextResponse.json(result, {
        headers: { ...cors, "Cache-Control": settled ? IMMUTABLE : VOLATILE },
    });
}
