import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { ARTWORK_CACHE_TAG } from "@/lib/sanity/getGalleryArtworks";

/**
 * Sanity webhook target: clears the cached gallery query the moment a
 * collaborator publishes, so an edit is live in seconds without a redeploy.
 *
 * Point a webhook at POST /api/revalidate in sanity.io/manage with the same
 * secret as SANITY_REVALIDATE_SECRET, filtered to the four content types below.
 * All of them feed the gallery projection — theme names and section headings are
 * referenced into it, so a change to any of them can alter the rendered page.
 *
 * This route sits outside app/[locale], and middleware.ts only matches "/" and
 * the locale prefixes, so it is never locale-redirected.
 */
const REVALIDATED_TYPES = ["artwork", "bibleTheme", "spiritualTheme", "artworkSectionType"];

export async function POST(request: NextRequest) {
    const secret = process.env.SANITY_REVALIDATE_SECRET;

    if (!secret) {
        return new NextResponse("SANITY_REVALIDATE_SECRET is not configured", { status: 500 });
    }

    try {
        const { isValidSignature, body } = await parseBody<{ _type?: string }>(request, secret);

        if (!isValidSignature) {
            return new NextResponse("Invalid signature", { status: 401 });
        }

        if (!body?._type) {
            return new NextResponse("Payload is missing _type", { status: 400 });
        }

        if (!REVALIDATED_TYPES.includes(body._type)) {
            return NextResponse.json({ revalidated: false, reason: `ignoring ${body._type}` });
        }

        // Next 16 requires a cache-life profile; "max" expires the tagged
        // entries outright, which is what an editorial publish should do.
        revalidateTag(ARTWORK_CACHE_TAG, "max");

        return NextResponse.json({
            revalidated: true,
            tag: ARTWORK_CACHE_TAG,
            type: body._type,
            now: Date.now(),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[revalidate] webhook failed:", message);
        return new NextResponse(message, { status: 500 });
    }
}
