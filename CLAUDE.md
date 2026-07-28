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
pnpm lint     # next lint
```

There is no test suite configured in this repo.

### Sanity Studio (separate sub-project)

`sanity/` is an independent Sanity Studio project with its own `package.json`, lockfile, and `node_modules` — it is not part of the Next.js build. Run its commands from inside `sanity/`:

```bash
cd sanity && pnpm dev      # sanity dev — local Studio UI
cd sanity && pnpm build    # sanity build
cd sanity && pnpm deploy   # sanity deploy
```

### Docker

`docker-compose.yml` runs the app in dev mode inside a container (installs deps + `pnpm dev` on boot, mounting `.env`/`.env.local`). `Dockerfile` is a separate multi-stage production build; `next.config.ts` only emits `output: 'standalone'` when `DOCKER_BUILD=true` is set at build time.

### Environment variables

- `DROPBOX_TOKEN` — used by `app/api/artworks/route.ts` to fetch the source Excel workbook and resolve artwork image links from Dropbox.
- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` — Sanity client config for the Next.js app (the Studio itself under `sanity/sanity.config.ts` currently has its projectId/dataset hardcoded rather than reading these).

## Architecture

### Routing & i18n

Built on the Next.js App Router with `next-intl`. Locale is a top-level dynamic segment: all real routes live under `app/[locale]/`.

- `middleware.ts` + `i18n/routing.ts` define supported locales (`en`, `zh-CN`, `zh-TW`; default `zh-CN`) and drive the locale-prefix matcher.
- `i18n/request.ts` loads the matching `messages/{locale}.json` file per request.
- `i18n/navigation.ts` exports locale-aware `Link`/`redirect`/`usePathname`/`useRouter` wrappers — use these instead of `next/navigation`/`next/link` directly inside `app/[locale]/**`.
- `app/page.tsx` and `app/[locale]/page.tsx` are pure redirects (root → default locale → `/{locale}/home`); they hold no UI.
- Within `app/[locale]/`, the `(public)` route group (`about`, `gallery`, `news`, `witness`, `feedback`, `privacy-policy`, `term-of-use`, `auth/*`) shares `app/[locale]/(public)/layout.tsx` and `public.module.css`. The `home` route sits outside that group with its own layout/styles (`home.module.css`).
- `messages/types.ts` is a **hand-maintained** TypeScript type describing the shape of the translation JSON — it is not generated from `messages/*.json`, so when adding/renaming translation keys, update both the JSON files and this type together.
- `constants/nav.ts` (`navLinks`) is the single source of truth for nav/footer link keys and paths; `Navbar`/`Footer`/`LanguageSwitcher` build menus from it combined with `useTranslations`.

### Artwork data — development mock, temporary workflow, and future CMS

Artwork data has three representations in this repo, reflecting successive stages of the project's lifecycle: mock data → temporary Dropbox/Excel workflow → future Sanity CMS. They are not accidental duplicates that need reconciling.

1. **Mock data** (`data/artworks.json`) — an array of `{ scripture_chinese, scripture_english, image_path, date, bible_reference }` objects with images served from `public/gospel/`. This is placeholder data used during frontend development so the gallery page doesn't have to hit the external Dropbox/Excel API on every reload. It's what `app/[locale]/(public)/gallery/page.tsx` currently renders, and it is not intended to be the long-term data source.
2. **Dropbox/Excel pipeline** (`app/api/artworks/route.ts`) — a previously-working, currently-functional temporary real-data workflow: artwork images are stored in Dropbox and metadata is managed in an Excel workbook. The route fetches that workbook, parses it with `lib/excel/artworkExcelParser.ts`, remaps Excel column headers to field names via `constants/artworkKeyMap.ts` (fields like `selection_criteria`, `overall_selection`, `quality`, `repetition`, `creativity`, `notes`), filters to `selection_criteria === "Y"`, and resolves temporary Dropbox image links. The gallery page's `fetch('/api/artworks')` call is deliberately commented out for now (a development-time convenience, not a sign of a broken/incomplete integration) and can be re-enabled when the frontend needs real data.
3. **Sanity CMS** (`sanity/schemaTypes/artwork.ts`) — the planned future production CMS and eventual source of truth, using its own field naming convention (`bibleReference`, `theme`, `selectionCriteria`, camelCase). The schema is defined and the dependency is installed, but the Next.js frontend doesn't query it yet (no `next-sanity` client/query code exists) — migrating off the Dropbox/Excel workflow onto Sanity is future work.

When working on artwork data, be explicit about which stage you're touching, and don't assume changing one should update the others.

### Gallery lightbox state

`stores/GalleryModalContext.tsx` defines a `GalleryModalProvider`/`useModal` React context for lightbox open/close/index state, but `app/[locale]/(public)/gallery/page.tsx` currently manages the same state locally with its own `useState` instead of consuming the provider. Check which pattern is in use before adding new gallery-modal features.

### Styling

Mix of approaches — no single convention:
- Global styles: `styles/globals.css`, `styles/variables.css` (CSS custom properties for the theme palette), `styles/animations.css`, imported once in `app/[locale]/layout.tsx`.
- Per-page/component CSS Modules (e.g. `gallery.module.css`, `home.module.css`, `auth.module.css`, `public.module.css`).
- Inline `styled-jsx` in some components (e.g. `components/gallery/Card.tsx`).
- Tailwind v4 and `styled-components` are both installed as dependencies but are not the dominant pattern — check existing sibling files in a directory before picking a styling approach for new code there.

Animation/scroll behavior is implemented via custom hooks (`hooks/useFadeInOnScrollAnimation.ts`, `hooks/useSkylightAnimation.ts`) rather than a library.

### Legacy reference material

`docs/` contains static standalone HTML/CSS mockups (`gallery.html`, `index.html`, `root.css`, etc.) with their own sample images. This is legacy/reference design work, not part of the Next.js build — treat it as design intent to consult, not code to run or keep in sync.
