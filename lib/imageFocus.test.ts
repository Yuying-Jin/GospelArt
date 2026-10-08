import {test} from 'node:test'
import assert from 'node:assert/strict'
import {croppedRatio, imageFocus} from './imageFocus.ts'

test('no hotspot is the centre', () => {
    assert.deepEqual(imageFocus(null, null), {x: 50, y: 50})
})

test('without a crop the hotspot is used as it is', () => {
    assert.deepEqual(imageFocus({x: 0.8, y: 0.25}, null), {x: 80, y: 25})
})

test('a crop moves the hotspot into the served picture', () => {
    // Left half trimmed off: a point at 75% of the whole is the middle of what is left.
    assert.deepEqual(imageFocus({x: 0.75, y: 0.5}, {top: 0, bottom: 0, left: 0.5, right: 0}), {x: 50, y: 50})
})

test('a hotspot outside the crop is held at its edge', () => {
    assert.deepEqual(imageFocus({x: 0.1, y: 0.95}, {top: 0, bottom: 0.2, left: 0.2, right: 0}), {x: 0, y: 100})
})

test('a crop that leaves nothing falls back to the centre', () => {
    assert.deepEqual(imageFocus({x: 0.5, y: 0.5}, {top: 0.5, bottom: 0.5, left: 0, right: 0}), {x: 50, y: 50})
})

test('the ratio is of the cropped picture', () => {
    assert.equal(croppedRatio(1000, 2000, null), 0.5)
    assert.equal(croppedRatio(1000, 2000, {top: 0.25, bottom: 0.25, left: 0, right: 0}), 1)
})
