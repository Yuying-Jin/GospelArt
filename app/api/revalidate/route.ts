import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { ARTWORK_CACHE_TAG, COLLECTION_CACHE_TAG, NEWS_CACHE_TAG } from "@/lib/sanity/cache";

/**
 * Sanity webhook target: clears the cached gallery and news queries on publish.
 *
 * Configure it in sanity.io/manage with the same secret as
 * SANITY_REVALIDATE_SECRET, filtered to the types below.
 *
 * Both gallery tags are cleared for any gallery type. Collection membership is
 * derived from artworks, so an artwork edit can change a collection page;
 * clearing both keeps one publish from leaving half the gallery stale. News
 * reads nothing from the other types, so it has its own tag.
 *
 * Outside app/[locale], and middleware.ts only matches "/" and the locale
 * prefixes, so this is never locale-redirected.
 */
const GALLERY_TAGS = [ARTWORK_CACHE_TAG, COLLECTION_CACHE_TAG];

const REVALIDATED_TYPES: Record<string, string[]> = {
    artwork: GALLERY_TAGS,
    collection: GALLERY_TAGS,
    bibleTheme: GALLERY_TAGS,
    spiritualTheme: GALLERY_TAGS,
    artworkSectionType: GALLERY_TAGS,
    news: [NEWS_CACHE_TAG],
};

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

        const tags = Object.hasOwn(REVALIDATED_TYPES, body._type) ? REVALIDATED_TYPES[body._type] : null;
        if (!tags) {
            return NextResponse.json({ revalidated: false, reason: `ignoring ${body._type}` });
        }

        // Next 16 requires a cache-life profile; "max" expires the tagged
        // entries outright.
        for (const tag of tags) {
            revalidateTag(tag, "max");
        }

        return NextResponse.json({
            revalidated: true,
            tags,
            type: body._type,
            now: Date.now(),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[revalidate] webhook failed:", message);
        return new NextResponse(message, { status: 500 });
    }
}
