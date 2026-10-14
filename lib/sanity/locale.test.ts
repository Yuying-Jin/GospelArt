import {test} from 'node:test'
import assert from 'node:assert/strict'
import {resolveLocale, type AppLocale} from './locale.ts'

const all = {zhTW: '繁體', zhCN: '简体', en: 'English'}

test('each locale reads its own text first', () => {
    assert.equal(resolveLocale(all, 'zh-TW'), '繁體')
    assert.equal(resolveLocale(all, 'zh-CN'), '简体')
    assert.equal(resolveLocale(all, 'en'), 'English')
})

test('each Chinese script falls back to the other, then to English', () => {
    assert.equal(resolveLocale({zhCN: '简体', en: 'English'}, 'zh-TW'), '简体')
    assert.equal(resolveLocale({zhTW: '繁體', en: 'English'}, 'zh-CN'), '繁體')
    assert.equal(resolveLocale({en: 'English'}, 'zh-TW'), 'English')
    assert.equal(resolveLocale({en: 'English'}, 'zh-CN'), 'English')
})

test('English falls back to Traditional, the authored language, before Simplified', () => {
    assert.equal(resolveLocale({zhTW: '繁體', zhCN: '简体'}, 'en'), '繁體')
    assert.equal(resolveLocale({zhCN: '简体'}, 'en'), '简体')
})

test('blank or whitespace-only text counts as missing', () => {
    assert.equal(resolveLocale({zhTW: '   ', zhCN: '简体'}, 'zh-TW'), '简体')
    assert.equal(resolveLocale({en: '', zhTW: '繁體'}, 'en'), '繁體')
    assert.equal(resolveLocale({en: null, zhTW: '繁體'}, 'en'), '繁體')
})

test('text is trimmed', () => {
    assert.equal(resolveLocale({zhTW: '  繁體\n'}, 'zh-TW'), '繁體')
})

test('nothing in any language gives an empty string, never undefined', () => {
    for (const locale of ['en', 'zh-CN', 'zh-TW'] as AppLocale[]) {
        assert.equal(resolveLocale(null, locale), '')
        assert.equal(resolveLocale({}, locale), '')
    }
})
