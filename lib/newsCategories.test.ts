import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {categoryForSegment, NEWS_CATEGORY_CONFIG} from './newsCategories.ts'

test('sanity/lib/newsCategories.ts is identical to lib/newsCategories.ts', () => {
    const root = join(import.meta.dirname, '..')
    assert.equal(
        readFileSync(join(root, 'sanity', 'lib', 'newsCategories.ts'), 'utf8'),
        readFileSync(join(root, 'lib', 'newsCategories.ts'), 'utf8'),
        'copy lib/newsCategories.ts over the Studio\'s',
    )
})

test('ids and page segments are unique', () => {
    const ids = NEWS_CATEGORY_CONFIG.map((category) => category.id)
    const segments = NEWS_CATEGORY_CONFIG.map((category) => category.segment)
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(new Set(segments).size, segments.length)
})

test('a segment resolves to its category, anything else to null', () => {
    assert.equal(categoryForSegment('updates')?.id, 'ministry')
    assert.equal(categoryForSegment('ministry'), null)
    assert.equal(categoryForSegment('christmas-exhibition-2026-12-20'), null)
})
