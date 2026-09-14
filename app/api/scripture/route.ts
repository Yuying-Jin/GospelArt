import { NextResponse, type NextRequest } from "next/server";
import { lookupScripture } from "@/lib/scripture";

/**
 * Scripture lookup endpoint for the Sanity Studio's "Fetch Scripture" action.
 *
 *   GET /api/scripture?reference=John+11:25
 *   -> { reference, canonical, verseCount, texts: {...}, errors: {...} }
 *
 * Exists because the Studio is a browser application and Crossway requires the
 * ESV key not be shared or published, so the key stays server-side here.
 *
 * This route knows nothing about any particular Bible service — translation
 * sources live behind `lib/scripture`. It is used at editing time only; the
 * public site reads scripture from Sanity and never calls this.
 *
 * Always answers 200 with per-field errors when a provider is down, so one
 * failing source cannot block the editor from taking what did resolve.
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
