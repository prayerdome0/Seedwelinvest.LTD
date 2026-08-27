#!/usr/bin/env node
'use strict';

/**
 * Builds assets/certificates/manifest.json from assets/certificates/MANIFEST.csv.
 *
 * The CSV is the source of truth for the reference library shipped with the
 * AI-Certificates-Share collection: provider, credential, status, image file
 * and the public source URL each sample came from. This script turns it into
 * the compact JSON the admin certificate studio loads, and refuses to publish
 * a manifest that points at a missing image.
 *
 *   node tools/build-certificates.js           # write the manifest
 *   node tools/build-certificates.js --check    # verify only (used by npm run validate)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CERT_DIR = path.join(ROOT, 'assets', 'certificates');
const CSV = path.join(CERT_DIR, 'MANIFEST.csv');
const OUT = path.join(CERT_DIR, 'manifest.json');

const STATUS_LABELS = Object.freeze({
    VERIFIED_ACTUAL_CERTIFICATE: 'Verified certificate document',
    PENDING_PUBLIC_CERTIFICATE_SAMPLE: 'Sample only — not a certificate document'
});

/** Minimal RFC-4180 parser: the file quotes every field and URLs contain commas. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (quoted) {
            if (char === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
            } else {
                field += char;
            }
            continue;
        }
        if (char === '"') { quoted = true; continue; }
        if (char === ',') { row.push(field); field = ''; continue; }
        if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
        if (char === '\r') continue;
        field += char;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

function slugFromImage(imageFile) {
    return path.basename(imageFile).replace(/\.[a-z0-9]+$/i, '');
}

function build() {
    if (!fs.existsSync(CSV)) throw new Error('Missing ' + path.relative(ROOT, CSV));

    const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
    const header = rows.shift().map((cell) => cell.trim());
    const index = {};
    header.forEach((name, i) => { index[name] = i; });

    const required = ['number', 'provider', 'status', 'image_file'];
    for (const name of required) {
        if (index[name] === undefined) throw new Error('MANIFEST.csv is missing the "' + name + '" column');
    }

    const items = [];
    const seen = new Set();

    rows.forEach((cells, i) => {
        const number = Number(cells[index.number]);
        const imageFile = (cells[index.image_file] || '').trim();
        const status = (cells[index.status] || '').trim().toUpperCase();
        const provider = (cells[index.provider] || '').trim();

        if (!Number.isFinite(number)) throw new Error(`Row ${i + 2}: invalid number "${cells[index.number]}"`);
        if (!provider) throw new Error(`Row ${i + 2}: missing provider`);
        if (!imageFile) throw new Error(`Row ${i + 2}: missing image_file`);
        if (!STATUS_LABELS[status]) throw new Error(`Row ${i + 2}: unknown status "${status}"`);
        if (seen.has(number)) throw new Error(`Row ${i + 2}: duplicate certificate number ${number}`);
        seen.add(number);

        const absolute = path.join(CERT_DIR, imageFile);
        if (!fs.existsSync(absolute)) throw new Error(`Row ${i + 2}: image not found — assets/certificates/${imageFile}`);

        items.push({
            number,
            provider,
            credential: (cells[index.credential] || '').trim(),
            status: status === 'VERIFIED_ACTUAL_CERTIFICATE' ? 'verified' : 'sample',
            statusLabel: STATUS_LABELS[status],
            image: imageFile,
            slug: slugFromImage(imageFile),
            sourceUrl: /^https?:\/\//i.test((cells[index.source_url] || '').trim()) ? cells[index.source_url].trim() : ''
        });
    });

    items.sort((a, b) => a.number - b.number);

    return {
        generatedAt: new Date().toISOString().slice(0, 10),
        total: items.length,
        counts: {
            verified: items.filter((item) => item.status === 'verified').length,
            sample: items.filter((item) => item.status === 'sample').length
        },
        items
    };
}

function main() {
    const checkOnly = process.argv.includes('--check');
    const manifest = build();

    if (checkOnly) {
        if (!fs.existsSync(OUT)) {
            console.error('assets/certificates/manifest.json is missing — run: npm run build:certificates');
            process.exit(1);
        }
        const current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
        if (JSON.stringify(current.items) !== JSON.stringify(manifest.items)) {
            console.error('assets/certificates/manifest.json is out of date — run: npm run build:certificates');
            process.exit(1);
        }
        console.log(`ok  certificate manifest is current (${manifest.total} samples: ${manifest.counts.verified} verified, ${manifest.counts.sample} sample-only)`);
        return;
    }

    fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`wrote assets/certificates/manifest.json — ${manifest.total} samples (${manifest.counts.verified} verified, ${manifest.counts.sample} sample-only)`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

module.exports = { build, parseCsv, slugFromImage, STATUS_LABELS };
