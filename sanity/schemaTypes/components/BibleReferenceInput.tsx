import React, {useMemo, useState} from 'react'
import {set, type StringInputProps} from 'sanity'
import versification from '../../lib/scripture/versification.json'
import {normalizeReference} from '../../lib/scripture/normalize'
import {stripVerseParts} from '../../lib/scripture/reference'
import {validateReference} from '../../lib/scripture/validate'

/**
 * The Bible Reference field with a passage picker beside it. The picker only
 * ever writes the stored format into the text field, which stays editable for
 * what it cannot express: a list ("31:10-12, 28-29") or half a verse ("16b").
 */
type Book = {id: string; name: string; testament: 'OT' | 'NT'; en: string; zhTW: string}
type Label = 'zhTW' | 'en'
type Selection = {bookId: string; chapter: number; start: number; end: number; whole: boolean}

const CATALOG = versification.catalog as Book[]
const VERSES = versification.books as Record<string, number[]>
const BY_NAME = new Map(CATALOG.map((book) => [book.name, book]))
const BY_ID = new Map(CATALOG.map((book) => [book.id, book]))

const LABEL_KEY = 'gospel-art:bible-picker-label'
const EMPTY: Selection = {bookId: '', chapter: 0, start: 0, end: 0, whole: false}

function readLabel(): Label {
    try {
        return window.localStorage.getItem(LABEL_KEY) === 'en' ? 'en' : 'zhTW'
    } catch {
        return 'zhTW'
    }
}

/** Opens the picker on the passage already in the field, when it can say one. */
function selectionFrom(value: string | undefined): Selection {
    if (!value) return EMPTY
    const result = validateReference(stripVerseParts(normalizeReference(value)))
    if (!result.valid) return EMPTY

    const book = BY_NAME.get(result.book)
    if (!book) return EMPTY
    if (result.wholeChapter) return {bookId: book.id, chapter: result.chapter, start: 0, end: 0, whole: true}
    if (result.verses.length !== 1) return {...EMPTY, bookId: book.id, chapter: result.chapter}

    const [{start, end}] = result.verses
    return {bookId: book.id, chapter: result.chapter, start, end, whole: false}
}

function format({bookId, chapter, start, end, whole}: Selection): string {
    const book = BY_ID.get(bookId)
    if (!book || !chapter) return ''
    if (whole) return `${book.name} ${chapter}`
    if (!start) return ''
    return end > start ? `${book.name} ${chapter}:${start}-${end}` : `${book.name} ${chapter}:${start}`
}

const range = (count: number) => Array.from({length: count}, (_, index) => index + 1)

export function BibleReferenceInput(props: StringInputProps) {
    const {value, onChange, readOnly} = props
    const [open, setOpen] = useState(false)

    const normalized = value ? normalizeReference(value) : ''
    const fixable =
        Boolean(value) &&
        normalized !== value &&
        validateReference(stripVerseParts(normalized)).valid

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <style>{STYLES}</style>
            {props.renderDefault(props)}

            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
                <button
                    type="button"
                    className="bref-action"
                    disabled={readOnly}
                    aria-expanded={open}
                    onClick={() => setOpen((previous) => !previous)}
                >
                    {open ? 'Close picker' : '選擇經文 Pick a passage'}
                </button>

                {fixable && !readOnly && (
                    <button
                        type="button"
                        className="bref-action"
                        onClick={() => onChange(set(normalized))}
                    >
                        Change to “{normalized}”
                    </button>
                )}
            </div>

            {open && (
                <Picker
                    initial={selectionFrom(value)}
                    onCancel={() => setOpen(false)}
                    onApply={(reference) => {
                        onChange(set(reference))
                        setOpen(false)
                    }}
                />
            )}
        </div>
    )
}

