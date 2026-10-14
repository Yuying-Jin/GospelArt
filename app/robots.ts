import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Production is open to crawlers but for the API and the unfinished sign-in
 * pages; a preview deployment is closed, so a shared preview link never gets
 * a half-built page indexed. A request, not access control.
 */
export default function robots(): MetadataRoute.Robots {
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
        return { rules: { userAgent: "*", disallow: "/" } };
    }
    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/*/auth/"] },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
