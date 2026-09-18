import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {GALLERY_ELIGIBLE_GROQ} from './lib/galleryEligibility'
import {SELECTION_CRITERIA_GROQ} from './lib/selectionCriteria'

const API_VERSION = '2025-02-19'

const NEWEST_FIRST = [
    {field: 'date', direction: 'desc' as const},
    // Tiebreak only: 37 dates carry more than one artwork, and the list would
    // otherwise reshuffle between renders.
    {field: '_id', direction: 'asc' as const},
]

/** The order the collections appear in on the site. */
const MENU_ORDER = [
    {field: 'navOrder', direction: 'asc' as const},
    {field: 'title.zhTW', direction: 'asc' as const},
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
 * `documentList`, not `documentTypeList`: the latter registers a create
 * template and so puts a create button on the pane, and a document created
 * from a filtered pane does not match the filter yet and vanishes from the
 * list it was created in. Creation lives in "All artworks".
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

/** The same arrangement for collections; creation lives in "All collections". */
function collectionView(S: StructureBuilder, id: string, title: string, filter: string) {
    return S.listItem()
        .title(title)
        .id(id)
        .child(
            S.documentList()
                .id(id)
                .title(title)
                .schemaType('collection')
                .apiVersion(API_VERSION)
                .filter(filter)
                .defaultOrdering(MENU_ORDER),
        )
}

/**
 * Sidebar for collaborators. "All artworks" comes first and is the only place
 * artworks are created; everything under "Artwork views" is a filtered lens
 * over those same documents, so nothing ever "belongs" to one view.
 */
export const structure: StructureResolver = (S) =>
    S.list()
        .title('Gospel Art')
        .items([
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
                                `_type == "artwork" && ${GALLERY_ELIGIBLE_GROQ}`,
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

            S.listItem()
                .title('All collections')
                .id('all-collections')
                .child(
                    S.documentTypeList('collection')
                        .title('All collections')
                        .apiVersion(API_VERSION)
                        .defaultOrdering(MENU_ORDER),
                ),

            S.listItem()
                .title('Collection views')
                .id('collection-views')
                .child(
                    S.list()
                        .title('Collection views')
                        .items([
                            collectionView(
                                S,
                                'collections-in-nav',
                                'In the gallery menu',
                                `_type == "collection" && showInNav != false`,
                            ),
                            collectionView(
                                S,
                                'collections-curated',
                                'Manual selection',
                                `_type == "collection" && mode == "curated"`,
                            ),
                            collectionView(
                                S,
                                'collections-dynamic',
                                'Automatic rules',
                                `_type == "collection" && mode == "dynamic"`,
                            ),
                        ]),
                ),
            S.divider(),

            S.documentTypeListItem('bibleTheme').title('Bible Themes'),
            S.documentTypeListItem('spiritualTheme').title('Spiritual Themes'),
            S.documentTypeListItem('artworkSectionType').title('Section Types'),
        ])
