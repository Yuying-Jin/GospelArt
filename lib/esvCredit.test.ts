import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ESV_MARK, markEsv} from './esvCredit.ts'

const block = (children: {text: string; marks?: string[]}[], markDefs: {_key: string; _type: string}[] = []) => ({
    _type: 'block',
    markDefs,
    children: children.map((child, i) => ({_type: 'span', _key: `s${i}`, marks: [], ...child})),
})

test('an ESV mark in a citation gets the esv mark and keeps its neighbours', () => {
    const [result] = markEsv([block([{text: '“The heavens declare.” (Psalm 19:1, ESV)'}])])
    assert.deepEqual(result.children.map((s) => [s.text, s.marks]), [
        ['“The heavens declare.” (Psalm 19:1, ', []],
        ['ESV', [ESV_MARK]],
        [')', []],
    ])
})

test('existing marks are kept on the split spans', () => {
    const [result] = markEsv([block([{text: 'Psalm 62:1 ESV', marks: ['strong']}])])
    assert.deepEqual(result.children.map((s) => s.marks), [['strong'], ['strong', ESV_MARK]])
})

test('a span that is already a link is left alone', () => {
    const [result] = markEsv([block([{text: 'ESV', marks: ['k1']}], [{_key: 'k1', _type: 'link'}])])
    assert.deepEqual(result.children[0].marks, ['k1'])
})

test('words that only contain the letters are not marked', () => {
    const input = [block([{text: 'ESVs and NESV are not the mark'}])]
    assert.equal(markEsv(input)[0], input[0])
})

test('split spans get unique keys', () => {
    const [result] = markEsv([block([{text: 'ESV and ESV'}])])
    const keys = result.children.map((s) => s._key)
    assert.equal(new Set(keys).size, keys.length)
})
