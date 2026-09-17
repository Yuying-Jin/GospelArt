import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { GALLERY_BATCH_SIZE, getGalleryBatch } from "@/lib/sanity/getGalleryArtworks";
import type { AppLocale } from "@/lib/sanity/mapArtwork";

/**
 * Batches for the gallery's infinite scroll. The batch size is fixed
 * server-side so a caller cannot request the whole archive at once.
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

    try {
        const artworks = await getGalleryBatch(
            locale as AppLocale,
            Number(rawOffset),
            GALLERY_BATCH_SIZE,
        );

        return NextResponse.json({ artworks });
    } catch (error) {
        console.error("[gallery] batch request failed:", error);
        return NextResponse.json({ error: "Failed to load artworks" }, { status: 502 });
    }
}
