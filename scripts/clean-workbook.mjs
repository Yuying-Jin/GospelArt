/**
 * Fixes misspelled book names in the workbook's "Bible scripture" column and
 * writes a cleaned copy. The original file is never modified.
 *
 *   node scripts/clean-workbook.mjs --dry-run
 *   node scripts/clean-workbook.mjs
 *
 * Options
 *   --dry-run     Report what would change; write no file.
 *   --file PATH   Workbook to read (defaults to the one in the repo root).
 *   --out PATH    Where to write the cleaned copy.
 *
 * Only the substitutions in SPELLING_FIXES below are ever applied, only when a
 * cell's book name matches one of them *exactly*, and only to the book part of
 * the reference — chapter and verse are never touched. Everything else is
 * copied through unchanged and listed in the report.
 *
 * Anything needing a decision rather than a spelling fix is deliberately left
 * alone: which verse "Ecclesiastes 14:34" meant, whether "Psalms 91-12" is
 * 91:12 or 91:1-2, what "Glory to Jesus" was citing. Guessing at those is the
 * same mistake the fetcher used to make — see lib/scripture/validate.ts.
 *
 * Every applied fix is re-validated before the file is written, so a correction
 * that does not produce a real reference fails the run instead of shipping.
 */
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'
import {stripVerseParts} from '../lib/scripture/reference.ts'
import {validateReference} from '../lib/scripture/validate.ts'
import {normalizeHeader} from './import-artworks.mjs'

/**
 * Confirmed one-for-one misspellings of a book name.
 *
 * Every entry is a spelling error with exactly one possible target. Names that
 * merely *resemble* another book do not belong here — notably "Jacob", which is
 * 雅各書 (James) read from the Chinese rather than a misspelling of anything, so
 * it is left for a person to confirm.
 */
const SPELLING_FIXES = {
    Dueteronomy: 'Deuteronomy',
    Matthews: 'Matthew',
    Mattews: 'Matthew',
    'Song of Solonom': 'Song of Solomon',
    '1 Corinsians': '1 Corinthians',
    Provers: 'Proverbs',
    Ephisians: 'Ephesians',
    Colosians: 'Colossians',
}

const REFERENCE_HEADER = 'bible scripture'

/**
 * The workbook ends in a six-row tally block rather than artworks, and the
 * importer drops it too. Only one of those rows puts anything in the reference
 * column, and it is not a citation to report on.
 */
const FOOTER_MARKERS = new Set(['summary'])

function flag(name) {
    return process.argv.includes(`--${name}`)
}

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? fallback : process.argv[index + 1]
}

const DRY_RUN = flag('dry-run')
const INPUT = option('file', 'Gospel Artwork Archives (2025-06-08).xlsx')
const OUTPUT = option('out', INPUT.replace(/(\.xlsx)$/i, ' cleaned$1'))

/** Splits a reference into its book name and whatever follows it. */
function splitReference(reference) {
    const match = reference.trim().match(/^(.*?)(\s+\d.*)$/)
    if (!match) return {book: reference.trim(), rest: ''}
    return {book: match[1].trim(), rest: match[2]}
}

/** The corrected reference, or null when no exact fix applies. */
export function applyFixes(reference) {
    const {book, rest} = splitReference(reference)
    const corrected = SPELLING_FIXES[book]
    if (!corrected) return null
    return `${corrected}${rest}`
}

function resolve(file) {
    return path.isAbsolute(file) ? file : path.join(process.cwd(), file)
}

