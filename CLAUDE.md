# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Gospel Art (福音书画) is a Next.js gallery/marketing site for a Christian art ministry. Trilingual (English, Simplified Chinese, Traditional Chinese), showing scripture-inspired artwork with a Chinese-cathedral/stained-glass theme. Most UI copy and code comments are in Chinese.

## Commands

The app uses **pnpm**, pinned via `packageManager`.

```bash
pnpm dev      # next dev --turbopack, localhost:3000
pnpm build    # production build
pnpm start    # run a production build
pnpm lint     # eslint . (Next 16 removed `next lint`)
```

No test suite is configured.

### Sanity Studio (separate sub-project)

`sanity/` is an independent Studio project with its own `package.json`, lockfile, `node_modules` and pnpm pin. It is not part of the Next.js build. Run its commands from inside it:

```bash
cd sanity && pnpm install                 # plain install — see below
cd sanity && pnpm dev                     # local Studio UI
cd sanity && pnpm build
cd sanity && pnpm deploy                  # publishes to gospel-art.sanity.studio
cd sanity && npx sanity schema validate   # check the schema without starting the UI
```

**Do not pass `--ignore-workspace`, and do not delete `sanity/pnpm-workspace.yaml`.** That file declares `sanity/` its own workspace root. Without it pnpm climbs to the repo root, reports "Already up to date" and leaves `sanity/node_modules` empty — the Studio then resolves `sanity`/`react` out of the *app's* `node_modules`, and refuses to boot unless `react` and `react-dom` match exactly. The flag was the old workaround and now recreates the problem, since it ignores the Studio's own workspace file along with its `esbuild` `allowBuilds` entry and its pnpm pin.

The Studio does not auto-deploy on push; `autoUpdates` in `sanity.cli.ts` only tracks minor versions, so a major bump needs a manual `pnpm deploy`.

### Docker

`docker-compose.yml` runs the app in dev mode in a container (installs deps + `pnpm dev` on boot, mounting `.env`/`.env.local`). `Dockerfile` is a separate multi-stage production build; `next.config.ts` emits `output: 'standalone'` only when `DOCKER_BUILD=true` at build time.

### Environment variables

Local values live in `.env.local` (and `.env`), both gitignored with no committed template — add missing keys by hand.

- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` — the app's Sanity client. The Studio reads neither these nor any `SANITY_STUDIO_*` equivalent; its project id and dataset sit directly in `sanity/sanity.config.ts` and `sanity/sanity.cli.ts`, as neither is a secret.
- `SANITY_REVALIDATE_SECRET` — shared secret for the publish webhook that calls `POST /api/revalidate`.
- `SANITY_API_WRITE_TOKEN` — **migration scripts only** (`scripts/*.mjs`), never at runtime. Editor permissions.
- `ESV_API_KEY` — **server-side only**, never `NEXT_PUBLIC_`. Crossway forbids publishing it, which is why `app/api/scripture/route.ts` exists as a proxy for the Studio.
- `SANITY_STUDIO_SCRIPTURE_API` — the deployed `/api/scripture` URL, baked into the Studio bundle at build time, so changing it needs another `sanity deploy`. It must live in **`sanity/.env.production`**: the Sanity CLI only reads env files under `sanity/`, and only `SANITY_STUDIO_*` names reach the bundle. Deliberately absent for local `sanity dev`, which falls back to the localhost default in `sanity/lib/bibleVersions.ts`.
- `SCRIPTURE_ALLOWED_ORIGINS` — extra CORS origins for `/api/scripture`, comma separated. `localhost:3333`, `localhost:3000` and `*.sanity.studio` are always allowed, so the deployed Studio needs no entry.
- `BIBLESUPERSEARCH_ENDPOINT` — optional override, e.g. a self-hosted instance. Defaults to the public API.
- `EMAILOCTOPUS_API_KEY`, `EMAILOCTOPUS_LIST_ID` — **server-side only**, the footer newsletter signup behind `POST /api/subscribe`. The key reads and writes every list on the account, which is why the form posts to our route instead of EmailOctopus. There is no datacentre prefix to configure, unlike Mailchimp.
- `DROPBOX_TOKEN` — the legacy `app/api/artworks/route.ts` only. The importer downloads the workbook's public share URLs directly.

## Architecture

### Routing & i18n

App Router with `next-intl`; locale is a top-level dynamic segment, so all real routes live under `app/[locale]/`.

- `middleware.ts` + `i18n/routing.ts` define the locales (`en`, `zh-CN`, `zh-TW`). `defaultLocale` is `en` and is only reached when the browser asks for no Chinese at all — `zh-TW` and `zh-CN` negotiate to themselves. A locale the visitor picked is stored in `NEXT_LOCALE` and read ahead of `Accept-Language`, which is why `LanguageSwitcher` must route through `i18n/navigation` with the locale passed in: that is what writes the cookie.
- `i18n/request.ts` loads `messages/{locale}.json` per request.
- `i18n/navigation.ts` exports locale-aware `Link`/`redirect`/`usePathname`/`useRouter` — use these, not `next/navigation`/`next/link`, inside `app/[locale]/**`.
- `app/page.tsx` and `app/[locale]/page.tsx` are pure redirects (root → default locale → `/{locale}/home`).
- The `(public)` route group (`about`, `gallery`, `news`, `witness`, `feedback`, `privacy-policy`, `terms-of-use`, `auth/*`) shares `app/[locale]/(public)/layout.tsx` and `public.module.css`. `home` sits outside it with its own layout and `home.module.css`.
- `constants/nav.ts` (`navLinks`) is the source of truth for nav and footer link paths, and its two groups have separate owners: `Navbar` renders `navigation`, `Footer` renders `policy`. Neither repeats the other — the navbar is on every page, and the footer is the only route to the privacy and terms pages. The one menu not driven by that data is the navbar's `gallery` entry, which expands into a submenu of Sanity collections, archive last. No collection's name or slug appears in the code.
- `messages/types.ts` is a hand-maintained type for the translation JSON, and currently inert: eight files import `TranslationTypes`, every `useTranslations<…>` call site is commented out, and the type covers only part of the JSON. Treat it as documentation — a renamed or missing key will not be caught.
- `gallery/page.tsx` (whole archive) and `gallery/[collection]/page.tsx` (one collection) both render `gallery/GalleryView.tsx`, so they differ only in which artworks they name.

### Artwork data — Sanity CMS, plus a fixture and a legacy pipeline

Sanity is the production source of truth. Two older representations remain deliberately and are not duplicates to reconcile.

1. **Sanity CMS** (`sanity/schemaTypes/`, queried from `lib/sanity/`) — the live source. `GalleryView.tsx` is a server component calling `getGalleryFeed(locale, collectionSlug)`; `GalleryClient.tsx` holds the interactive behaviour, and `getGalleryBatch` serves later windows through `/api/gallery`.
2. **Fixture** (`data/artworks.json`) — development and fallback data. `lib/sanity/getGalleryArtworks.ts` falls back to it when Sanity is unconfigured, empty or erroring, so a CMS outage cannot take the gallery down; records missing `image_path` or `slug` are filtered out, which drops its blank last row. `scripts/seed-taxonomies.mjs` reads the section headings out of it too.
3. **Dropbox/Excel pipeline** (`app/api/artworks/route.ts`, `lib/excel/`, `constants/artworkKeyMap.ts`) — superseded, still functional, called by nothing in the app.

#### Field model

`types/artwork.ts` is the contract the UI consumes, and `lib/sanity/mapArtwork.ts` is the only place Sanity's shape is converted into it. When adding a field, change the GROQ projection in `lib/sanity/queries.ts` and the mapper together.

Three concepts are deliberately separate and must not be merged:

- `bibleReference` — the citation verbatim, as the ministry writes it (`"John 11:25"`).
- **Bible Themes** (`bibleTheme`) — a thematic vocabulary. *Not* a book index and not derived from the reference; a book taxonomy would be its own type and is deferred.
- **Spiritual Themes** (`spiritualTheme`) — the devotional vocabulary (`Life`, `Hope`).

Separately, `artworkSubject` is the workbook's old "Artwork theme" column: free text describing what the painting depicts, unrelated to either taxonomy.

Detail sections are `{sectionType: reference, body: localeText}`. The heading lives on the referenced `artworkSectionType` because the same four headings repeat on every artwork in three languages; only the body is per-artwork. `artworkSectionType.key` becomes the section's `id` on the site, where `DetailsModal.tsx` uses it for accordion state and `aria-controls` — it must stay stable.

#### Localization

Field-level, via the `localeString` / `localeText` object types. **Sanity field names must be alphanumeric**, so locales are stored as `en` / `zhCN` / `zhTW` and converted back in `mapArtwork.ts`. Traditional Chinese and English fall back to Simplified, so partial translation is safe to ship.

Scripture is **displayed bilingually** — Chinese and English together, never one alone; the UI locale only picks which Chinese script. Document-level i18n was rejected for that reason, and because one artwork is one image, one date and one set of curation scores.

#### Selection criteria and gallery visibility

`selectionCriteria` is **derived, never stored**, in the Studio and in GROQ alike, so it cannot drift from its inputs:

```
(Repetition ∈ {M,L}) ∧ (Quality ∈ {H,M}) ∧ (Creativity ∈ {H,M})
```

The workbook's own rule; it agrees with the workbook's stored column on all 302 rows. `sanity/lib/selectionCriteria.ts` and `lib/sanity/queries.ts` each hold a copy — keep them in sync.

`galleryVisibility` (`auto` | `always` | `never`, default `auto`) overrides it in **both** directions, since the archive holds artworks that pass the criteria but were rated `N` overall. The public gallery also requires an image and `scripture.zhCN`: the CMS holds all 302 artworks, the gallery shows only what a collaborator has finished. The workbook carries no verse text, so "Missing scripture" in the Studio sidebar is the post-migration work queue.

#### Slugs and link stability

Slugs are stored, never derived at query time — `date_bible-reference` is not unique (the workbook has a genuine duplicate, and 20 dates carry several artworks). The `slug` field locks once set; only the **Change gallery URL** document action changes it, archiving the old value into `previousSlugs` in the same transaction. The gallery resolves `previousSlugs` too and rewrites the URL to the canonical one, so shared links keep working.

#### Collections

A `collection` document is a named grouping of gallery artworks and a level of gallery navigation. Collections are **not** a taxonomy — they do not join `bibleTheme` / `spiritualTheme`; a dynamic collection *consumes* those as rules.

Two modes, not to be merged. Stored as `curated` / `dynamic`, but the Studio calls them **Manual selection** / **Automatic rules** (field title "Collection type"), sidebar views included. The gap is deliberate — code keeps the technical name, the interface speaks plainly to collaborators — so do not "fix" either side to match.

- **Curated** — `artworks` is an ordered array of references and the array order *is* the display order. No rule can express that judgement.
- **Dynamic** — `rules` (themes with `any`/`all`, a date range, `sort`, `limit`) evaluated at query time, so new artwork joins without anyone editing the collection. Rules are **never materialised**, for the same reason `selectionCriteria` is not. `lib/sanity/collectionFilter.ts` is the only place rules become GROQ; theme ids are always bound parameters, never interpolated.

A collection only ever *narrows* the gallery: members must additionally pass `GALLERY_FILTER`, so an unfinished pick cannot reach the site by being listed. `sanity/lib/galleryEligibility.ts` is the Studio's copy of that predicate (used by the sidebar views and the curated-array validation warning), `GALLERY_ELIGIBLE` in `lib/sanity/queries.ts` is the app's — keep them in sync.

Batching works two ways because ordering has two sources, decided in `lib/sanity/getCollections.ts` (`GallerySource`):

- `kind: 'query'` — the whole gallery and dynamic collections, windowed with a `[$start...$end]` offset slice.
- `kind: 'list'` — curated collections. GROQ cannot sort by array position, and **a filter on a dereferenced array is not an array filter** (`refs[]->[cond]` resolves to `null`), so the member list is projected with an eligibility flag, filtered in JS, and each window fetched by slug and reordered. Verify changes here against the dataset; the shape is not obvious.

`showInNav` / `navOrder` drive the menu. `navOrder` is optional, so the sort happens in `mapCollection.ts`, not GROQ. An empty collection stays in the menu and renders an empty-state line rather than silently vanishing on the collaborator who added it.

Collection slugs are plain: stored, unique, editable, with no `previousSlugs` archive and no lock — unlike the 302 artwork URLs, none has been shared yet.

#### Caching

Sanity reads go through `cacheOptions()` in `lib/sanity/cache.ts`: `cache: 'force-cache'` plus the `artwork` tag, with `collection` added for collection reads. A Sanity webhook posts to `/api/revalidate`, which verifies the signature and clears **both** tags for any watched type — collection membership is derived from artworks, so an artwork edit can change a collection page without the collection document being touched. Published reads need no token: the dataset is public and the perspective is `published`.

`force-cache` never expires on time, only on tag invalidation, and the webhook reaches the deployed site alone. A local dev server therefore holds its copy indefinitely; to pick up a Studio edit, stop it, delete `.next/cache/fetch-cache` and restart.

#### Migration scripts

`scripts/clean-workbook.mjs` → `seed-taxonomies.mjs` → `import-artworks.mjs` → `backfill-scripture.mjs`; see `scripts/README.md`. All are idempotent and re-runnable; the importer skips the workbook's six-row `Summary` footer and prefers the cleaned workbook when one exists. `verify-import-idempotency.mjs` and `verify-scripture-reference.mjs` assert those properties without writing, and `generate-versification.mjs` regenerates the reference bounds table.

### Gallery lightbox state

`stores/GalleryModalContext.tsx` defines a `GalleryModalProvider`/`useModal` context for lightbox state, but the gallery does not use it: `GalleryClient.tsx` derives the open artwork from the `?artwork=` search param. Check which pattern is in use before adding gallery-modal features.

### Styling

No single convention — check sibling files before picking an approach for new code:

- Global: `styles/globals.css`, `styles/variables.css` (theme palette custom properties), `styles/animations.css`, imported once in `app/[locale]/layout.tsx`.
- CSS Modules per page or component (`gallery.module.css`, `home.module.css`, `auth.module.css`, `public.module.css`).
- Inline `styled-jsx` in several components (`Navbar.tsx`, `Footer.tsx`, `gallery/Card.tsx`, `gallery/DetailsModal.tsx`).

Icons come from `lucide-react`, not text glyphs, so size and stroke weight stay consistent across the nav and the gallery modal. Animation and scroll behaviour use custom hooks (`hooks/useFadeInOnScrollAnimation.ts`, `hooks/useSkylightAnimation.ts`) rather than a library.

### Newsletter signup

The footer form posts to `POST /api/subscribe`, which adds the address to the one EmailOctopus list with `status: "pending"` so EmailOctopus sends the double opt-in email. That depends on **double opt-in being enabled on the list itself** — with it off, a signup is subscribed outright and no confirmation is ever sent. The key reads and writes every list on the account, so it never leaves the server. `lib/rateLimit.ts` is an in-memory fixed window (5/min per IP) that resets on deploy and counts per instance — enough to blunt a form flood, not a guarantee. The hidden `website` field is a honeypot; a filled one gets the success shape back rather than an error.

`lib/emailoctopus.ts` handles the three ways an address can already exist: `subscribed` and `pending` are reported back as-is, while `unsubscribed` is re-sent through opt-in, so a former subscriber can rejoin from the footer with no human involved. Contacts are addressed by the MD5 of the lowercased address, the same convention Mailchimp used.

The site moved off Mailchimp in September 2026, after its anti-abuse system flagged the account on a first test campaign: the audience mixed a hand-added contact with one taken through a single opt-in form, which is indistinguishable from a list carrying no consent record. Two rules follow, and they outlive the provider:

- **Never add a contact by hand to test a send.** Use the provider's own preview/test feature, which does not touch the list.
- **Keep double opt-in on**, so every address carries a confirmation the provider itself recorded.

`scripts/check-emailoctopus.mjs` runs the same calls against the live API — read-only by default, and it refuses to write while double opt-in is off on the list.

`SubscribeDialog.tsx` still has copy for `forgotten_email` and `compliance_state`, two Mailchimp-only states the server can no longer return. They are harmless: the dialog falls back to `failed` for anything it does not recognise.

### Standalone HTML in `docs/`

Three unrelated kinds of file share this folder:

- The original **mockups**, HTML/CSS with their own sample images — design intent to consult, not code to run or keep in sync.
- `subscribe-preview.html` — every state of the footer subscription dialog, in all three locales, for checking the styling without having to provoke a `forgotten` or `rate_limited` response for real. It calls nothing and writes nothing. Regenerate it with `node scripts/generate-subscribe-preview.mjs` after changing `SubscribeDialog.tsx` or the copy; it reads `messages/*.json`, `styles/variables.css` and lucide's own icon data, but nothing re-runs it automatically.
- `subscribe-email.html` — the newsletter body to paste into a campaign as custom HTML. Email HTML rules apply and are not the site rules: table layout, styles inlined, no CSS variables, no web fonts. Two things must be fixed before it can be sent: the merge tags are still Mailchimp's (`*|UNSUB|*`, `*|LIST:ADDRESS|*`) and need EmailOctopus's equivalents, copied out of its editor rather than guessed; and three `YOUR-DOMAIN` placeholders need real URLs. It cannot be used for the opt-in confirmation mail, which is only editable in the provider's own settings.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
