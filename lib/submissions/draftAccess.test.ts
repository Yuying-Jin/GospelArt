import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {readdirSync, readFileSync, existsSync} from 'node:fs'
import {join} from 'node:path'
import {
    authorizeDraftAccess,
    assertCreatorPatch,
    newDraftId,
    DraftAccessError,
    type DraftLoader,
} from './draftAccess.ts'

/**
 * This file is the attack list. Each test is one way a creator could reach
 * past their own drafts; the names are meant to read as the checklist itself.
 * The submissions API writes with a token that can publish, so these are the only
 * things standing between a submission and the live site.
 */

const OWNER = 'user_alice'
const OTHER = 'user_bob'
const MINE = 'drafts.11111111-2222-3333-4444-555555555555'

/** A loader over a fixed set of drafts, recording what it was asked for. */
function loaderFor(docs: Record<string, {createdBy?: string | null}>) {
    const asked: string[] = []
    const load: DraftLoader = async (id) => {
        asked.push(id)
        return docs[id] ?? null
    }
    return {load, asked}
}

async function refusal(fn: () => Promise<unknown>): Promise<DraftAccessError> {
    try {
        await fn()
    } catch (error) {
        assert.ok(error instanceof DraftAccessError, `expected a refusal, got ${error}`)
        return error
    }
    throw new Error('expected a refusal, but the call resolved')
}

describe('authorizeDraftAccess', () => {
    test('lets a creator write their own draft', async () => {
        const {load} = loaderFor({[MINE]: {createdBy: OWNER}})
        assert.equal(await authorizeDraftAccess(OWNER, MINE, load), MINE)
    })

    test('refuses a draft belonging to another creator', async () => {
        const {load} = loaderFor({[MINE]: {createdBy: OTHER}})
        const error = await refusal(() => authorizeDraftAccess(OWNER, MINE, load))
        assert.equal(error.reason, 'draft belongs to another user')
    })

    test('refuses a published document id', async () => {
        const {load} = loaderFor({'some-artwork': {createdBy: OWNER}})
        const error = await refusal(() => authorizeDraftAccess(OWNER, 'some-artwork', load))
        assert.equal(error.reason, 'not a draft id')
    })

    test('refuses one of the 302 migrated artworks, which have no owner', async () => {
        const {load} = loaderFor({[MINE]: {}})
        const error = await refusal(() => authorizeDraftAccess(OWNER, MINE, load))
        assert.equal(error.reason, 'draft has no owner')
    })

    test('refuses a draft that does not exist', async () => {
        const {load} = loaderFor({})
        const error = await refusal(() => authorizeDraftAccess(OWNER, MINE, load))
        assert.equal(error.reason, 'draft does not exist')
    })

    test('refuses an empty session user rather than matching an unowned draft', async () => {
        const {load} = loaderFor({[MINE]: {createdBy: ''}})
        const error = await refusal(() => authorizeDraftAccess('', MINE, load))
        assert.equal(error.reason, 'no session user')
    })

    test('refuses a nested drafts. prefix', async () => {
        const {load} = loaderFor({'drafts.drafts.x': {createdBy: OWNER}})
        const error = await refusal(() => authorizeDraftAccess(OWNER, 'drafts.drafts.x', load))
        assert.equal(error.reason, 'not a draft id')
    })

    test('refuses ids carrying path or query characters', async () => {
        const {load} = loaderFor({})
        for (const id of ['drafts.', 'drafts../x', 'drafts.a b', 'drafts.a*', '', 'drafts.a.b']) {
            const error = await refusal(() => authorizeDraftAccess(OWNER, id, load))
            assert.equal(error.reason, 'not a draft id', `expected ${JSON.stringify(id)} refused`)
        }
    })

    test('never loads anything when the id is malformed, so it cannot probe', async () => {
        const {load, asked} = loaderFor({})
        await refusal(() => authorizeDraftAccess(OWNER, 'some-artwork', load))
        assert.deepEqual(asked, [])
    })

    test('tells the client the same thing whether the draft is missing or another creator’s', async () => {
        const missing = loaderFor({})
        const theirs = loaderFor({[MINE]: {createdBy: OTHER}})
        const a = await refusal(() => authorizeDraftAccess(OWNER, MINE, missing.load))
        const b = await refusal(() => authorizeDraftAccess(OWNER, MINE, theirs.load))
        assert.equal(a.message, b.message)
        assert.notEqual(a.reason, b.reason) // the log still distinguishes them
    })
})

describe('assertCreatorPatch', () => {
    test('accepts the content fields a creator owns', () => {
        assert.doesNotThrow(() =>
            assertCreatorPatch({
                bibleReference: 'John 11:25',
                scripture: {en: '', zhCN: '', zhTW: ''},
                date: '2026-01-01',
                sections: [],
            }),
        )
    })

    for (const field of [
        'createdBy', // would hand the work to someone else
        'slug', // locked to the Change gallery URL action
        'previousSlugs',
        'galleryVisibility', // overrides selectionCriteria outright
        'repetition', // the ratings selectionCriteria is derived from
        'quality',
        'creativity',
        'overallSelection',
        '_id',
        '_type',
        '_rev',
        '__proto__',
    ]) {
        test(`refuses a patch touching ${field}`, () => {
            const patch = JSON.parse(`{"bibleReference": "John 11:25", ${JSON.stringify(field)}: "x"}`)
            assert.throws(() => assertCreatorPatch(patch), DraftAccessError)
        })
    }
})

describe('newDraftId', () => {
    test('issues ids the authorizer accepts', async () => {
        const id = newDraftId()
        const {load} = loaderFor({[id]: {createdBy: OWNER}})
        assert.equal(await authorizeDraftAccess(OWNER, id, load), id)
    })

    test('issues a different id each time', () => {
        assert.notEqual(newDraftId(), newDraftId())
    })
})

describe('the submissions API never publishes', () => {
    /**
     * Not a unit test, and deliberately not scoped to a directory: what puts a
     * file inside the boundary is touching the token, so this follows the
     * client's import wherever a route is put. The token can publish; nothing
     * holding it may offer a way to.
     */
    const CLIENT = 'submissionsClient'

    function filesTouchingTheToken(): string[] {
        const found: string[] = []
        const walk = (dir: string) => {
            for (const entry of readdirSync(dir, {withFileTypes: true})) {
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
                const path = join(dir, entry.name)
                if (entry.isDirectory()) walk(path)
                else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
                    // An importer names it in its import statement; the module
                    // itself only carries the name in its path.
                    const touches =
                        path.includes(CLIENT) || readFileSync(path, 'utf8').includes(CLIENT)
                    if (touches) found.push(path)
                }
            }
        }
        for (const root of ['app', 'lib', 'components']) if (existsSync(root)) walk(root)
        return found
    }

    test('the scan finds the client itself, so it cannot pass by finding nothing', () => {
        const files = filesTouchingTheToken()
        assert.ok(
            files.some((file) => file.includes(CLIENT)),
            `expected to find ${CLIENT}; the scan is looking in the wrong place`,
        )
        assert.ok(files.length > 1, 'expected at least one route to use the client')
    })

    test('no publish call in anything that holds the token', () => {
        const offenders = filesTouchingTheToken().filter((file) =>
            /\.publish\s*\(|["']publish["']/.test(readFileSync(file, 'utf8')),
        )
        assert.deepEqual(offenders, [], `publish reachable from: ${offenders.join(', ')}`)
    })
})
