/**
 * Sanity's built-in slugify turns `_` into `-`, but the artwork slug uses `_`
 * to separate date from reference (`2025-08-01_john-11-25`), so this custom
 * slugify preserves it and otherwise matches `slugifyBibleReference`.
 */

export function artworkSlugify(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[:.]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}
