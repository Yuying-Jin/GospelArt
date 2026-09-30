import {test} from 'node:test'
import assert from 'node:assert/strict'
import {newsPlaceholderSvg, newsPlaceholderUrl} from './newsPlaceholder.ts'

test('the same slug always draws the same picture', () => {
    assert.equal(newsPlaceholderSvg('advent-2026-12-01'), newsPlaceholderSvg('advent-2026-12-01'))
})

test('different slugs draw different pictures', () => {
    assert.notEqual(newsPlaceholderSvg('advent-2026-12-01'), newsPlaceholderSvg('easter-2027-03-28'))
})

test('the picture is a complete SVG with every shape', () => {
    const svg = newsPlaceholderSvg('a')
    assert.match(svg, /^<svg [^>]*>.*<\/svg>$/)
    assert.equal(svg.match(/<polygon /g)?.length, 26)
    assert.doesNotMatch(svg, /NaN/)
})

test('the URL is an encoded data URI', () => {
    assert.match(newsPlaceholderUrl('a'), /^data:image\/svg\+xml,%3Csvg/)
})
