import type {SlugValidationContext} from 'sanity'

/**
 * A slug must not collide with any other artwork's current slug *or* with any
 * archived slug in `previousSlugs`. Archived slugs still resolve in the gallery,
 * so reusing one would silently point an old shared link at the wrong artwork.
 */
export async function isUniqueArtworkSlug(
    slug: string,
    context: SlugValidationContext,
): Promise<boolean> {
    const {document, getClient} = context
    if (!document) return true

    const client = getClient({apiVersion: '2025-02-19'})
    const id = document._id.replace(/^drafts\./, '')

    const query = `!defined(*[
        _type == "artwork" &&
        !(_id in [$draft, $published]) &&
        (slug.current == $slug || $slug in previousSlugs)
    ][0]._id)`

    return client.fetch<boolean>(query, {
        draft: `drafts.${id}`,
        published: id,
        slug,
    })
}
