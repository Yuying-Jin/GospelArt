/**
 * Which Bible translation backs each scripture field.
 *
 * Configured as a code constant (rather than a Studio-editable settings
 * document or env vars) because these three choices are licensing decisions,
 * not editorial ones — changing them means re-checking terms of use, so a
 * deliberate code change and deploy is the right amount of friction.
 *
 * These are display labels only. The services and their module identifiers are
 * isolated in the app under `lib/scripture/providers/*`, so a source can be
 * replaced there without the Studio knowing:
 *   zhTW / zhCN — Chinese Union Version. Currently Bible SuperSearch.
 *   en          — ESV. Licensed exclusively by Crossway and not available from
 *                 any other source (verified: 0 of Bible SuperSearch's 91
 *                 modules), so this one is fixed, not interchangeable.
 */
export const BIBLE_VERSIONS = {
    zhTW: {provider: 'biblesupersearch' as const, label: '和合本（繁體）'},
    zhCN: {provider: 'biblesupersearch' as const, label: '和合本（简体）'},
    en: {provider: 'esv' as const, label: 'ESV'},
} as const

export type ScriptureField = keyof typeof BIBLE_VERSIONS

export const SCRIPTURE_FIELDS: ScriptureField[] = ['zhTW', 'zhCN', 'en']

/**

 * Proxy endpoint for Scripture providers.
 *
 * The ESV API key stays server-side in the Next.js app; the Sanity Studio
 * calls this endpoint instead of accessing the provider directly.
 *
 * Set SANITY_STUDIO_SCRIPTURE_API to the deployed endpoint before deploying
 * the Studio. The default points to the local Next.js dev server.
 */

export const SCRIPTURE_API_URL =
    process.env.SANITY_STUDIO_SCRIPTURE_API || 'http://localhost:3000/api/scripture'
