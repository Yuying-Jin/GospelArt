import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {normalizeReference} from './normalize.ts'

const cases = (list: [string, string][]) => {
    for (const [typed, stored] of list) {
        test(`${JSON.stringify(typed)} -> ${JSON.stringify(stored)}`, () => {
            assert.equal(normalizeReference(typed), stored)
        })
    }
}

describe('stored references are left exactly as they are', () => {
    for (const reference of [
        'John 3:16',
        '1 John 4:16b',
        'Galatians 5:22-23a',
        'Proverbs 31:10-12, 28-29',
        'Song of Solomon 2:14a',
        'Psalms 23',
        'Psalms 119:105',
    ]) {
        test(reference, () => assert.equal(normalizeReference(reference), reference))
    }
})

describe('full-width and IME punctuation', () => {
    cases([
        ['John 3：16', 'John 3:16'],
        ['John 3﹕16', 'John 3:16'],
        ['Ｊｏｈｎ　３：１６', 'John 3:16'],
        ['John 15:1–2', 'John 15:1-2'],
        ['John 15:1—2', 'John 15:1-2'],
        ['John 15:1－2', 'John 15:1-2'],
        ['John 15:1−2', 'John 15:1-2'],
        ['John 15:1~2', 'John 15:1-2'],
        ['John 15:1～2', 'John 15:1-2'],
        ['John 15:1〜2', 'John 15:1-2'],
        ['Proverbs 31:10-12，28-29', 'Proverbs 31:10-12, 28-29'],
        ['Proverbs 31:10-12、28-29', 'Proverbs 31:10-12, 28-29'],
        ['John 3.16', 'John 3:16'],
    ])
})

describe('spacing', () => {
    cases([
        ['  John 3:16  ', 'John 3:16'],
        ['John  3:16', 'John 3:16'],
        ['John 3 : 16', 'John 3:16'],
        ['John 15:1 - 2', 'John 15:1-2'],
        ['Proverbs 31:10-12,28-29', 'Proverbs 31:10-12, 28-29'],
        ['Proverbs 31:10-12 ,  28-29', 'Proverbs 31:10-12, 28-29'],
        ['John3:16', 'John 3:16'],
        ['1John 4:16', '1 John 4:16'],
        ['1  John 4:16', '1 John 4:16'],
        ['Song  of  Solomon 2:14', 'Song of Solomon 2:14'],
        ['John 3:16', 'John 3:16'],
        ['John ​3:16', 'John 3:16'],
        ['John\t3:16', 'John 3:16'],
    ])
})

describe('book names become the canonical English name', () => {
    cases([
        ['john 3:16', 'John 3:16'],
        ['Psalm 23', 'Psalms 23'],
        ['Ps 23:1', 'Psalms 23:1'],
        ['1 Cor 13:4-8', '1 Corinthians 13:4-8'],
        ['1 Cor. 13:4', '1 Corinthians 13:4'],
        ['I John 4:16', '1 John 4:16'],
        ['Exod 20:3', 'Exodus 20:3'],
        ['約 3:16', 'John 3:16'],
        ['約3：16', 'John 3:16'],
        ['約翰福音 3:16', 'John 3:16'],
        ['约翰福音3:16', 'John 3:16'],
        ['約壹 4:16b', '1 John 4:16b'],
        ['林後 4:5-6', '2 Corinthians 4:5-6'],
        ['詩 23', 'Psalms 23'],
    ])
})

describe('verse numbers and suffixes', () => {
    cases([
        ['John 3:016', 'John 3:16'],
        ['1 John 4:16B', '1 John 4:16b'],
    ])
})

describe('what it cannot read is only cleaned, never guessed', () => {
    cases([
        ['Jacob 4:7', 'Jacob 4:7'],
        ['Matthews 6:29', 'Matthews 6:29'],
        ['Psalms 91-12', 'Psalms 91-12'],
        ['Glory to Jesus', 'Glory to Jesus'],
        ["John & Hong's poem", "John & Hong's poem"],
        ['Jacob 4：7', 'Jacob 4:7'],
        ['John 3 verse 16', 'John 3 verse 16'],
        ['', ''],
    ])
})
