import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildSignupAlert} from './signupAlert.ts'

const recent = (count: number, truncated = false) => ({
    count,
    addresses: Array.from({length: count}, (_, i) => `person${i}@example.com`),
    truncated,
})

test('a normal day sends nothing', () => {
    assert.equal(buildSignupAlert(recent(0), 20), null)
    assert.equal(buildSignupAlert(recent(19), 20), null)
})

test('reaching the threshold warns, with the addresses', () => {
    const alert = buildSignupAlert(recent(20), 20)
    assert.ok(alert)
    assert.match(alert.subject, /20 個/)
    assert.match(alert.text, /person0@example\.com/)
})

test('a flood lists 50 addresses and counts the rest', () => {
    const alert = buildSignupAlert(recent(80), 20)
    assert.ok(alert)
    assert.equal(alert.text.match(/^- /gm)?.length, 50)
    assert.match(alert.text, /另有 30 個/)
})

test('a list cut short at the page cap says so', () => {
    assert.match(buildSignupAlert(recent(1000, true), 20)!.subject, /1000\+ 個/)
})