function Picker({
    initial,
    onCancel,
    onApply,
}: {
    initial: Selection
    onCancel: () => void
    onApply: (reference: string) => void
}) {
    const [label, setLabel] = useState<Label>(readLabel)
    const [selection, setSelection] = useState<Selection>(initial)

    const book = BY_ID.get(selection.bookId)
    const chapters = book ? VERSES[book.name] : []
    const verseCount = selection.chapter ? chapters[selection.chapter - 1] : 0
    const reference = format(selection)

    const groups = useMemo(
        () => [
            {title: '舊約 Old Testament', books: CATALOG.filter((entry) => entry.testament === 'OT')},
            {title: '新約 New Testament', books: CATALOG.filter((entry) => entry.testament === 'NT')},
        ],
        [],
    )

    function chooseLabel(next: Label) {
        setLabel(next)
        try {
            window.localStorage.setItem(LABEL_KEY, next)
        } catch {
            // A blocked storage only costs remembering the choice.
        }
    }

    function chooseBook(next: Book) {
        // A one-chapter book has nothing to choose, so skip straight to its verses.
        const only = VERSES[next.name].length === 1 ? 1 : 0
        setSelection({...EMPTY, bookId: next.id, chapter: only})
    }

    // One click picks a verse; a click on a later one extends it into a range.
    function chooseVerse(verse: number) {
        setSelection((previous) =>
            previous.start && previous.start === previous.end && verse > previous.start
                ? {...previous, end: verse}
                : {...previous, start: verse, end: verse},
        )
    }

    return (
        <div className="bref-panel">
            <div className="bref-head">
                <strong>書卷 Book</strong>
                <div role="group" aria-label="Book name display" className="bref-toggle">
                    <button type="button" aria-pressed={label === 'zhTW'} onClick={() => chooseLabel('zhTW')}>
                        繁中
                    </button>
                    <button type="button" aria-pressed={label === 'en'} onClick={() => chooseLabel('en')}>
                        English
                    </button>
                </div>
            </div>

            {groups.map((group) => (
                <section key={group.title} className="bref-group">
                    <div className="bref-caption">{group.title}</div>
                    <div className={`bref-grid ${label === 'en' ? 'bref-books-en' : 'bref-books-zh'}`}>
                        {group.books.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                className="bref-cell"
                                title={entry.name}
                                aria-pressed={entry.id === selection.bookId}
                                onClick={() => chooseBook(entry)}
                            >
                                {entry[label]}
                            </button>
                        ))}
                    </div>
                </section>
            ))}

            {book && (
                <section className="bref-group">
                    <div className="bref-caption">
                        章 Chapter · {book.name} has {chapters.length}
                    </div>
                    <div className="bref-grid bref-numbers">
                        {range(chapters.length).map((chapter) => (
                            <button
                                key={chapter}
                                type="button"
                                className="bref-cell"
                                aria-pressed={chapter === selection.chapter}
                                onClick={() =>
                                    setSelection((previous) => ({
                                        ...previous,
                                        chapter,
                                        start: 0,
                                        end: 0,
                                    }))
                                }
                            >
                                {chapter}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {book && selection.chapter > 0 && (
                <section className="bref-group">
                    <div className="bref-head">
                        <div className="bref-caption">
                            節 Verse · chapter {selection.chapter} has {verseCount}
                        </div>
                        <label className="bref-whole">
                            <input
                                type="checkbox"
                                checked={selection.whole}
                                onChange={(event) => {
                                    const whole = event.currentTarget.checked
                                    setSelection((previous) => ({...previous, whole, start: 0, end: 0}))
                                }}
                            />
                            整章 Whole chapter
                        </label>
                    </div>

                    {selection.whole ? (
                        <p className="bref-hint">
                            The whole of chapter {selection.chapter} is cited — no verse is saved.
                        </p>
                    ) : (
                        <>
                            <div className="bref-grid bref-numbers bref-verses">
                                {range(verseCount).map((verse) => (
                                    <button
                                        key={verse}
                                        type="button"
                                        className="bref-cell"
                                        aria-pressed={
                                            selection.start > 0 &&
                                            verse >= selection.start &&
                                            verse <= selection.end
                                        }
                                        onClick={() => chooseVerse(verse)}
                                    >
                                        {verse}
                                    </button>
                                ))}
                            </div>
                            <p className="bref-hint">
                                Click a verse. Click a later verse to make it a range; click
                                again to start over.
                            </p>
                        </>
                    )}
                </section>
            )}

            <div className="bref-foot">
                <span>
                    {reference ? (
                        <>
                            Will be saved as <strong>{reference}</strong>
                        </>
                    ) : (
                        <span style={{opacity: 0.6}}>
                            {!book ? 'Choose a book.' : !selection.chapter ? 'Choose a chapter.' : 'Choose a verse, or tick 整章.'}
                        </span>
                    )}
                </span>
                <span style={{display: 'flex', gap: 8}}>
                    <button type="button" className="bref-action" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="bref-action bref-primary"
                        disabled={!reference}
                        onClick={() => onApply(reference)}
                    >
                        Use this reference
                    </button>
                </span>
            </div>
        </div>
    )
}

/** Class-scoped so hover and focus states are possible with plain CSS. */
const STYLES = `
.bref-panel {
    border: 1px solid rgba(128,128,128,0.3);
    border-radius: 4px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-size: 13px;
    line-height: 1.5;
}
.bref-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.bref-group { display: flex; flex-direction: column; gap: 6px; }
.bref-caption { font-size: 12px; opacity: 0.7; }
.bref-grid { display: grid; gap: 4px; }
.bref-books-zh { grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); }
.bref-books-en { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); }
.bref-numbers { grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); max-height: 168px; overflow-y: auto; }
.bref-panel button {
    font: inherit;
    color: inherit;
    background: transparent;
    border: 1px solid rgba(128,128,128,0.35);
    border-radius: 3px;
    cursor: pointer;
}
.bref-cell { padding: 5px 2px; text-align: center; white-space: nowrap; }
.bref-panel button:hover:not(:disabled) { background: rgba(128,128,128,0.14); }
.bref-panel button:focus-visible, .bref-action:focus-visible { outline: 2px solid #2276fc; outline-offset: 1px; }
.bref-panel button[aria-pressed="true"] { background: #2276fc; border-color: #2276fc; color: #fff; }
.bref-toggle { display: inline-flex; }
.bref-toggle button { padding: 3px 10px; }
.bref-toggle button:first-child { border-radius: 3px 0 0 3px; }
.bref-toggle button:last-child { border-radius: 0 3px 3px 0; margin-left: -1px; }
.bref-whole { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.bref-whole input { appearance: auto; }
.bref-hint { margin: 0; font-size: 12px; opacity: 0.6; }
.bref-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    border-top: 1px solid rgba(128,128,128,0.25);
    padding-top: 10px;
}
.bref-action {
    font: inherit;
    font-size: 13px;
    color: inherit;
    background: transparent;
    border: 1px solid rgba(128,128,128,0.35);
    border-radius: 3px;
    padding: 6px 12px;
    cursor: pointer;
}
.bref-action:hover:not(:disabled) { background: rgba(128,128,128,0.14); }
.bref-action:disabled { opacity: 0.5; cursor: default; }
.bref-panel .bref-primary:not(:disabled) { background: #2276fc; border-color: #2276fc; color: #fff; }
`
