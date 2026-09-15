import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {GALLERY_VISIBILITY_GROQ, SELECTION_CRITERIA_GROQ} from './lib/selectionCriteria'

const API_VERSION = '2025-02-19'

const NEWEST_FIRST = [
    {field: 'date', direction: 'desc' as const},
    // Deterministic tiebreak only — 37 dates carry more than one artwork, and
    // without it the list reshuffles between renders. Carries no meaning.
    {field: '_id', direction: 'asc' as const},
]

/**
 * Awaiting translation *out of* the primary language: Traditional Chinese is
 * authored first, so what can be missing is the Simplified or English version.
 */
const NEEDS_TRANSLATION = `(
    !defined(scripture.en) || scripture.en == "" ||
    !defined(scripture.zhCN) || scripture.zhCN == "" ||
    count(sections[
        !defined(body.en) || body.en == "" || !defined(body.zhCN) || body.zhCN == ""
    ]) > 0
)`

/**
 * A read-only lens over the same artwork documents.
 *
 * Uses `documentList` rather than `documentTypeList` deliberately: only
 * `documentTypeList` registers a create template for its type, which is what
 * puts a "create artwork" button on a pane. A filtered pane is the worst place
 * to create from — the new document does not match the filter yet, so it
 * vanishes from the very list you created it in. These panes list and nothing
 * more; creation lives in "All artworks".
 */
function artworkView(S: StructureBuilder, id: string, title: string, filter: string) {
    return S.listItem()
        .title(title)
        .id(id)
        .child(
            S.documentList()
                .id(id)
                .title(title)
                .schemaType('artwork')
                .apiVersion(API_VERSION)
                .filter(filter)
                .defaultOrdering(NEWEST_FIRST),
        )
}

/**
 * Sidebar for collaborators maintaining the collection.
 *
 * "All artworks" is deliberately first and is the single place artworks are
 * created. Everything under "Artwork views" is a filtered view of those same
 * documents — an artwork appears in whichever views its fields currently
 * qualify it for, and there is never a choice to make about where it "belongs".
 */
export const structure: StructureResolver = (S) =>
    S.list()
        .title('Gospel Art')
        .items([
            // Primary entry — create and manage artworks here.
            S.listItem()
                .title('All artworks')
                .id('all-artworks')
                .child(
                    S.documentTypeList('artwork')
                        .title('All artworks')
                        .apiVersion(API_VERSION)
                        .defaultOrdering(NEWEST_FIRST),
                ),

            S.listItem()
                .title('Artwork views')
                .id('artwork-views')
                .child(
                    S.list()
                        .title('Artwork views')
                        .items([
                            artworkView(
                                S,
                                'gallery-live',
                                'Gallery — live on the site',
                                `_type == "artwork" && defined(slug.current) && defined(image.asset) && defined(scripture.zhTW) && ${GALLERY_VISIBILITY_GROQ}`,
                            ),
                            artworkView(
                                S,
                                'missing-scripture',
                                'Missing scripture',
                                `_type == "artwork" && (!defined(scripture.zhTW) || scripture.zhTW == "")`,
                            ),
                            artworkView(
                                S,
                                'needs-translation',
                                'Needs translations',
                                `_type == "artwork" && ${NEEDS_TRANSLATION}`,
                            ),

                            S.listItem()
                                .title('Curation review')
                                .id('curation-review')
                                .child(
                                    S.list()
                                        .title('Curation review')
                                        .items([
                                            artworkView(
                                                S,
                                                'optimized-selection',
                                                'Optimized selection',
                                                `_type == "artwork" && optimizedSelection == "Y"`,
                                            ),
                                            artworkView(
                                                S,
                                                'visibility-overrides',
                                                'Visibility overrides',
                                                `_type == "artwork" && defined(galleryVisibility) && galleryVisibility != "auto"`,
                                            ),
                                            artworkView(
                                                S,
                                                'criteria-conflicts',
                                                'Passes criteria but rated N overall',
                                                `_type == "artwork" && overallSelection == "N" && ${SELECTION_CRITERIA_GROQ}`,
                                            ),
                                        ]),
                                ),
                        ]),
                ),
            S.divider(),

            S.documentTypeListItem('bibleTheme').title('Bible Themes'),
            S.documentTypeListItem('spiritualTheme').title('Spiritual Themes'),
            S.documentTypeListItem('artworkSectionType').title('Section Types'),
        ])
