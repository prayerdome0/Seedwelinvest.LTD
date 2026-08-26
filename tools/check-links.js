#!/usr/bin/env node
'use strict';

/**
 * Checks that every internal href and asset reference on the public pages
 * actually resolves to a file in the repository (taking the vercel.json
 * rewrites into account). Catches typos and pages deleted without their
 * links being cleaned up.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

// Clean URL -> file, taken straight from the deployment config.
const routes = new Map();
for (const rewrite of vercel.rewrites || []) {
    if (rewrite.source.includes(':')) continue; // dynamic routes are checked by pattern below
    routes.set(rewrite.source, rewrite.destination.replace(/^\//, '').split('?')[0]);
}

const DYNAMIC_PREFIXES = (vercel.rewrites || [])
    .filter((r) => r.source.includes(':'))
    .map((r) => r.source.split('/:')[0]);

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

let checked = 0;
const problems = [];

function resolves(target) {
    // Strip query strings and fragments.
    const clean = target.split('#')[0].split('?')[0];
    if (clean === '' || clean === '/') return fs.existsSync(path.join(ROOT, 'index.html'));

    // A configured clean URL.
    if (routes.has(clean)) return fs.existsSync(path.join(ROOT, routes.get(clean)));

    // A dynamic admin route such as /admin/applications/<id>.
    if (DYNAMIC_PREFIXES.some((prefix) => clean.startsWith(prefix + '/'))) return true;

    // A real file on disk (assets, images, .html files).
    const rel = clean.replace(/^\//, '');
    return fs.existsSync(path.join(ROOT, rel));
}

for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const refs = [
        ...[...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]),
        ...[...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]),
        ...[...html.matchAll(/srcset="([^"]+)"/g)].flatMap((m) =>
            m[1].split(',').map((part) => part.trim().split(/\s+/)[0])
        )
    ];

    for (const ref of refs) {
        // Skip anything that leaves the site or is not a file reference.
        if (/^(https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(ref)) continue;
        checked += 1;
        if (!resolves(ref)) problems.push(`${page} -> ${ref}`);
    }
}

if (problems.length) {
    console.error('Broken internal references:\n');
    for (const problem of problems) console.error('  ' + problem);
    console.error(`\n${problems.length} broken reference(s).`);
    process.exit(1);
}

console.log(`ok  ${checked} internal reference(s) resolve across ${pages.length} page(s)`);