function main() {
    const inputPath = resolve(INPUT)
    if (!fs.existsSync(inputPath)) {
        console.error(`Workbook not found: ${inputPath}`)
        process.exit(1)
    }

    const workbook = XLSX.read(fs.readFileSync(inputPath), {type: 'buffer'})
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const range = XLSX.utils.decode_range(sheet['!ref'])

    // Find the column by the same header matching the importer uses, so the two
    // can never disagree about which column holds the reference.
    let column = null
    for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cell = sheet[XLSX.utils.encode_cell({r: range.s.r, c})]
        if (cell && normalizeHeader(cell.v) === REFERENCE_HEADER) {
            column = c
            break
        }
    }

    if (column === null) {
        console.error(`No "${REFERENCE_HEADER}" column found in sheet "${sheetName}".`)
        process.exit(1)
    }

    console.log(`Input:   ${INPUT}`)
    console.log(`Sheet:   ${sheetName}`)
    console.log(`Column:  ${XLSX.utils.encode_col(column)}`)

    const applied = []
    const brokenByFix = []
    const untouchedInvalid = []
    let scanned = 0

    for (let r = range.s.r + 1; r <= range.e.r; r += 1) {
        const address = XLSX.utils.encode_cell({r, c: column})
        const cell = sheet[address]
        const original = String(cell?.v ?? '').trim()
        if (!original || FOOTER_MARKERS.has(original.toLowerCase())) continue

        scanned += 1
        const corrected = applyFixes(original)

        if (corrected === null) {
            // Left exactly as it was. Report it only if it is still unusable.
            const check = validateReference(stripVerseParts(original))
            if (!check.valid) {
                untouchedInvalid.push({row: r + 1, reference: original, reason: check.reason})
            }
            continue
        }

        // A "fix" that does not produce a real reference is a bug in the table
        // above, not something to write into a file.
        const check = validateReference(stripVerseParts(corrected))
        if (!check.valid) {
            brokenByFix.push({row: r + 1, original, corrected, reason: check.reason})
            continue
        }

        applied.push({row: r + 1, address, original, corrected})

        if (!DRY_RUN) {
            cell.v = corrected
            cell.t = 's'
            delete cell.w // the cached display string would otherwise stay stale
        }
    }

    // ---------------------------------------------------------------- report

    console.log(`\nReferences scanned:        ${scanned}`)
    console.log(`Spelling fixes applied:    ${applied.length}`)
    console.log(`Left for manual review:    ${untouchedInvalid.length}`)

    const byFix = new Map()
    for (const {original, corrected} of applied) {
        const key = `${splitReference(original).book} -> ${splitReference(corrected).book}`
        byFix.set(key, (byFix.get(key) ?? 0) + 1)
    }

    if (byFix.size > 0) {
        console.log('\nSubstitutions:')
        for (const [key, count] of [...byFix].sort()) {
            console.log(`  ${String(count).padStart(3)}  ${key}`)
        }

        console.log('\nEvery corrected cell:')
        for (const {row, original, corrected} of applied) {
            console.log(`  row ${String(row).padStart(4)}  ${original.padEnd(28)} -> ${corrected}`)
        }
    }

    if (untouchedInvalid.length > 0) {
        console.log('\nLeft unchanged, still needs a person:')
        for (const {row, reference, reason} of untouchedInvalid) {
            console.log(`  row ${String(row).padStart(4)}  ${reference.padEnd(28)} ${reason}`)
        }
    }

    if (brokenByFix.length > 0) {
        console.error('\nA substitution did not produce a valid reference:')
        for (const {row, original, corrected, reason} of brokenByFix) {
            console.error(`  row ${row}  ${original} -> ${corrected}: ${reason}`)
        }
        console.error('\nFix SPELLING_FIXES in this script. Nothing was written.')
        process.exit(1)
    }

    if (DRY_RUN) {
        console.log('\n--dry-run: no file written.')
        return
    }

    if (applied.length === 0) {
        console.log('\nNothing to fix, so no file was written.')
        return
    }

    const outputPath = resolve(OUTPUT)
    if (outputPath === inputPath) {
        console.error('\nRefusing to overwrite the original workbook. Pass a different --out.')
        process.exit(1)
    }
    if (fs.existsSync(outputPath)) {
        console.log(`\nReplacing the existing ${OUTPUT}`)
    }

    XLSX.writeFile(workbook, outputPath)

    console.log(`\nWrote ${OUTPUT}`)
    console.log('The original is untouched. The importer prefers the cleaned copy from now on.')
}

main()
