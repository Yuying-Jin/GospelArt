import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

/**
 * The Studio is its own project and cannot import from the app, so it carries
 * copies. They are kept byte-identical rather than "in sync", so drift is a
 * failing test instead of a judgement call.
 */
const MIRRORED = ['normalize.ts', 'validate.ts', 'reference.ts', 'versification.json']

const APP = import.meta.dirname
const STUDIO = join(import.meta.dirname, '..', '..', 'sanity', 'lib', 'scripture')

for (const file of MIRRORED) {
    test(`sanity/lib/scripture/${file} is identical to lib/scripture/${file}`, () => {
        assert.equal(
            readFileSync(join(STUDIO, file), 'utf8'),
            readFileSync(join(APP, file), 'utf8'),
            `copy lib/scripture/${file} over the Studio's (versification.json: rerun scripts/generate-versification.mjs)`,
        )
    })
}
