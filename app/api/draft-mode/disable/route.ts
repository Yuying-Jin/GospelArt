import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Leaves the preview from its banner and returns to the same page, published. */
export async function POST(request: NextRequest) {
    (await draftMode()).disable();
    const form = await request.formData();
    const target = new URL(String(form.get("path") ?? "/"), request.url);
    // Only back to this site: `//host` and `/\host` resolve elsewhere.
    const home = new URL("/", request.url);
    return NextResponse.redirect(target.origin === home.origin ? target : home, 303);
}
