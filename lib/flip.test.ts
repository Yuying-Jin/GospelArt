import {test} from 'node:test'
import assert from 'node:assert/strict'
import {flip} from './flip.ts'

const box = (left: number, top: number, width: number, height: number) => ({left, top, width, height})

test('boxes of the same shape scale uniformly with no clip', () => {
    const {transform, clipPath} = flip(box(0, 0, 100, 200), box(300, 100, 200, 400))
    assert.equal(transform, 'translate(-350px, -200px) scale(0.5)')
    assert.equal(clipPath, 'inset(0px 0px)')
})

test('a 16:9 crop of a 4:3 picture covers the crop and clips top and bottom', () => {
    // A 4:3 picture shown full at 400x300, cropped to 160x90 on the page.
    const {transform, clipPath} = flip(box(0, 0, 160, 90), box(0, 0, 400, 300))
    assert.equal(transform, 'translate(-120px, -105px) scale(0.4)')
    assert.equal(clipPath, 'inset(37.5px 0px)')
})

test('a box already in place needs no transform', () => {
    assert.deepEqual(flip(box(10, 20, 30, 40), box(10, 20, 30, 40)), {
        transform: 'translate(0px, 0px) scale(1)',
        clipPath: 'inset(0px 0px)',
    })
})
