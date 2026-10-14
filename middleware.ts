// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
    // Every page path, not only the locale-prefixed ones, so `/gallery` is
    // sent to the visitor's language instead of Next's bare 404. API routes,
    // Next's own files and anything with a file extension are left alone.
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};