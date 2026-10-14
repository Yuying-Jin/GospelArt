import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

/*
  A key missing from one locale's messages shows its raw name on that
  locale's pages, and a placeholder missing from one translation drops the
  value it carries. Both are caught here rather than by reading every page.
*/

const LOCALES = ['en', 'zh-CN', 'zh-TW'] as const

type Messages = {[key: string]: string | Messages}

const load = (locale: string): Messages =>
    JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'))

/** Every leaf as `a.b.c` → its text. */
function flatten(messages: Messages, prefix = ''): Map<string, string> {
    const out = new Map<string, string>()
    for (const [key, value] of Object.entries(messages)) {
        const path = prefix ? `${prefix}.${key}` : key
        if (typeof value === 'string') out.set(path, value)
        else for (const [k, v] of flatten(value, path)) out.set(k, v)
    }
    return out
}

/**
 * ICU argument names, `{count}` and `{count, plural, …}` alike. An argument
 * opens at an even brace depth: depth 0 is plain text, and a plural's branches
 * (`one {…}`) are text again at depth 2, while the branch keys sit at depth 1.
 */
function placeholders(text: string): string[] {
    const names = new Set<string>()
    let depth = 0
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
            const match = depth % 2 === 0 ? /^\{\s*([A-Za-z_]\w*)\s*[,}]/.exec(text.slice(i)) : null
            if (match) names.add(match[1])
            depth++
        } else if (text[i] === '}') depth--
    }
    return [...names].sort()
}

const all = Object.fromEntries(LOCALES.map((locale) => [locale, flatten(load(locale))]))

for (const locale of LOCALES) {
    for (const other of LOCALES) {
        if (locale === other) continue
        test(`every key in ${other} is also in ${locale}`, () => {
            const missing = [...all[other].keys()].filter((key) => !all[locale].has(key))
            assert.deepEqual(missing, [], `${locale}.json lacks keys that ${other}.json has`)
        })
    }
}

/** Empty on purpose: English needs no word after the page number box, Chinese does (跳至第 … 頁). */
const EMPTY_ALLOWED = new Set(['en: public.news.pagination.jump_after'])

test('no translation is left empty', () => {
    const empty = LOCALES.flatMap((locale) =>
        [...all[locale]].filter(([, text]) => !text.trim()).map(([key]) => `${locale}: ${key}`),
    ).filter((entry) => !EMPTY_ALLOWED.has(entry))
    assert.deepEqual(empty, [])
})

test('each translation carries the same placeholders', () => {
    const mismatched: string[] = []
    for (const [key, text] of all.en) {
        const expected = placeholders(text)
        for (const locale of LOCALES) {
            const other = all[locale].get(key)
            if (other !== undefined && placeholders(other).join() !== expected.join()) {
                mismatched.push(`${locale}: ${key} has {${placeholders(other).join(', ')}}, en has {${expected.join(', ')}}`)
            }
        }
    }
    assert.deepEqual(mismatched, [])
})

test('the placeholder reader finds arguments, not the words inside a plural', () => {
    assert.deepEqual(placeholders('Hello {name}'), ['name'])
    assert.deepEqual(placeholders('{count, plural, one {# item} other {# items}} in {place}'), ['count', 'place'])
    assert.deepEqual(placeholders('No placeholders'), [])
})
