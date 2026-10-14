import { notFound } from "next/navigation";

/**
 * Any address under a locale that no route claims, so it gets the site's own
 * 404 (`../not-found.tsx`, inside the locale layout) rather than Next's bare one.
 */
export default function UnknownPage() {
    notFound();
}
