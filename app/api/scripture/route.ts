import { NextResponse, type NextRequest } from "next/server";
import { lookupScripture } from "@/lib/scripture";

/**
 * Scripture lookup for the Studio's "Fetch Scripture" action.
 *
 *   GET /api/scripture?reference=John+11:25
 *   -> { reference, canonical, verseCount, texts: {...}, errors: {...} }
 *
 * The Studio runs in the browser and Crossway forbids publishing the ESV key,
 * so the key stays here. Editing time only — the public site reads scripture
 * from Sanity.
 *
 * Always answers 200 with per-field errors, so one failing provider cannot
 * block the editor from keeping what did resolve.
 */

/** The Studio is deployed separately, so this is cross-origin to our own app. */
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3333", "http://localhost:3000"];

function corsHeaders(origin: string | null): Record<string, string> {
    if (!origin) return {};

    const configured = (process.env.SCRIPTURE_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    const permitted =
        DEFAULT_ALLOWED_ORIGINS.includes(origin) ||
        configured.includes(origin) ||
        origin.endsWith(".sanity.studio");

    return permitted
        ? {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              Vary: "Origin",
          }
        : {};
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(request.headers.get("origin")),
    });
}

export async function GET(request: NextRequest) {
    const cors = corsHeaders(request.headers.get("origin"));
    const reference = request.nextUrl.searchParams.get("reference")?.trim();

    if (!reference) {
        return NextResponse.json(
            { error: "A ?reference= parameter is required" },
            { status: 400, headers: cors },
        );
    }

    const result = await lookupScripture(reference);

    return NextResponse.json(result, { headers: cors });
}
