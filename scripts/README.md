# Migration scripts

One-off scripts for moving the artwork archive from the Dropbox/Excel workflow
into Sanity. They are plain `.mjs` and use only dependencies already installed
in the app (`xlsx`, `next-sanity`), so there is nothing extra to add.

## Before running

Add a write token to `.env.local`:

```
SANITY_API_WRITE_TOKEN="..."
```

Create it at **sanity.io/manage → API → Tokens** with **Editor** permissions.
It is only used by these scripts — never at runtime, and never prefixed with
`NEXT_PUBLIC_`.

No Dropbox token is needed. The workbook stores public share links, so the
importer downloads the images directly over HTTPS.

## 1. Seed the taxonomies

```bash
node scripts/seed-taxonomies.mjs --dry-run
node scripts/seed-taxonomies.mjs
```

Creates the four section types (`background`, `interpretation`, `devotional`,
`reflection`) with their headings in all three languages, read straight out of
`data/artworks.json` so they match what the site already renders. Also creates
the Bible Themes and Spiritual Themes that appear in the fixture, with English
names only — the Chinese names are left for collaborators rather than
machine-translated, and the site falls back to English until they are filled in.

Re-running is safe: it uses `createIfNotExists` and never overwrites edits.

## 2. Import the artworks

```bash
node scripts/import-artworks.mjs --dry-run          # report only
node scripts/import-artworks.mjs --limit 5          # small trial
node scripts/import-artworks.mjs                    # the real run
```

Imports 302 artworks. The six trailing rows of the workbook are a `Summary`
tally block, not artworks, and are skipped — the dry run lists them so you can
confirm.

| Option | Effect |
| --- | --- |
| `--dry-run` | Report what would happen; write nothing. |
| `--limit N` | Only process the first N artworks. |
| `--skip-images` | Create documents without uploading images. |
| `--create-only` | Never patch documents that already exist. By default a rerun re-syncs the workbook-owned fields (and only those) onto existing documents. |
| `--concurrency N` | Parallel image uploads (default 4). |
| `--file PATH` | Read a different workbook. |

### Re-running is safe

Verify it yourself, without writing anything to Sanity:

```bash
node scripts/verify-import-idempotency.mjs
```

That runs the importer's real planning code against the real workbook and
asserts the four scenarios below (34 checks).

**Document identity** is `artwork-<sha1(sourceKey)>`, where `sourceKey` is the
immutable `scl/fi/<file-id>` segment of the Dropbox share link. The rotating
query parameters (`rlkey`, `st`, `dl`) and the filename are excluded, so
re-sharing or renaming the file in Dropbox does not mint a second artwork.
Identity is deliberately **not** the gallery slug — slugs are editor-changeable
via the "Change gallery URL" action and get archived into `previousSlugs`.

**Assets are deduplicated twice over.** An artwork that already has an image is
skipped entirely — no download, no upload. If it does not, the downloaded bytes
are SHA-1'd and matched against existing `sanity.imageAsset` documents, so an
upload that succeeded before a failed patch is reused rather than duplicated.

**Editor content is never touched on a rerun.** Only these fields are ever
patched, and only when they actually differ from the workbook:

`bibleReference`, `date`, `artworkSubject`, `scriptureFellowship`, `notes`,
`repetition`, `quality`, `creativity`, `optimizedSelection`, `overallSelection`,
`dropboxPath`

Everything else belongs to whoever is editing in the Studio. Scripture,
translations, detail sections, themes, `slug`, `previousSlugs`,
`galleryVisibility` and image crops are written on creation at most, never on a
rerun.

| Run | Result |
| --- | --- |
| First run | Creates 302 documents, resolves 302 images |
| Second run, identical workbook | 0 created, 0 updated, 302 unchanged, 0 image work |
| Later run, a metadata cell changed | 0 created, 1 updated — patch contains only the changed fields |
| Later run, after Studio editing | 0 created, 0 updated; hand-picked URLs and scripture survive |

If the run dies partway through 302 uploads, just run it again.

### What lands, and what does not

The workbook contains **no scripture text** — its "Bible scripture" column holds
only citations (`Psalms 23`). So imported artworks arrive with the curation
record, dates, images, subjects and notes, but no verse text.

That is why the public gallery query also requires `scripture.zhCN`: the
complete 302-artwork archive lives in the CMS, while the gallery shows only
artworks a collaborator has finished. The **Missing scripture** list in the
Studio sidebar is that queue.

The workbook's "Artwork description" (present on 18 of 302 rows) is imported as
a *Devotional Reflection* section in Simplified Chinese, with the other two
languages left empty.

### Slugs

Slugs are `date_bible-reference`, matching links the site has already shared.
The workbook contains one genuine duplicate — Proverbs 10:29 appears twice on
2024-11-16 — which becomes `2024-11-16_proverbs-10-29` and
`2024-11-16_proverbs-10-29-2`. Suffixes are assigned in workbook order, so they
are identical on every run.
