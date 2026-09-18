import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { GALLERY_BATCH_SIZE, getGalleryBatch } from "@/lib/sanity/getGalleryArtworks";
import type { AppLocale } from "@/lib/sanity/mapArtwork";

/** The shape the Studio enforces on a collection's URL. */
const COLLECTION_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Batches for the gallery's infinite scroll. The batch size is fixed
 * server-side so a caller cannot request the whole archive at once.
 *
 * `collection` narrows the batch to one collection, and must match the
 * collection the page was rendered from — offsets are positions within a
 * single ordered set, not across sets.
 *
 * Outside app/[locale], and middleware.ts only matches "/" and the locale
 * prefixes, so this is never locale-redirected.
 */
export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;

    const locale = params.get("locale") ?? routing.defaultLocale;
    if (!(routing.locales as readonly string[]).includes(locale)) {
        return NextResponse.json({ error: `Unsupported locale: ${locale}` }, { status: 400 });
    }

    const rawOffset = params.get("offset") ?? "0";
    if (!/^\d+$/.test(rawOffset)) {
        return NextResponse.json(
            { error: "offset must be a non-negative integer" },
            { status: 400 },
        );
    }

    const collection = params.get("collection") ?? undefined;
    if (collection !== undefined && !COLLECTION_SLUG.test(collection)) {
        return NextResponse.json({ error: "collection is not a valid slug" }, { status: 400 });
    }

    try {
        const artworks = await getGalleryBatch(
            locale as AppLocale,
            Number(rawOffset),
            GALLERY_BATCH_SIZE,
            collection,
        );

        return NextResponse.json({ artworks });
    } catch (error) {
        console.error("[gallery] batch request failed:", error);
        return NextResponse.json({ error: "Failed to load artworks" }, { status: 502 });
    }
}
