import {Iframe} from 'sanity-plugin-iframe-pane'
import {distinctUntilChanged, map} from 'rxjs'
import type {
    DefaultDocumentNodeResolver,
    DocumentListBuilder,
    ListBuilder,
    StructureBuilder,
    StructureResolver,
    StructureResolverContext,
} from 'sanity/structure'
import {GALLERY_ELIGIBLE_GROQ} from './lib/galleryEligibility'
import {SELECTION_CRITERIA_GROQ} from './lib/selectionCriteria'
import {NEWS_ELIGIBLE_GROQ} from './lib/newsEligibility'
import {HOME_PREVIEW, NEWS_PREVIEW} from './lib/sitePreview'
import {NEWS_CATEGORIES} from './schemaTypes/documents/news'
import {HOME_PAGE_ID} from './schemaTypes/documents/homePage'

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
 * A document list whose title carries its live count, e.g. "All artworks (302)".
 * The `drafts` perspective counts a document once whether or not it has a
 * draft, as the list itself does; the pane is rebuilt only when the number changes.
 */
function counted(
    context: StructureResolverContext,
    filter: string,
    params: Record<string, string>,
    build: (count: number) => DocumentListBuilder,
) {
    return () =>
        context.documentStore
            .listenQuery(
                {fetch: `count(*[${filter}])`, listen: `*[${filter}]`},
                params,
                {apiVersion: API_VERSION, perspective: 'drafts', transitions: ['appear', 'disappear']},
            )
            .pipe(
                map((count) => Number(count) || 0),
                distinctUntilChanged(),
                map(build),
            )
}

/** The middle "views" panes hold a few short titles; Sanity's 320–350px default leaves them mostly empty. */
const narrow = (list: ListBuilder) => list.minWidth(200).currentMaxWidth(280)

/**
 * A read-only lens over the same artwork documents.
 *
 * `documentList`, not `documentTypeList`: the latter registers a create
 * template and so puts a create button on the pane, and a document created
 * from a filtered pane does not match the filter yet and vanishes from the
 * list it was created in. Creation lives in "All artworks". The sort menu
 * ("Last edited", "Created") is the one "All artworks" gets by default.
 */
function artworkView(
    S: StructureBuilder,
    context: StructureResolverContext,
    id: string,
    title: string,
    filter: string,
) {
    return S.listItem()
        .title(title)
        .id(id)
        .child(
            counted(context, filter, {}, (count) =>
                S.documentList()
                    .id(id)
                    .title(`${title} (${count})`)
                    .schemaType('artwork')
                    .apiVersion(API_VERSION)
                    .filter(filter)
                    .menuItems(S.orderingMenuItemsForType('artwork'))
                    .defaultOrdering(NEWEST_FIRST),
            ),
        )
}

/** The same arrangement for collections; creation lives in "All collections". */
function collectionView(
    S: StructureBuilder,
    context: StructureResolverContext,
    id: string,
    title: string,
    filter: string,
) {
    return S.listItem()
        .title(title)
        .id(id)
        .child(
            counted(context, filter, {}, (count) =>
                S.documentList()
                    .id(id)
                    .title(`${title} (${count})`)
                    .schemaType('collection')
                    .apiVersion(API_VERSION)
                    .filter(filter)
                    .menuItems(S.orderingMenuItemsForType('collection'))
                    .defaultOrdering(MENU_ORDER),
            ),
        )
}

const NEWS_NEWEST_FIRST = [
    {field: 'publishedAt', direction: 'desc' as const},
    {field: '_id', direction: 'asc' as const},
]

/** A read-only news pane; creation lives in "All news". */
function newsView(
    S: StructureBuilder,
    context: StructureResolverContext,
    id: string,
    title: string,
    filter: string,
    params: Record<string, string> = {},
) {
    return S.listItem()
        .title(title)
        .id(id)
        .child(
            counted(context, filter, params, (count) =>
                S.documentList()
                    .id(id)
                    .title(`${title} (${count})`)
                    .schemaType('news')
                    .apiVersion(API_VERSION)
                    .filter(filter)
                    .params(params)
                    .menuItems(S.orderingMenuItemsForType('news'))
                    .defaultOrdering(NEWS_NEWEST_FIRST),
            ),
        )
}

/**
 * Sidebar for collaborators, in labelled groups, most used first: the
 * gallery (artworks, collections, their vocabularies), news, then pages. "All artworks" is the only place artworks are created;
 * everything under "Artwork views" is a filtered lens over those same
 * documents, so nothing ever "belongs" to one view.
 */
