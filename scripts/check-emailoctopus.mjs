#!/usr/bin/env node
/**
 * Exercises the newsletter path against the live EmailOctopus API, the same
 * calls `lib/emailoctopus.ts` makes. Read-only unless an address is given.
 *
 *   node scripts/check-emailoctopus.mjs                  # auth + list only
 *   node scripts/check-emailoctopus.mjs you@example.com  # full round trip
 *
 * The key is never printed.
 */
import {readFileSync, existsSync} from "node:fs";
import {createHash} from "node:crypto";

const API_BASE = "https://api.emailoctopus.com";

function loadEnv() {
    const env = {};
    // Same precedence as Next.js: .env.local wins.
    for (const file of [".env", ".env.local"]) {
        if (!existsSync(file)) continue;
        for (const line of readFileSync(file, "utf8").split("\n")) {
            const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
            if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
    }
    return env;
}

const env = loadEnv();
const key = env.EMAILOCTOPUS_API_KEY;
const listId = env.EMAILOCTOPUS_LIST_ID;
const email = process.argv[2];

if (!key || !listId) {
    console.error("✗ EMAILOCTOPUS_API_KEY / EMAILOCTOPUS_LIST_ID missing from .env.local");
    process.exit(1);
}

async function call(path, init = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: init.method ?? "GET",
        headers: {Authorization: `Bearer ${key}`, "Content-Type": "application/json"},
        body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const body = await response.json().catch(() => ({}));
    return {ok: response.ok, status: response.status, body};
}

/** Errors are RFC 7807 problem details, the shape `lib/emailoctopus.ts` reads. */
const why = (body) => body.detail ?? body.title ?? JSON.stringify(body).slice(0, 120);

const contactId = (address) => createHash("md5").update(address.toLowerCase()).digest("hex");

console.log(`key  …${key.slice(-4)}  (${key.length} chars)`);
console.log(`list ${listId}\n`);

const auth = await call("/lists");
if (!auth.ok) {
    console.error(`✗ auth failed — HTTP ${auth.status}: ${why(auth.body)}`);
    if (auth.status === 401) {
        console.error("  A limited or unapproved account rejects every key. Check the dashboard.");
    }
    process.exit(1);
}
console.log("✓ key accepted");

const list = await call(`/lists/${listId}`);
if (!list.ok) {
    console.error(`✗ list unreachable — HTTP ${list.status}: ${why(list.body)}`);
    process.exit(1);
}
// `counts` arrives as a single-element array.
const counts = (Array.isArray(list.body.counts) ? list.body.counts[0] : list.body.counts) ?? {};
console.log(
    `✓ list "${list.body.name}" — subscribed ${counts.subscribed ?? "?"}, ` +
        `pending ${counts.pending ?? "?"}, unsubscribed ${counts.unsubscribed ?? "?"}`,
);

const doubleOptIn = list.body.double_opt_in === true;
console.log(`${doubleOptIn ? "✓" : "✗"} double opt-in is ${doubleOptIn ? "on" : "OFF"} for this list`);

if (!email) {
    console.log("\nPass an address to run the subscribe round trip.");
    process.exit(0);
}

// Writing with double opt-in off records a subscription with no confirmation
// behind it — the exact thing that got the Mailchimp account flagged.
if (!doubleOptIn && !process.argv.includes("--force")) {
    console.error("\n✗ Refusing to write: double opt-in is off for this list.");
    console.error("  Turn it on first, or pass --force to subscribe without it.");
    process.exit(1);
}

console.log(`\nsubscribing ${email} as pending…`);
const created = await call(`/lists/${listId}/contacts`, {
    method: "POST",
    body: {email_address: email, status: "pending"},
});

if (created.ok) {
    console.log(`✓ created — status "${created.body.status}"`);
} else if (created.status === 409) {
    console.log("• already known, looking it up");
} else {
    console.error(`✗ create failed — HTTP ${created.status}: ${why(created.body)}`);
    process.exit(1);
}

const found = await call(`/lists/${listId}/contacts/${contactId(email)}`);
if (!found.ok) {
    console.error(`✗ lookup failed — HTTP ${found.status}: ${why(found.body)}`);
    process.exit(1);
}

console.log(`✓ contact status is "${found.body.status}"`);

if (String(found.body.status).toLowerCase() === "pending") {
    console.log("\n→ Now check that inbox. A confirmation email means double opt-in works");
    console.log("  end to end. Nothing arriving means it is off on the list itself.");
} else {
    console.log("\n⚠ Not pending — double opt-in is probably off on the list, so this");
    console.log("  address was subscribed with no confirmation on record.");
}
