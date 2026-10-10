# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

St. John's Gospel Arts is a Next.js gallery and ministry site for Christian art. Trilingual (English, Simplified Chinese, Traditional Chinese), with the English name in every locale until the ministry settles a Chinese one, showing scripture-inspired artwork with a Chinese-cathedral/stained-glass theme. Most UI copy and code comments are in Chinese.

## Commands

The app uses **pnpm**, pinned via `packageManager`.

```bash
pnpm dev      # next dev --turbopack, localhost:3000 (also this machine's LAN IP: see allowedDevOrigins in next.config.ts)
pnpm build    # production build
pnpm start    # run a production build
pnpm lint     # eslint . (Next 16 removed `next lint`)
pnpm test     # node --test "lib/**/*.test.ts" — Node's own runner, no framework
```

### Sanity Studio (separate sub-project)

`sanity/` is an independent Studio project with its own `package.json`, lockfile, `node_modules` and pnpm pin, outside the Next.js build. Run its commands from inside it:

```bash
cd sanity && pnpm install                 # plain install — see below
cd sanity && pnpm dev                     # local Studio UI
cd sanity && pnpm build
cd sanity && pnpm deploy                  # publishes to gospel-art.sanity.studio
cd sanity && npx sanity schema validate   # check the schema without starting the UI
cd sanity && npx sanity documents validate --yes   # run every validation rule over the dataset
```

**Do not pass `--ignore-workspace`, and do not delete `sanity/pnpm-workspace.yaml`.** That file makes `sanity/` its own workspace root; without it pnpm climbs to the repo root, reports "Already up to date" and leaves `sanity/node_modules` empty, and the Studio resolves `sanity`/`react` out of the app's `node_modules` and refuses to boot. The flag was the old workaround and now ignores the Studio's own `esbuild` `allowBuilds` entry and pnpm pin too.

The Studio does not deploy on push: `pnpm deploy` it by hand from a clean tree. `autoUpdates` in `sanity.cli.ts` does move the *deployed* Studio to new minor versions on its own, and is kept on deliberately. Several customizations lean on Sanity's internal markup (see [Studio customizations](#studio-customizations)), so after any Sanity upgrade, automatic or not, check:

1. A News item's body: dark editing area, toolbar letter icons the same size, the Image button centred, a highlight in light gold on dark brown.
2. Any text field: the `n / max` counter, and the toast when typing past the limit.
3. An artwork's Bible Reference picker, including the whole-chapter checkbox.
4. Fetch Scripture's review step and its per-language checkboxes.
5. Change gallery URL on an artwork and Change page URL on a news item.
6. A news item's Preview tab: the draft loads, with the Exit preview button showing.
7. Home page in the sidebar opens straight into its one document, with no Duplicate or Delete, its Artworks row collection picker, and its closing verse's passage picker and Fetch.

### Docker

`docker-compose.yml` runs the app in dev mode in a container (installs deps + `pnpm dev` on boot, mounting `.env`/`.env.local`). `Dockerfile` is a separate multi-stage production build; `next.config.ts` emits `output: 'standalone'` only when `DOCKER_BUILD=true` at build time.

### Environment variables

Local values live in `.env.local` (and `.env`), both gitignored with no committed template — add missing keys by hand.

- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` — the app's Sanity client. The Studio reads neither; its project id and dataset sit in `sanity/sanity.config.ts` and `sanity/sanity.cli.ts`, as neither is a secret.
- `SANITY_REVALIDATE_SECRET` — shared secret for the publish webhook that calls `POST /api/revalidate`.
- `SANITY_API_MIGRATION_TOKEN` — **scripts only** (`scripts/*.mjs`), never at runtime. Editor permissions.
- `SANITY_API_SUBMISSIONS_TOKEN` — the contributor submissions API, at runtime. Editor, the lowest write role the plan sells: it can publish, and only `lib/submissions/draftAccess.ts` keeps that out of a contributor's reach. Separate from the migration token so either can be revoked alone.
- `SANITY_API_READ_TOKEN` — **server-side only**, Viewer. The Studio's news preview reads drafts with it, which are private on a public dataset. Without it `/api/draft-mode/enable` answers 503.
- `ESV_API_KEY` — **server-side only**. Crossway forbids publishing it, which is why `app/api/scripture/route.ts` proxies for the Studio.
- `SANITY_STUDIO_SCRIPTURE_API` — the deployed `/api/scripture` URL, baked into the Studio bundle, so changing it needs another deploy. It must live in **`sanity/.env.production`**: the Sanity CLI only reads env files under `sanity/`, and only `SANITY_STUDIO_*` names reach the bundle. Absent for local `sanity dev`, which falls back to the localhost default in `sanity/lib/bibleVersions.ts`.
- `SCRIPTURE_ALLOWED_ORIGINS` — extra CORS origins for `/api/scripture`, comma separated. `localhost:3333`, `localhost:3000` and `*.sanity.studio` are always allowed.
- `BIBLESUPERSEARCH_ENDPOINT` — optional override, e.g. a self-hosted instance.
- `EMAILOCTOPUS_API_KEY`, `EMAILOCTOPUS_LIST_ID` — **server-side only**, the footer newsletter signup behind `POST /api/subscribe`. The key reads and writes every list on the account, which is why the form posts to our route.
- `RESEND_API_CONTACT_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` — **server-side only**, the Contact Us form behind `POST /api/contact` (`lib/resend.ts`). The sender must be on the Resend-verified `sjgart.org` domain; recipients are comma separated. The visitor's address goes in `reply_to`, never `from`.
- `NEXT_PUBLIC_SITE_URL` — the site's origin, the `metadataBase` for OG tags in `app/[locale]/layout.tsx`. Optional: it falls back to the Vercel URL.
- `DROPBOX_TOKEN` — the legacy `app/api/artworks/route.ts` only.

## Architecture

### Routing & i18n

App Router with `next-intl`; locale is a top-level dynamic segment, so all real routes live under `app/[locale]/`.

- `middleware.ts` + `i18n/routing.ts` define the locales (`en`, `zh-CN`, `zh-TW`). `defaultLocale` is `en`, reached only when the browser asks for no Chinese at all. A locale the visitor picked is stored in `NEXT_LOCALE` and read ahead of `Accept-Language`, which is why `LanguageSwitcher` must route through `i18n/navigation` with the locale passed in: that is what writes the cookie.
- `i18n/request.ts` loads `messages/{locale}.json` per request.
- `i18n/navigation.ts` exports locale-aware `Link`/`redirect`/`usePathname`/`useRouter` — use these, not `next/navigation`/`next/link`, inside `app/[locale]/**`.
- `app/page.tsx` and `app/[locale]/page.tsx` are pure redirects (root → default locale → `/{locale}/home`).
- The `(public)` route group (`about`, `gallery`, `news`, `witness`, `feedback`, `privacy-policy`, `terms-of-use`, `auth/*`) shares `app/[locale]/(public)/layout.tsx` and `public.module.css`. `home` has its own layout and `home.module.css`.
- `constants/nav.ts` (`navLinks`) is the source of truth for nav and footer paths: `Navbar` renders `navigation`, `Footer` renders `policy`, and neither repeats the other. The navbar's `gallery` entry alone is data-driven, expanding into a submenu of Sanity collections, archive last; no collection name or slug appears in the code.
- `messages/types.ts` is a hand-maintained type for the translation JSON and currently inert: every `useTranslations<…>` call site is commented out and it covers only part of the JSON. Treat it as documentation.
- `gallery/page.tsx` (whole archive) and `gallery/[collection]/page.tsx` both render `gallery/GalleryView.tsx`, differing only in which artworks they name.

### Artwork data — Sanity CMS, plus a fixture and a legacy pipeline

Sanity is the production source of truth. Two older representations remain deliberately and are not duplicates to reconcile.

1. **Sanity CMS** (`sanity/schemaTypes/`, queried from `lib/sanity/`) — the live source. `GalleryView.tsx` is a server component calling `getGalleryFeed(locale, collectionSlug)`; `GalleryClient.tsx` holds the interactive behaviour, and `getGalleryBatch` serves later windows through `/api/gallery`.
2. **Fixture** (`data/artworks.json`) — development and fallback data. `lib/sanity/getGalleryArtworks.ts` falls back to it when Sanity is unconfigured, empty or erroring, so a CMS outage cannot take the gallery down. `scripts/seed-taxonomies.mjs` reads the section headings out of it too.
3. **Dropbox/Excel pipeline** (`app/api/artworks/route.ts`, `lib/excel/`, `constants/artworkKeyMap.ts`) — superseded, still functional, called by nothing.

#### Field model

`types/artwork.ts` is the contract the UI consumes, and `lib/sanity/mapArtwork.ts` is the only place Sanity's shape is converted into it. When adding a field, change the GROQ projection in `lib/sanity/queries.ts` and the mapper together.

Three concepts are deliberately separate and must not be merged:

- `bibleReference` — the citation in one stored format: canonical English book, chapter, then verses (`"John 11:25"`, `"Proverbs 31:10-12, 28-29"`, `"1 John 4:16b"`, or `"Psalms 23"` for a whole chapter). The Studio's passage picker writes it; the field stays free text for lists and half verses, with a warning when it strays. `lib/scripture/normalize.ts` defines the format, and Fetch Scripture rewrites the field to it — spelling, punctuation and spacing only, never a different passage.
- **Bible Themes** (`bibleTheme`) — a thematic vocabulary. *Not* a book index and not derived from the reference; a book taxonomy would be its own type and is deferred.
- **Spiritual Themes** (`spiritualTheme`) — the devotional vocabulary (`Life`, `Hope`).

One theme per entry, in both vocabularies: a name containing a list separator (`,` `，` `、` `;` `；`) is refused (`sanity/lib/singleTheme.ts`), since "Sin, Repentance, Grace" cannot be filtered on or used as a collection rule. `artworkSubject` is unrelated to either: the workbook's old free-text "Artwork theme" column describing what the painting depicts.

Detail sections are `{sectionType: reference, body: localeText}`. The heading lives on the referenced `artworkSectionType`, since the same headings repeat on every artwork; only the body is per-artwork. `artworkSectionType.key` becomes the section's `id` on the site, where `DetailsModal.tsx` uses it for accordion state and `aria-controls` — it must stay stable.

#### Localization

Field-level, via `localeString` / `localeText` / `localeRichText`. **Sanity field names must be alphanumeric**, so locales are stored as `en` / `zhCN` / `zhTW` and converted back in `mapArtwork.ts`. Traditional Chinese is authored first. On the site each Chinese script falls back to the other and then to English, and English falls back to Traditional, so partial translation is safe to ship.

Scripture is **displayed bilingually** — Chinese and English together; the UI locale only picks which Chinese script. Document-level i18n was rejected for that reason, and because one artwork is one image, one date and one set of curation scores.

#### Selection criteria and gallery visibility

`selectionCriteria` is **derived, never stored**, in the Studio and in GROQ alike, so it cannot drift from its inputs:

```
(Repetition ∈ {M,L}) ∧ (Quality ∈ {H,M}) ∧ (Creativity ∈ {H,M})
```

The workbook's own rule, agreeing with its stored column on all 302 rows. `sanity/lib/selectionCriteria.ts` and `lib/sanity/queries.ts` each hold a copy — keep them in sync.

`galleryVisibility` (`auto` | `always` | `never`, default `auto`) overrides it in **both** directions, since the archive holds artworks that pass the criteria but were rated `N` overall. The gallery also requires an image and scripture in all three languages; "Missing scripture" in the Studio sidebar is the work queue.

#### Slugs and link stability

Slugs are stored, never derived at query time — `date_bible-reference` is not unique (the workbook has a genuine duplicate, and 20 dates carry several artworks). The slug field (`AutoSlugInput.tsx`) cannot be typed into: it fills itself in from date and reference, suffixing `-2` on collision, and follows them until the document is first published with a slug. After that only the **Change gallery URL** action changes it, archiving the old value into `previousSlugs` in the same transaction; archived slugs stay taken. The gallery resolves `previousSlugs` too and rewrites the URL to the canonical one. News works the same way (`sanity/actions/changeUrl.tsx` holds both actions).

#### Collections

A `collection` document is a named grouping of gallery artworks and a level of gallery navigation. Collections are **not** a taxonomy — a dynamic collection *consumes* the themes as rules.

Two modes, not to be merged. Stored as `curated` / `dynamic`, but the Studio calls them **Manual selection** / **Automatic rules**. The gap is deliberate — code keeps the technical name, the interface speaks plainly to collaborators — so do not "fix" either side to match.

- **Curated** — `artworks` is an ordered array of references, and the array order *is* the display order.
- **Dynamic** — `rules` (themes with `any`/`all`, a date range, `sort`, `limit`) evaluated at query time, **never materialised**. `lib/sanity/collectionFilter.ts` is the only place rules become GROQ; theme ids are always bound parameters.

A collection only ever *narrows* the gallery: members must also pass `GALLERY_FILTER`. `sanity/lib/galleryEligibility.ts` is the Studio's copy of that predicate, `GALLERY_ELIGIBLE` in `lib/sanity/queries.ts` the app's — keep them in sync.

Batching works two ways because ordering has two sources, decided in `lib/sanity/getCollections.ts` (`GallerySource`):

- `kind: 'query'` — the whole gallery and dynamic collections, windowed with a `[$start...$end]` slice.
- `kind: 'list'` — curated collections. GROQ cannot sort by array position, and **a filter on a dereferenced array is not an array filter** (`refs[]->[cond]` resolves to `null`), so the member list is projected with an eligibility flag, filtered in JS, and each window fetched by slug and reordered. Verify changes here against the dataset.

`showInNav` / `navOrder` drive the menu; `navOrder` is optional, so the sort happens in `mapCollection.ts`. An empty collection stays in the menu with an empty-state line. Collection slugs are plain — stored, unique, editable, no archive — since none has been shared yet.

### Home page

`app/[locale]/home/page.tsx` is a server component reading everything in one query (`homePageQuery`, `lib/sanity/getHomePage.ts`, mapped in `mapHome.ts`): the opening artwork, a statement with up to three items, a row of artworks, the three newest news items and a closing verse. What it says, which artwork opens it and which collection fills the row is the **Home page** singleton (`homePage`, id `homePage`), which `sanity.config.ts` keeps from being created again, duplicated or deleted. Every text field may be empty; its section then disappears. With no opening artwork chosen, or one no longer in the gallery, it opens with the newest. The row shows up to 12 of the chosen collection (featured, seasonal …) under its name, a curated one in array order, a dynamic one by its rules (a second query, `buildHomeWorksQuery`), always read published even in preview; with none chosen, or none of it in the gallery, the five newest under New Works. Its artworks carry the gallery modal's fields too, so the lit one opens `DetailsModal` on the home page at `?artwork=`, prev/next staying in the row; Share and View all go to the collection's gallery page, or the whole gallery.

The opening picture is cropped around the artwork's own hotspot (`lib/imageFocus.ts`); its light takes the image palette's colour, and comes on, picture with it, at every load. Sections below rise in the first time their first content scrolls into view (`Reveal.tsx`); one already scrolled past, as after a reload further down, just shows. The New Works picture light is on only while the section is mid-screen. `heroTone` marks a painting on white paper, which is never dimmed — the palette cannot tell. The ornaments are SVGs in `public/home/`. Reads carry the `home` tag as well as `artwork` and `news`, so the webhook's filter must include `homePage`. Its Preview tab reads the document's draft through the news preview's Draft Mode; the lists stay published. The closing verse reuses the artwork's passage picker and Fetch (`ScriptureInput` with `options.referenceField`); its ESV mark shows only on English pages, and only while `closingEsv` is set.

### News

News is the ministry's **general written publishing outlet**, not only news, announcements or time-sensitive updates: one place for meaningful public writing that can grow over time. One `news` document type holds all of it, in four categories for now:

- **Ministry Updates** (`ministry`, 事工動態) — noteworthy developments, progress and milestones: what is happening with Gospel Art that people should know. Not routine administration.
- **Spiritual Reflections** (`reflection`, 屬靈分享) — sharing centred on Scripture, by ministry workers or invited contributors, at no fixed frequency. A brief introduction to the writer is welcome; it is not a personal lifestyle blog.
- **Events & Exhibitions** (`event`, 活動展覽) — written records of and reflections on meaningful events and exhibitions, past or ongoing, kept as part of the ministry's history and testimony. **Written content, not an event system**: no registration, RSVP, calendar, status, recurrence or separate Event documents unless asked for. The event fields are descriptive; a link to gallery content (`relatedCollection`) is optional.
- **Seasonal Features** (`seasonal`, 節期專題) — themed writing for Christian seasons and holidays (Lent, Easter, Pentecost, Thanksgiving, Advent, Christmas …), not ordinary updates.

New artwork is **not** a category — it lives in the gallery's collection and the newsletter, and a news item points at a collection rather than copying artworks. Event details (name, dates, location, organizer, an optional external link that may die after the event) and the season show only for their category.

- **Categories** — `lib/newsCategories.ts` is the one definition: id (the stored value), URL segment, labels in three languages, and the editors' guide, in display order. It is byte-identical in `sanity/lib/`, enforced by `lib/newsCategories.test.ts`. The Studio's radio list, help text (`NewsCategoryInput.tsx`), category views and reserved slugs, and the site's filters, card labels and category pages all derive from it, so a new category is a new entry there plus any fields of its own. Ids and segments must not change once in use.
- **List** — `news/page.tsx` (every category) and `news/[slug]/page.tsx` (one category, at its segment) both render `news/NewsView.tsx`, a server component: one card per row (equal heights from 640px up, fitted to the text below), a generated stained-glass picture from `lib/newsPlaceholder.ts` where there is no cover, 10 per page, numbered pages as text links in `?page=` (none on page 1; out-of-range values redirect). No infinite scroll. The filter row (`NewsFilters.tsx`) is left-aligned and never wraps: All News, up to three category pills, and a More dropdown for the rest. Fewer pills fit on narrower screens (none below 640px, one, two, then three from 1024px), set in CSS by position; a selection inside More shows its name on the More trigger in the active style. Every filter is a real link, and each card's title link is stretched over the card.
- **Article** — `news/[slug]/page.tsx` renders `NewsArticle.tsx` for any slug that is not a category segment: the cover (or the placeholder), then category, title and date centred, an event box for events, the body (`NewsBody.tsx`, Portable Text), then share, the related collection and the previous/next article. Previous/next follow the list the reader came from: All News links carry `?from=all` and walk every category; category pages and links without it stay **within the article's category**. The canonical URL drops the parameter. A retired slug in `previousSlugs` permanently redirects to the current one; anything else is a 404. There is no summary lede: the summary is for the list and link previews. Styles are in `article.module.css`; the body's quote style is scoped to articles, not `public.module.css`.
- **Preview** — a news item's Preview tab in the Studio (`sanity-plugin-iframe-pane`, `sanity/lib/sitePreview.ts`) loads the article through `/api/draft-mode/enable`, which checks the Studio's short-lived secret against the dataset and turns on Draft Mode. News reads then come from drafts, uncached, and the article is found even when hidden or incomplete; the gallery stays published. The site origin comes from `SANITY_STUDIO_SCRIPTURE_API`. `PreviewBanner` shows on every public page and the home page while it is on — a small Exit preview pill, mid nav bar on a phone and bottom centre on wider screens, so the page reads as visitors will see it; it posts to `/api/draft-mode/disable`, which only redirects back to this site.
- **ESV** — Crossway requires the ESV mark and an esv.org link wherever ESV text appears. Editors write the mark ("(Psalm 19:1, ESV)"), and `lib/esvCredit.ts` turns every "ESV" in an article body into an esv.org link. The full copyright notice is `components/ScriptureCopyright.tsx`, on the terms page.
- **URL** — `<english-title>-<publication-date>`, filled in by `AutoSlugInput` and frozen at first publish; **Change page URL** archives the old one in `previousSlugs`. The category pages (`/news/updates` …) share the namespace, so `sanity/lib/newsSlug.ts` refuses their segments as article slugs. The article route, when built in `news/[slug]`, must resolve `previousSlugs` and redirect, as the gallery does.
- **Required** — both the Traditional Chinese and the English title (the URL is made from the English), category, publication date, a body in at least one language, and the event or season fields for their category. `showOnSite` hides an item without unpublishing it.
- **Eligibility** — the site filters on `NEWS_FILTER` in `lib/sanity/queries.ts`, which re-checks those fields, since the Studio's validation only blocks the Publish button. `sanity/lib/newsEligibility.ts` is the Studio's copy, driving the "Live on the site" and "Not shown" views — keep them in sync.
- **Body** — `localeRichText`: headings, quote, lists, bold, italic, underline, strikethrough, links, images with a caption, and a `highlight` decorator. The site renders the highlight as `background: var(--color-highlight); color: var(--color-highlight-text)` (Sanity Yellow 800 behind the light gold); `richTextMarks.tsx` holds the Studio preview's copy of those colours.

### Field length limits

Every free-text field has a maximum, set with `withMaxLength(limit, field)` (`sanity/lib/maxLength.ts`), which puts the limit in `options.maxLength` and adds a validation rule. A localized field takes `perLanguage(zh, en)`: one limit for both Chinese scripts, one for English. **The numbers are content-design decisions** (mobile News cards, Scripture beside an artwork), not derived from the data — apply the ones given and report content that exceeds them, never trim it. Without an explicit English limit it defaults to `EN_PER_ZH` (4) times the Chinese, measured on the artworks' own scripture.

`MaxLengthInput.tsx`, registered once as the form's input component, enforces them: plain text through the browser's `maxlength`, rich text by cancelling insertions before the editor sees them, with a toast and an `n / max` counter. Chinese typed through an IME cannot be cancelled mid-composition in rich text; validation reports that. Limits count UTF-16 units.

The limits a contributor can reach live in `lib/fieldLimits.ts` (`ARTWORK_LIMITS`), mirrored byte for byte in `sanity/lib/fieldLimits.ts` and enforced by `lib/submissions/fieldLengths.test.ts`; the submissions API checks them server-side.

### Studio customizations

- **`@sanity/ui`** is a direct Studio dependency, at the version `sanity` itself uses, so the toast shares the Studio's container. In 4.x `useToast` comes from `@sanity/ui/toast`; the main entry types it as `never`, and `Stack` takes `gap`, not `space`.
- **Sanity UI 5 resets every form control** with `:where(button, input, select, textarea) { appearance: none }`, which draws a native checkbox as nothing. Custom checkboxes need `appearance: auto`.
- **CSS over Sanity's markup**, to recheck after upgrades: `SiteSurfaceInput.tsx` paints the News body's editing area in the site colours and centres the toolbar's Image button (by `data-ui`, `data-testid` and `data-pt-editor`); `richTextMarks.tsx` replaces the toolbar's decorator icons with letters of one size.
- A field's `options` **replace** its type's rather than merging, which is why `withMaxLength` re-adds `LOCALE_OBJECT_OPTIONS` for localized fields.

### Contributor submissions

`app/api/submissions/**` lets outside artists upload and edit artwork without a Sanity seat. One Editor token serves every contributor, and who may touch what is decided in `lib/submissions/draftAccess.ts` — the single authorization point, and the only thing between a submission and the live site. `draftAccess.test.ts` is the attack list that asserts its three rules:

- **Drafts only.** Ids must match `drafts.<uuid>`, are issued server-side, and are checked before any document is loaded, so the API cannot be used to probe.
- **Your own work only.** Ownership is compared on every read and write and is **not** a field on the artwork: the dataset is public, so an identity kept there would be visible to the reviewer, and review is meant to be blind. `lib/submissions/ownership.ts` is the seam for the app's database, not chosen yet.
- **An allowlist of fields.** `slug` belongs to the auto-fill and Change gallery URL, `galleryVisibility` overrides the selection criteria outright, and the curation ratings are what the criteria are derived from.

After the allowlist, `lib/submissions/fieldLengths.ts` applies the length limits, answering 400 with the field named. There is no publish route and there must never be one; a test scans every file that imports `submissionsClient` and fails on a publish call.

Sanity's roles cannot express this below Enterprise: built-in Contributor is dataset-wide. Assets are a gap the code cannot close — an uploaded image is public on the CDN before review, whatever the document's draft state. `getSubmissionsSession` returns null until the app has its own auth, so every route answers 401 today, and `ownership.ts` throws behind it; wiring up a database means implementing that one file.

### Caching

Sanity reads go through `cacheOptions()` in `lib/sanity/cache.ts`: `cache: 'force-cache'` plus the `artwork` tag, with `collection` added for collection reads and `news` alone for news reads. A Sanity webhook posts to `/api/revalidate`, which verifies the signature and clears **both** gallery tags for any gallery type, since collection membership is derived from artworks, the `news` tag for `news`, and the `home` tag for `homePage`. The webhook's own filter in sanity.io/manage must include `news` and `homePage` too. Published reads need no token: the dataset is public.

`force-cache` only expires on tag invalidation, and the webhook reaches the deployed site alone, so under `pnpm dev` `cacheOptions()` returns `no-store` and every read is fresh. A local `pnpm start` still caches: to pick up a Studio edit there, stop it, delete `.next/cache/fetch-cache` and restart.

### Migration scripts

`scripts/clean-workbook.mjs` → `seed-taxonomies.mjs` → `import-artworks.mjs` → `backfill-scripture.mjs`; see `scripts/README.md`. All are idempotent; the importer skips the workbook's six-row `Summary` footer and prefers the cleaned workbook. `verify-import-idempotency.mjs` and `verify-scripture-reference.mjs` assert without writing, and `generate-versification.mjs` regenerates the reference bounds table and book catalog. `normalize.ts`, `validate.ts`, `reference.ts` and `versification.json` under `lib/scripture/` have byte-identical copies in `sanity/lib/scripture/`, enforced by `mirror.test.ts`; the generator writes both JSON copies.

### Full-screen images

`components/FullscreenImage.tsx` is an image that opens full screen on click and grows out of its own place (a FLIP transition), closing on Escape or a click. The viewer is portalled to `<body>`, so an ancestor with a transform or filter cannot trap it. The gallery modal and news articles both use it: `onPhaseChange` lets the modal keep its own Escape from closing it while the viewer is up, and `onSwipePrev`/`onSwipeNext` carry the modal's swipe. Its `className` styles the thumbnail; from styled-jsx it must go through `:global()`.

`components/ShareButton.tsx` is the share button both use: the system share sheet where there is one, otherwise a copied link. It carries its own styles; a caller's `className` only places it.

### Gallery lightbox state

`stores/GalleryModalContext.tsx` defines a `GalleryModalProvider`/`useModal` context, but the gallery does not use it: `GalleryClient.tsx` derives the open artwork from the `?artwork=` search param.

`DetailsModal.tsx` flies the picture out of the clicked card (found by its `data-artwork-slug`) to its place in the modal while the backdrop (its own `.details-backdrop` layer) darkens, the text and controls fading in from halfway; closing flies the picture back into the current artwork's card while they fade out faster, scrolling to it after prev/next (by position, since the card's lazy picture may not have loaded). `closeModal` then goes back in history with `scrollRestoration` held at manual, or the browser would scroll to where the modal was first opened. With no card on screen it just fades. It shows the grid's already-loaded thumbnail first and swaps in the full image once downloaded, since an unloaded image has no size to animate to. The browser's Back button closes it without the animation. Opening, and prev/next to an artwork already in the grid, go through `window.history.pushState`/`replaceState`, which Next syncs into `useSearchParams` without a server round trip, so the modal appears in the frame of the click. `lib/flip.ts` is the shared FLIP maths for this and the full-screen viewer. Prev/next slides the picture and text out, changes the artwork while nothing shows, and slides the new one in once its picture is decoded (`lib/preloadImage.ts`, which `GalleryClient` also uses to fetch the neighbours ahead); the full-size image replaces the thumbnail only once decoded.

### Styling

No single convention — check sibling files before picking an approach:

- Global: `styles/globals.css`, `styles/variables.css` (the palette as custom properties), `styles/animations.css`, imported once in `app/[locale]/layout.tsx`.
- CSS Modules per page or component (`gallery.module.css`, `home.module.css`, `auth.module.css`, `public.module.css`).
- Inline `styled-jsx` in several components (`Navbar.tsx`, `Footer.tsx`, `gallery/Card.tsx`, `gallery/DetailsModal.tsx`). `components/StyledJsxRegistry.tsx`, wrapping the root layout, writes those rules into the server HTML; without it the App Router renders none, and the navbar, footer and page header stay unstyled until JavaScript runs.

Fonts are loaded in `app/fonts/index.ts` and chosen per locale by `--font-heading` / `--font-body` in `variables.css`: Noto Serif TC/SC everywhere. Noto's Latin letters are Source Serif at 110%, so English body text uses a self-hosted Source Serif 4 at 115%: the same design, a little larger. Google's Noto Serif TC has only full-width ’ “ ” … —, so English headings take those few marks from a Source Serif 4 subset (`SourceSerif4-punctuation.woff2`). EB Garamond was tried for body text and rejected. Never put a Latin face ahead of Noto on Chinese pages: their quotes must stay full width.

Menus (the navbar's gallery dropdown and mobile menu, the language switcher, the news More) are popovers: always rendered, they grow from their trigger via `transform-origin` and shrink back on close, hidden with `visibility` so the exit can play. Icons come from `lucide-react`, not text glyphs.

Forms that call a service (the footer newsletter, Contact Us) take `test!` in their email field: `lib/testTrigger.ts` plays the sending state and the result without the request, `test!<outcome>` picking a named one (`test!rate_limited`). Wire a new form through `testOutcome()` the same way. Animation and scroll behaviour use custom hooks (`hooks/useFadeInOnScrollAnimation.ts`, `hooks/useSkylightAnimation.ts`) rather than a library.

### Newsletter signup

The footer form posts to `POST /api/subscribe`, which adds the address to the one EmailOctopus list with `status: "pending"` so EmailOctopus sends the double opt-in email. That depends on **double opt-in being enabled on the list** — with it off, a signup is subscribed outright and no confirmation is sent. `lib/rateLimit.ts` is an in-memory fixed window (5/min per IP), per instance and reset on deploy — it blunts a flood, no more. The hidden `website` field is a honeypot; a filled one gets the success shape back.

`lib/emailoctopus.ts` handles an address that already exists: `subscribed` is reported as-is, `unsubscribed` is re-sent through opt-in, and a `pending` contact untouched for an hour is deleted and recreated, since EmailOctopus sends the opt-in only on creation; inside that hour it answers `already_pending`. Contacts are addressed by the MD5 of the lowercased address.

The site moved off Mailchimp in September 2026 after its anti-abuse system flagged a first test campaign, whose audience mixed a hand-added contact with a single opt-in signup. Two rules outlive the provider:

- **Never add a contact by hand to test a send.** Use the provider's preview/test feature.
- **Keep double opt-in on**, so every address carries a confirmation the provider recorded.

`scripts/check-emailoctopus.mjs` runs the same calls against the live API — read-only by default, and it refuses to write while double opt-in is off. `SubscribeDialog.tsx` still carries copy for the Mailchimp-only `forgotten_email` and `compliance_state`; harmless, as unknown states fall back to `failed`.

### Standalone HTML in `docs/`

- The original **mockups** — design intent to consult, not code to keep in sync.
- `about-sketch.html` — the About page's look. Its Sanity schema was dropped: About changes rarely and needs a free layout, so it is written in code.
- `subscribe-preview.html` — every state of the footer subscription dialog in all three locales. Regenerate with `node scripts/generate-subscribe-preview.mjs` after changing `SubscribeDialog.tsx` or its copy; nothing re-runs it automatically.
- `subscribe-email.html` — the newsletter body to paste into a campaign as custom HTML. Email rules, not site rules: table layout, inlined styles, no CSS variables or web fonts. Merge tags are EmailOctopus's (`{{UnsubscribeURL}}`, `{{SenderInfoLine}}`, and `{{RewardsURL}}`, required on the free plan). Preview text belongs in the campaign settings. The commented-out artwork slot needs a real image URL before it is enabled. The opt-in confirmation mail is only editable in the provider's settings.
- `mail-handbook.html` — the staff handbook for the newsletter and the Contact Us form, the source of the Claude artifact https://claude.ai/artifact/Dt42hNmppvhy17YJkuK8TZ: edit it, then republish to that URL. It is an artifact page body, with no `<html>`/`<head>` beyond a charset line. Update it whenever a mail setting it describes changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
