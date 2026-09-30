import {test} from 'node:test'
import assert from 'node:assert/strict'
import {testOutcome} from './testTrigger.ts'

const OUTCOMES = ['sent', 'failed', 'rate_limited'] as const

test('a real entry is not a test', () => {
    assert.equal(testOutcome('someone@example.com', OUTCOMES, 'sent'), null)
    assert.equal(testOutcome('my test! entry', OUTCOMES, 'sent'), null)
})

test('test! alone is the success outcome', () => {
    assert.equal(testOutcome('test!', OUTCOMES, 'sent'), 'sent')
    assert.equal(testOutcome('  TEST!  ', OUTCOMES, 'sent'), 'sent')
})

test('test! followed by an outcome picks it', () => {
    assert.equal(testOutcome('test!rate_limited', OUTCOMES, 'sent'), 'rate_limited')
    assert.equal(testOutcome('test!failed', OUTCOMES, 'sent'), 'failed')
})

test('an unknown outcome falls back to success', () => {
    assert.equal(testOutcome('test!nonsense', OUTCOMES, 'sent'), 'sent')
})
