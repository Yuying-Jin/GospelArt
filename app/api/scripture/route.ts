import { NextResponse, type NextRequest } from "next/server";
import { lookupScripture } from "@/lib/scripture";

/**
 * Studio-only scripture lookup.
 * The ESV key stays server-side because it must not be exposed in the browser.
 * The public site reads scripture from Sanity.
 */
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3333", "http://localhost:3000"];

/**
 * Resolved references and validation failures are cached to avoid repeated
 * upstream calls. Deployment clears the shared cache.
 */
const IMMUTABLE = "public, max-age=3600, s-maxage=31536000";

/**
 * Provider failures are not cached because they may recover.
 */
const VOLATILE = "no-store";

function corsHeaders(origin: string | null): Record<string, string> {
    // Always present, even when no allow-origin header is added: the response
    // is cacheable, and a copy made for one origin must never be handed to
    // another. Without this the shared cache could serve a browser a body that
    // carries no CORS header, or the reverse.
    const headers: Record<string, string> = { Vary: "Origin" };

    if (!origin) return headers;

    const configured = (process.env.SCRIPTURE_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    const permitted =
        DEFAULT_ALLOWED_ORIGINS.includes(origin) ||
        configured.includes(origin) ||
        origin.endsWith(".sanity.studio");

    if (!permitted) return headers;

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
    const cors = corsHeaders(request.headers.get("origin"));
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
