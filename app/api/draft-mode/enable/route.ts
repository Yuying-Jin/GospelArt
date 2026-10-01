import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { getPreviewClient } from "@/lib/sanity/client";

/**
 * The Studio's news Preview tab opens this with a short-lived secret it
 * stored in the dataset; the secret is checked against the dataset before
 * Draft Mode is turned on, and the redirect only ever goes to a path here.
 */
export async function GET(request: Request) {
    const client = getPreviewClient();
    if (!client) return new Response("Preview is not configured", { status: 503 });
    return defineEnableDraftMode({ client }).GET(request);
}
