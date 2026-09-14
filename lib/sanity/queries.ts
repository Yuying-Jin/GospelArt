import {defineQuery} from 'next-sanity'

/**
 * Selection Criteria is derived, never stored — see
 * `sanity/lib/selectionCriteria.ts`, which holds the same rule for the Studio.
 * Keep the two in sync.
 *
 *   (Repetition = M or L) and (Quality = H or M) and (Creativity = H or M)
 *
 * `galleryVisibility` overrides it in both directions; a missing value is
 * treated as "auto" so documents predating the field still behave.
 */
const SELECTION_CRITERIA = 'repetition in ["M", "L"] && quality in ["H", "M"] && creativity in ["H", "M"]'

export const GALLERY_VISIBILITY = `(
    galleryVisibility == "always" ||
    ((!defined(galleryVisibility) || galleryVisibility == "auto") && ${SELECTION_CRITERIA})
)`

/**
 * The public gallery. Ordered newest-first. `_id` breaks ties purely so the
 * order is deterministic: 20 artworks in this set share a date with another,
 * and GROQ leaves the order of equal sort keys unspecified. It is not a
 * curatorial sequence.
 *
 * Scripture is also required — specifically the primary Traditional text. The
 * source workbook holds no verse text at all,
 * so migrated artworks arrive without it; they belong in the CMS as the complete
 * archive, but a card with an empty verse has nothing to show. The Studio's
 * "Missing scripture" list is the queue of artworks waiting on that text.
 */
export const galleryArtworksQuery = defineQuery(`
    *[
        _type == "artwork" &&
        defined(slug.current) &&
        defined(image.asset) &&
        defined(scripture.zhTW) &&
        ${GALLERY_VISIBILITY}
    ] | order(date desc, _id asc) {
        "slug": slug.current,
        "previousSlugs": coalesce(previousSlugs, []),
        bibleReference,
        date,
        scripture,
        image,
        "bibleThemes": bibleThemes[]->title,
        "spiritualThemes": spiritualThemes[]->title,
        "sections": sections[]{
            _key,
            "id": sectionType->key,
            "title": sectionType->title,
            body
        }
    }
`)
