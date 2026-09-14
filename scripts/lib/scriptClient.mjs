import fs from 'node:fs'
import path from 'node:path'
import {createClient} from 'next-sanity'

/**
 * Loads .env.local then .env without pulling in a dotenv dependency.
 * Existing process env always wins, so CI/one-off overrides still work.
 */
export function loadEnv(cwd = process.cwd()) {
    for (const file of ['.env.local', '.env']) {
        const full = path.join(cwd, file)
        if (!fs.existsSync(full)) continue

        for (const rawLine of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
            const line = rawLine.trim()
            if (!line || line.startsWith('#')) continue

            const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
            if (!match) continue

            const [, key, rawValue] = match
            if (process.env[key] !== undefined) continue

            process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2')
        }
    }
}

export function getWriteClient() {
    loadEnv()

    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
    const token = process.env.SANITY_API_WRITE_TOKEN

    const missing = [
        !projectId && 'NEXT_PUBLIC_SANITY_PROJECT_ID',
        !dataset && 'NEXT_PUBLIC_SANITY_DATASET',
        !token && 'SANITY_API_WRITE_TOKEN',
    ].filter(Boolean)

    if (missing.length) {
        console.error(`Missing environment variable(s): ${missing.join(', ')}`)
        console.error('Add it to .env.local. The write token needs Editor permissions.')
        process.exit(1)
    }

    return createClient({
        projectId,
        dataset,
        token,
        apiVersion: '2025-02-19',
        useCdn: false,
    })
}

/** Stable per-document key for array items. */
export function arrayKey(seed) {
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0
    }
    return `k${Math.abs(hash).toString(36)}`
}
