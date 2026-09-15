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

## 0. Clean the workbook

```bash
node scripts/clean-workbook.mjs --dry-run
node scripts/clean-workbook.mjs
```

The archive spells eleven book names wrong — `Dueteronomy`, `Matthews`,
`Colosians` and so on — and no Bible provider will accept them (nor should it
guess, see step 3). This writes `Gospel Artwork Archives (2025-06-08)
cleaned.xlsx` with those corrected, **30 cells across 302 references**, and
leaves the original untouched.

Only the exact substitutions listed in `SPELLING_FIXES` inside the script are
ever made, only when a cell's book name matches one of them exactly, and only to
the book part — chapter and verse are never rewritten. Every correction is
re-validated before the file is written, so a bad entry in that table fails the
run instead of shipping.

Anything needing a decision is deliberately left alone and listed in the report:

| left as-is | why |
| --- | --- |
| `Ecclesiastes 14:34` | no chapter 14; which verse was meant? |
| `Psalms 91-12` | `91:12` or `91:1-2`? |
| `Psalms 23` | no verse number |
| `Jacob 4:7` | 雅各書 read from the Chinese, not a misspelling — confirm it is James |
| `Glory to Jesus`, `Justice and Grace`, `John & Hong's poem` | not citations |

Fix those seven in the Studio's **Bible Reference** field; the cleaner cannot.

**Step 2 prefers the cleaned file automatically** once it exists, and prints
which workbook it read. `--file` still overrides. Because `bibleReference` is a
workbook-owned field, re-running the import patches the corrections onto
artworks that already exist.

The cleaned workbook is a generated artifact — regenerate it rather than editing
it, and note that the round trip through SheetJS drops cell formatting. Only
values matter to the importer; a diff of both files through the importer's own
parser shows 302 artworks either side with all 30 changes confined to
`bibleReference`.

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
asserts the four scenarios below (43 checks).

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
Studio sidebar is that queue — step 3 fills it in bulk.

The workbook's "Artwork description" (33 of 302 rows) becomes a *Devotional
Reflection* section. It is filed as `zhTW` regardless of the script the cell is
actually written in — most of these cells are Simplified, and several mix both
within one message — with the other two languages left empty.

### Slugs

Slugs are `date_bible-reference`, matching links the site has already shared.
The workbook contains one genuine duplicate — Proverbs 10:29 appears twice on
2024-11-16 — which becomes `2024-11-16_proverbs-10-29` and
`2024-11-16_proverbs-10-29-2`. Suffixes are assigned in workbook order, so they
are identical on every run.

## 3. Backfill the scripture

```bash
pnpm dev                                                 # in another terminal
node scripts/backfill-scripture.mjs --dry-run --limit 5
node scripts/backfill-scripture.mjs
```

Fills `scripture.zhTW` / `zhCN` / `en` on every artwork that has a Bible
Reference but no verse text — the bulk equivalent of clicking **Fetch
Scripture** in the Studio, which is not a plan for 302 documents.

It calls the app's `/api/scripture` proxy, so 和合本 and the ESV are reached
through the same providers the Studio uses, and the ESV key stays server-side.
**The Next.js app has to be running**, or point `--api` at a deployed URL.

| Option | Effect |
| --- | --- |
| `--dry-run` | Report what would be written; write nothing. Still calls the providers, so it does use API quota. |
| `--limit N` | Only process the first N artworks. |
| `--rate N` | Lookups per minute (default 50). |
| `--overwrite` | Also replace fields that already hold text. Off by default, so a rerun only fills blanks. |
| `--api URL` | Scripture endpoint (default `SCRIPTURE_API_URL`, then `http://localhost:3000/api/scripture`). |

### Re-running is safe

Only artworks still missing text are selected, only empty fields are written,
and one lookup serves every artwork citing the same reference. A provider that
is down leaves its fields empty and listed under *References that resolved
nowhere*; run the script again later to pick them up.

### It is rate limited, so it is slow on purpose

The Chinese provider answers `X-RateLimit-Limit: 60` — sixty requests a minute,
per-minute rolling, not a daily cap. One lookup here is one request to each
provider, so lookups are sequential and paced at `--rate` (50/min) instead of
running in parallel. The full archive is 252 unique references, so a complete
run takes roughly five minutes.

There is **also a separate per-day cap**, which the service reports as
`Maximum hits has been reached for today for this domain / IP address`. Pacing
cannot help with that one — a full pass is about 250 requests, so a few dry runs
in a day will exhaust it.

Both cases are now reported as the provider being *unavailable* rather than as
the reference being bad, and the run **stops on the first one**:

```
Stopped — a scripture provider cannot serve requests right now:
  和合本 Chinese Union Version: Maximum hits has been reached for today ...

Looked up 1 of 248; 247 not attempted.
Nothing was written. Run again once the provider recovers.
```

That distinction matters: before it existed, an exhausted quota looked exactly
like 108 artworks with bad data, and the run spent five minutes producing that
list. `BIBLESUPERSEARCH_ENDPOINT` can point at a self-hosted instance, which the
project explicitly supports and which removes the cap.

### It changes what the public site shows

`scripture.zhCN` is one of the fields the gallery query gates on, so an artwork
that also passes the selection criteria goes live the moment this fills it. The
run prints that count under **Gaining scripture.zhCN** before writing anything,
which is what `--dry-run` is for. Set `galleryVisibility` to `never` on anything
that should stay hidden.

### Verse-part suffixes

A reference naming half a verse — `Galatians 5:22-23a`, `1 John 4:16b` — is
looked up as the whole verse or range (`Galatians 5:22-23`), because no Bible
API accepts the suffix. Two things deliberately do *not* happen: the stored
`bibleReference` is never rewritten, and the returned text is never cropped to
the part. Where `23a` ends varies by translation, so the Studio shows a warning
on the fetch and the collaborator trims it by hand.

```bash
node scripts/verify-scripture-reference.mjs
```

Covers the normalisation, the warning condition and the absence of any
truncation. The endpoint checks skip themselves when the app is not running, so
it is safe to run offline.

### Invalid references are never sent to a provider

The providers are lenient, and quietly so — asked for something malformed they
answer with something plausible rather than an error:

| asked for | silently answered with |
| --- | --- |
| `Dueteronomy 6:5` | Deuteronomy 6:5 |
| `Ecclesiastes 14:34` | Ecclesiastes 12:14 |
| `Psalms 91-12` | Psalms 12–42, some 47,000 characters |
| `John & Hong's poem` | the whole of John 1 |

Writing any of those into an artwork is worse than leaving the field blank, so
`lib/scripture/validate.ts` checks a reference before anything is looked up. It
requires a recognised book, a chapter that book has, and verses that chapter
has, using real versification from `lib/scripture/versification.json`
(66 books, 1189 chapters, regenerate with
`node scripts/generate-versification.mjs`).

A misspelling is rejected rather than mapped to the book it resembles — the
whole point is that a person fixes the citation. Rejected references cost no
provider request and are listed with the reason, in the backfill report and in
the Studio's Fetch Scripture dialog alike.

```bash
node scripts/verify-scripture-reference.mjs
```

66 checks covering the suffix handling, the validation rules and the bounds.
