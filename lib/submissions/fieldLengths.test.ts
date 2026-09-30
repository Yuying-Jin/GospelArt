import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {assertCreatorLengths, FieldLengthError} from './fieldLengths.ts'

const zh = (n: number) => '字'.repeat(n)
const en = (n: number) => 'a'.repeat(n)

function refused(patch: Record<string, unknown>, field: string) {
    assert.throws(
        () => assertCreatorLengths(patch),
        (error) => error instanceof FieldLengthError && error.field === field,
    )
}

test('sanity/lib/fieldLimits.ts is identical to lib/fieldLimits.ts', () => {
    const root = join(import.meta.dirname, '..', '..')
    assert.equal(
        readFileSync(join(root, 'sanity', 'lib', 'fieldLimits.ts'), 'utf8'),
        readFileSync(join(root, 'lib', 'fieldLimits.ts'), 'utf8'),
        'copy lib/fieldLimits.ts over the Studio\'s',
    )
})

test('scripture at the limit in every language is accepted', () => {
    assertCreatorLengths({scripture: {zhTW: zh(200), zhCN: zh(200), en: en(600)}})
})

test('Chinese scripture one over the limit is refused', () => {
    refused({scripture: {zhTW: zh(201)}}, 'scripture')
})

test('English scripture has its own, longer limit', () => {
    assertCreatorLengths({scripture: {en: en(600)}})
    refused({scripture: {en: en(601)}}, 'scripture')
})

test('a long Bible reference is refused', () => {
    refused({bibleReference: en(31)}, 'bibleReference')
})

test('a long artwork subject is refused', () => {
    refused({artworkSubject: en(201)}, 'artworkSubject')
})

test('any one over-long section body is refused', () => {
    refused({sections: [{body: {zhTW: zh(10)}}, {body: {zhTW: zh(1001)}}]}, 'sections')
})

test('fields without a limit, and malformed values, are left to the allowlist', () => {
    assertCreatorLengths({date: '2026-01-01', sections: 'not an array', scripture: 42})
})

test('the message names the language and its limit', () => {
    try {
        assertCreatorLengths({scripture: {zhTW: zh(250)}})
        assert.fail('expected a refusal')
    } catch (error) {
        assert.match((error as Error).message, /200 characters\. Traditional Chinese has 250/)
    }
})
