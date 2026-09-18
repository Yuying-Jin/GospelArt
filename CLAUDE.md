# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Gospel Art (福音书画) is a Next.js gallery/marketing site for a Christian art ministry. It's bilingual/trilingual (English, Simplified Chinese, Traditional Chinese) and displays scripture-inspired artwork with a Chinese-cathedral/stained-glass visual theme. Most UI copy and code comments in the app are written in Chinese.

## Commands

The Next.js app uses **pnpm** (pinned via `packageManager` in package.json; `pnpm-lock.yaml` is the lockfile of record — ignore `package-lock.json`).

```bash
pnpm dev      # start dev server (next dev --turbopack) at localhost:3000
pnpm build    # production build
pnpm start    # run a production build
pnpm lint     # eslint . (Next 16 removed `next lint`)
```

There is no test suite configured in this repo.

### Sanity Studio (separate sub-project)

`sanity/` is an independent Sanity Studio project with its own `package.json`, lockfile, and `node_modules` — it is not part of the Next.js build. Run its commands from inside `sanity/`:

```bash
cd sanity && pnpm install --ignore-workspace   # REQUIRED, see below
cd sanity && pnpm dev                          # sanity dev — local Studio UI
cd sanity && pnpm build                        # sanity build
cd sanity && pnpm deploy                       # sanity deploy — publishes to gospel-art.sanity.studio
cd sanity && npx sanity schema validate        # check the schema without starting the UI
```

**`--ignore-workspace` is not optional for installing.** The root `pnpm-workspace.yaml` makes pnpm treat any `pnpm install` inside `sanity/` as an install for the workspace root, which reports "Already up to date" and leaves `sanity/node_modules` empty. Without the flag the Studio's dependencies never arrive, and the Studio then resolves `sanity`/`react` out of the *app's* `node_modules` — which is only ever accidentally the right version, and the Studio refuses to boot if `react` and `react-dom` do not match exactly. (They did disagree, at `19.2.7` vs `19.2.1`; both projects are now on `19.3.0`.)

### Docker

`docker-compose.yml` runs the app in dev mode inside a container (installs deps + `pnpm dev` on boot, mounting `.env`/`.env.local`). `Dockerfile` is a separate multi-stage production build; `next.config.ts` only emits `output: 'standalone'` when `DOCKER_BUILD=true` is set at build time.

### Environment variables

Local values live in `.env.local` (and `.env`). Both are gitignored and there is no
committed template — add any missing key to `.env.local` by hand.

- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` — Sanity client config for the Next.js app. The Studio does *not* read these, nor any `SANITY_STUDIO_*` equivalent: its project id and dataset are set directly in `sanity/sanity.config.ts` and `sanity/sanity.cli.ts`, since neither value is a secret.
- `SANITY_REVALIDATE_SECRET` — shared secret for the Sanity publish webhook that calls `POST /api/revalidate`.
- `SANITY_API_WRITE_TOKEN` — **migration scripts only** (`scripts/*.mjs`), never at runtime. Editor permissions.
- `ESV_API_KEY` — **server-side only**, never `NEXT_PUBLIC_`. Crossway forbids sharing or publishing it, which is why `app/api/scripture/route.ts` exists as a proxy for the Studio.
- `SANITY_STUDIO_SCRIPTURE_API` — the deployed `/api/scripture` URL, baked into the
  Studio bundle at build time. It must live in **`sanity/.env.production`**, not in the app's
  `.env.local`: the Sanity CLI only reads env files from the `sanity/` directory, and only
  `SANITY_STUDIO_*` names reach the bundle. Deliberately absent for local `sanity dev`, which then
  falls back to the localhost default in `sanity/lib/bibleVersions.ts`. Changing it needs another
  `sanity deploy`. The route allows any `*.sanity.studio` origin, so no CORS entry is needed for the
  deployed Studio.
- `SCRIPTURE_ALLOWED_ORIGINS` — extra CORS origins for `/api/scripture` (comma separated). `localhost:3333`, `localhost:3000` and `*.sanity.studio` are always allowed.
- `BIBLESUPERSEARCH_ENDPOINT` — optional override, e.g. a self-hosted Bible SuperSearch instance. Defaults to their public API.
- `DROPBOX_TOKEN` — used by the legacy `app/api/artworks/route.ts` only. The importer does *not* need it; the workbook's Dropbox links are public share URLs it downloads directly.

## Architecture

### Routing & i18n

Built on the Next.js App Router with `next-intl`. Locale is a top-level dynamic segment: all real routes live under `app/[locale]/`.

- `middleware.ts` + `i18n/routing.ts` define supported locales (`en`, `zh-CN`, `zh-TW`; default `zh-CN`) and drive the locale-prefix matcher.
- `i18n/request.ts` loads the matching `messages/{locale}.json` file per request.
- `i18n/navigation.ts` exports locale-aware `Link`/`redirect`/`usePathname`/`useRouter` wrappers — use these instead of `next/navigation`/`next/link` directly inside `app/[locale]/**`.
- `app/page.tsx` and `app/[locale]/page.tsx` are pure redirects (root → default locale → `/{locale}/home`); they hold no UI.
- Within `app/[locale]/`, the `(public)` route group (`about`, `gallery`, `news`, `witness`, `feedback`, `privacy-policy`, `term-of-use`, `auth/*`) shares `app/[locale]/(public)/layout.tsx` and `public.module.css`. The `home` route sits outside that group with its own layout/styles (`home.module.css`).
- `messages/types.ts` is a **hand-maintained** TypeScript type describing the shape of the translation JSON — it is not generated from `messages/*.json`, so when adding/renaming translation keys, update both the JSON files and this type together.
- `constants/nav.ts` (`navLinks`) is the single source of truth for nav/footer link keys and paths; `Navbar`/`Footer` build menus from it combined with `useTranslations`. The one exception is the navbar's `gallery` entry, which expands into a submenu of Collections fetched from Sanity — see **Collections** below. No collection's name or slug appears anywhere in the code.
- `app/[locale]/(public)/gallery/page.tsx` (the whole archive) and `gallery/[collection]/page.tsx` (one collection) both render `gallery/GalleryView.tsx`, so the two differ only in which set of artworks they name.

### Artwork data — Sanity CMS (live), plus a fixture and a legacy pipeline

Sanity is now the production source of truth for gallery artwork. Two older
representations remain, deliberately, and are not duplicates to reconcile.

1. **Sanity CMS** (`sanity/schemaTypes/`, queried from `lib/sanity/`) — the live source.
   `app/[locale]/(public)/gallery/page.tsx` is a server component that calls
   `getGalleryArtworks(locale)`; `GalleryClient.tsx` holds all the interactive behaviour.
2. **Fixture** (`data/artworks.json`) — the development/fallback dataset. `getGalleryArtworks`
   falls back to it when Sanity is unconfigured, returns nothing, or errors, so a CMS outage
   cannot take the gallery down. Its last record is blank and is filtered out. It is also what
   `scripts/seed-taxonomies.mjs` reads the section headings out of.
3. **Dropbox/Excel pipeline** (`app/api/artworks/route.ts`, `lib/excel/`, `constants/artworkKeyMap.ts`)
   — the superseded workflow, still present and still functional. Nothing in the app calls it now.

#### Field model

`types/artwork.ts` remains the contract the UI components consume, and
`lib/sanity/mapArtwork.ts` is the only place that converts Sanity's shape into it — which is why
`Card.tsx` and `DetailsModal.tsx` needed no changes at all. When adding a field, change the GROQ
projection in `lib/sanity/queries.ts` and the mapper together.

Three concepts are kept deliberately separate and must not be merged:

- `bibleReference` — the citation, verbatim, exactly as the ministry writes it (`"John 11:25"`).
- **Bible Themes** (`bibleTheme` documents) — a thematic vocabulary. *Not* a book/canon index and
  not derived from the reference. A book taxonomy would be its own type; it is currently deferred.
- **Spiritual Themes** (`spiritualTheme` documents) — the devotional vocabulary (`Life`, `Hope`).

Additionally, `artworkSubject` is the workbook's old "Artwork theme" column — free-text description
of what the painting depicts, unrelated to either taxonomy.

Detail sections are an array of `{sectionType: reference, body: localeText}`. The heading lives on
the referenced `artworkSectionType` because the same four headings repeat on every artwork in three
languages; only the body is per-artwork. `artworkSectionType.key` becomes the section's `id` on the
site, where `DetailsModal.tsx` uses it for accordion state and `aria-controls` — it must stay stable.

#### Localization

Field-level, via the `localeString` / `localeText` object types. **Sanity field names must be
alphanumeric**, so the locales are stored as `en` / `zhCN` / `zhTW` and converted back to the app's
`en` / `zh-CN` / `zh-TW` in `mapArtwork.ts`. Traditional Chinese and English fall back to Simplified
so partial translation is safe to ship.

Scripture is **displayed bilingually** — Chinese and English together, never one or the other. The UI
locale only decides which Chinese script is used. Document-level i18n was rejected for this reason,
and because one artwork is one image, one date and one set of curation scores.

#### Selection criteria and gallery visibility

`selectionCriteria` is **derived and never stored**, in the Studio and in GROQ alike, so it cannot
drift from its inputs:

```
(Repetition ∈ {M,L}) ∧ (Quality ∈ {H,M}) ∧ (Creativity ∈ {H,M})
```

This is the workbook's own documented rule; it agrees with the workbook's stored column on all 302
artwork rows. `sanity/lib/selectionCriteria.ts` and `lib/sanity/queries.ts` each hold a copy — keep
them in sync.

`galleryVisibility` (`auto` | `always` | `never`, default `auto`) overrides it in **both** directions,
because the archive contains artworks that pass the criteria but were rated `N` overall. The public
gallery additionally requires an image and `scripture.zhCN`: the CMS holds the complete 302-artwork
archive, while the gallery shows only artworks a collaborator has finished. The workbook contains no
verse text at all, so "Missing scripture" in the Studio sidebar is the post-migration work queue.

#### Slugs and link stability

Slugs are stored, never derived at query time — `date_bible-reference` is not unique (the workbook has
a genuine duplicate and 20 dates carry several artworks). The `slug` field locks once set; the only way
to change it is the **Change gallery URL** document action, which archives the old value into
`previousSlugs` in the same transaction. The gallery resolves `previousSlugs` as well as `slug` and
rewrites the URL to the canonical one, so links shared earlier keep working.

#### Collections

A `collection` document is a named grouping of gallery artworks and a level of gallery navigation.
Collections are **not** a taxonomy — they do not join `bibleTheme` / `spiritualTheme`; a dynamic
collection *consumes* those taxonomies as rules.

Two modes, which must not be merged. The stored values are `curated` / `dynamic`; the Studio labels
them **Manual selection** / **Automatic rules** (field title "Collection type"), and the sidebar
views use those words too. That gap is deliberate — the code keeps the technical name, the interface
speaks plainly to collaborators — so do not "fix" one to match the other:

- **Curated** — `artworks` is an ordered array of references, and the array order *is* the display
  order. No rule can express that judgement.
- **Dynamic** — `rules` (themes with `any`/`all`, a date range, `sort`, `limit`) evaluated at query
  time, so new artwork joins without anyone editing the collection. Rules are **never materialised**,
  for the same reason `selectionCriteria` is never stored. `lib/sanity/collectionFilter.ts` is the
  only place rules become GROQ; theme ids are always bound parameters, never interpolated.

A collection only ever *narrows* the gallery: every member is additionally required to pass
`GALLERY_FILTER`, so a pick that is not finished yet cannot reach the site by being listed.
`sanity/lib/galleryEligibility.ts` holds the Studio's copy of that predicate (used by the sidebar
views and by the curated-array validation warning) and `GALLERY_ELIGIBLE` in `lib/sanity/queries.ts`
holds the app's — keep the two in sync.

Batching works two ways because ordering has two sources, and `lib/sanity/getCollections.ts`
(`GallerySource`) is where that is decided:

- `kind: 'query'` — the whole gallery and dynamic collections, windowed with the same
  `[$start...$end]` offset slice the gallery has always used.
- `kind: 'list'` — curated collections. GROQ cannot sort by array position, and **a filter applied to
  a dereferenced array is not an array filter** (`refs[]->[cond]` resolves to `null`), so the member
  list is projected with an eligibility flag, filtered in JS, and each window is then fetched by slug
  and reordered. Verify any change here against the dataset; the shape is not obvious.

`showInNav` / `navOrder` drive the menu. `navOrder` is optional, so the sort happens in
`mapCollection.ts` rather than in GROQ. An empty collection stays in the menu and renders an
empty-state line — a collaborator who added it deliberately should not see it silently vanish.

Collection slugs are plain: stored, unique, editable, with no `previousSlugs` archive and no lock.
Unlike the 302 artwork URLs, nothing has been shared yet.

#### Caching

`getGalleryArtworks` fetches with `cache: 'force-cache'` and the `artwork` tag; collection reads
(`lib/sanity/cache.ts`) carry the `collection` tag as well. A Sanity webhook posts to
`/api/revalidate`, which verifies the signature and clears **both** tags for any watched type —
collection membership is derived from artworks, so an artwork edit can change a collection page
without the collection document being touched. Published reads need no token — the dataset is public
and the perspective is `published`.

#### Migration scripts

`scripts/clean-workbook.mjs` → `scripts/seed-taxonomies.mjs` → `scripts/import-artworks.mjs` →
`scripts/backfill-scripture.mjs` — see `scripts/README.md`. All are idempotent and re-runnable; the
importer skips the workbook's six-row `Summary` footer and prefers the cleaned workbook when one
exists. `verify-import-idempotency.mjs` and `verify-scripture-reference.mjs` assert those properties
without writing anything, and `generate-versification.mjs` regenerates the reference bounds table.

### Gallery lightbox state

`stores/GalleryModalContext.tsx` defines a `GalleryModalProvider`/`useModal` React context for lightbox open/close/index state, but the gallery does not consume it: `app/[locale]/(public)/gallery/GalleryClient.tsx` derives the open artwork from the `?artwork=` search param instead. Check which pattern is in use before adding new gallery-modal features.

### Styling

Mix of approaches — no single convention:
- Global styles: `styles/globals.css`, `styles/variables.css` (CSS custom properties for the theme palette), `styles/animations.css`, imported once in `app/[locale]/layout.tsx`.
- Per-page/component CSS Modules (e.g. `gallery.module.css`, `home.module.css`, `auth.module.css`, `public.module.css`).
- Inline `styled-jsx` in some components (e.g. `components/gallery/Card.tsx`).
- Tailwind v4 and `styled-components` are both installed as dependencies but are not the dominant pattern — check existing sibling files in a directory before picking a styling approach for new code there.

Animation/scroll behavior is implemented via custom hooks (`hooks/useFadeInOnScrollAnimation.ts`, `hooks/useSkylightAnimation.ts`) rather than a library.

### Legacy reference material

`docs/` contains static standalone HTML/CSS mockups (`gallery.html`, `index.html`, `root.css`, etc.) with their own sample images. This is legacy/reference design work, not part of the Next.js build — treat it as design intent to consult, not code to run or keep in sync.
