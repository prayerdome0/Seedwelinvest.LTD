#!/usr/bin/env node
'use strict';

/**
 * Validates every application/ld+json block on every public page:
 *  - it must be syntactically valid JSON
 *  - it must declare @context and @type
 * Exits non-zero on the first problem so CI fails loudly.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

let blocks = 0;
let failures = 0;

for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];

    for (const [, raw] of matches) {
        blocks += 1;
        let data;
        try {
            data = JSON.parse(raw);
        } catch (error) {
            console.error(`INVALID JSON  ${page}: ${error.message}`);
            failures += 1;
            continue;
        }

        const entries = Array.isArray(data) ? data : [data];
        for (const entry of entries) {
            if (!entry['@context']) {
                console.error(`MISSING @context  ${page}`);
                failures += 1;
            }
            if (!entry['@type']) {
                console.error(`MISSING @type  ${page}`);
                failures += 1;
            }
        }
    }
}

if (failures) {
    console.error(`\n${failures} structured-data problem(s) found.`);
    process.exit(1);
}

console.log(`ok  ${blocks} JSON-LD block(s) valid across ${pages.length} page(s)`);
