/** The site's own origin, for absolute links: OG tags, the sitemap and robots.txt. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gospel-art.vercel.app').replace(/\/$/, '')