export const structure: StructureResolver = (S, context) =>
    S.list()
        .title('St. John’s Gospel Arts')
        // Sanity's default of 320–350px leaves these short titles in a wide
        // empty column; it can still be dragged wider.
        .minWidth(200)
        .currentMaxWidth(240)
        .items([
            S.divider().title('Gallery'),
            S.listItem()
                .title('All artworks')
                .id('all-artworks')
                .child(
                    counted(context, '_type == "artwork"', {}, (count) =>
                        S.documentTypeList('artwork')
                            .title(`All artworks (${count})`)
                            .apiVersion(API_VERSION)
                            .defaultOrdering(NEWEST_FIRST),
                    ),
                ),

            S.listItem()
                .title('Artwork views')
                .id('artwork-views')
                .child(
                    narrow(S.list())
                        .title('Artwork views')
                        .items([
                            artworkView(
                                S,
                                context,
                                'gallery-live',
                                'Gallery — live on the site',
                                `_type == "artwork" && ${GALLERY_ELIGIBLE_GROQ}`,
                            ),
                            artworkView(
                                S,
                                context,
                                'missing-scripture',
                                'Missing scripture',
                                `_type == "artwork" && (!defined(scripture.zhTW) || scripture.zhTW == "")`,
                            ),
                            artworkView(
                                S,
                                context,
                                'needs-translation',
                                'Needs translations',
                                `_type == "artwork" && ${NEEDS_TRANSLATION}`,
                            ),

                            S.listItem()
                                .title('Curation review')
                                .id('curation-review')
                                .child(
                                    narrow(S.list())
                                        .title('Curation review')
                                        .items([
                                            artworkView(
                                                S,
                                                context,
                                                'optimized-selection',
                                                'Optimized selection',
                                                `_type == "artwork" && optimizedSelection == "Y"`,
                                            ),
                                            artworkView(
                                                S,
                                                context,
                                                'visibility-overrides',
                                                'Visibility overrides',
                                                `_type == "artwork" && defined(galleryVisibility) && galleryVisibility != "auto"`,
                                            ),
                                            artworkView(
                                                S,
                                                context,
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
                    counted(context, '_type == "collection"', {}, (count) =>
                        S.documentTypeList('collection')
                            .title(`All collections (${count})`)
                            .apiVersion(API_VERSION)
                            .defaultOrdering(MENU_ORDER),
                    ),
                ),

            S.listItem()
                .title('Collection views')
                .id('collection-views')
                .child(
                    narrow(S.list())
                        .title('Collection views')
                        .items([
                            collectionView(
                                S,
                                context,
                                'collections-in-nav',
                                'In the gallery menu',
                                `_type == "collection" && showInNav != false`,
                            ),
                            collectionView(
                                S,
                                context,
                                'collections-curated',
                                'Manual selection',
                                `_type == "collection" && mode == "curated"`,
                            ),
                            collectionView(
                                S,
                                context,
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

            S.divider().title('News'),

            S.listItem()
                .title('All news')
                .id('all-news')
                .child(
                    counted(context, '_type == "news"', {}, (count) =>
                        S.documentTypeList('news')
                            .title(`All news (${count})`)
                            .apiVersion(API_VERSION)
                            .defaultOrdering(NEWS_NEWEST_FIRST),
                    ),
                ),

            S.listItem()
                .title('News views')
                .id('news-views')
                .child(
                    narrow(S.list())
                        .title('News views')
                        .items([
                            newsView(
                                S,
                                context,
                                'news-live',
                                'Live on the site',
                                `_type == "news" && ${NEWS_ELIGIBLE_GROQ}`,
                            ),
                            newsView(
                                S,
                                context,
                                'news-not-shown',
                                'Not shown — hidden or incomplete',
                                `_type == "news" && !(${NEWS_ELIGIBLE_GROQ})`,
                            ),
                            S.divider(),
                            ...NEWS_CATEGORIES.map((category) =>
                                newsView(
                                    S,
                                    context,
                                    `news-${category.value}`,
                                    category.title,
                                    '_type == "news" && category == $category',
                                    {category: category.value},
                                ),
                            ),
                        ]),
                ),
            S.divider().title('Pages'),
            // A single fixed document, so it opens straight into the form.
            S.listItem()
                .title('Home page')
                .id(HOME_PAGE_ID)
                .child(
                    S.document()
                        .schemaType('homePage')
                        .documentId(HOME_PAGE_ID)
                        .title('Home page')
                        .views([S.view.form(), S.view.component(Iframe).options(HOME_PREVIEW).title('Preview')]),
                ),
        ])

/** News opens with a Preview tab beside the form; every other type is just the form. The home page sets its own in the sidebar. */
export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, {schemaType}) =>
    schemaType === 'news'
        ? S.document().views([S.view.form(), S.view.component(Iframe).options(NEWS_PREVIEW).title('Preview')])
        : S.document()
