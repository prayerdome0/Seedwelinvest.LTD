#!/usr/bin/env node
'use strict';

/**
 * Rewrites <img src="assets/images/NAME.jpg"> into a responsive <picture>
 * element that serves WebP (1280w + 768w) with the original JPEG as fallback.
 *
 * It also corrects the width/height attributes to the real intrinsic size of
 * the source file, which removes cumulative layout shift.
 *
 * The WebP derivatives themselves are produced by tools/build-images.sh.
 * This script is idempotent: images already inside a <picture> are skipped.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const IMAGE_DIR = path.join(ROOT, 'assets', 'images');

const PAGES = fs
    .readdirSync(ROOT)
    .filter((name) => name.endsWith('.html'));

function intrinsicSize(file) {
    const out = execFileSync('identify', ['-format', '%w %h', file], { encoding: 'utf8' });
    const [w, h] = out.trim().split(/\s+/).map(Number);
    return { width: w, height: h };
}

function attr(tag, name) {
    const match = tag.match(new RegExp(`${name}="([^"]*)"`));
    return match ? match[1] : null;
}

let totalRewritten = 0;

for (const page of PAGES) {
    const file = path.join(ROOT, page);
    let html = fs.readFileSync(file, 'utf8');
    let rewritten = 0;

    html = html.replace(/([ \t]*)<img\b[^>]*src="assets\/images\/([^"]+\.jpg)"[^>]*\/?>/g, (tag, indent, jpg) => {
        // Skip anything already wrapped in a <picture>.
        const idx = html.indexOf(tag);
        const before = html.slice(Math.max(0, idx - 200), idx);
        if (/<picture[^>]*>\s*(<source[^>]*>\s*)*$/.test(before)) return tag;

        const base = jpg.replace(/\.jpg$/, '');
        const full = path.join(IMAGE_DIR, `${base}.webp`);
        const small = path.join(IMAGE_DIR, `${base}-768.webp`);
        if (!fs.existsSync(full) || !fs.existsSync(small)) return tag;

        const source = path.join(IMAGE_DIR, jpg);
        const { width, height } = intrinsicSize(source);
        const fullSize = intrinsicSize(full);

        // Rebuild the <img> with corrected intrinsic dimensions.
        let img = tag.trim();
        img = img.replace(/\s*width="[^"]*"/, '').replace(/\s*height="[^"]*"/, '');
        img = img.replace(/\s*\/?>$/, '');
        img += ` width="${width}" height="${height}" />`;

        const sizes = attr(tag, 'sizes') || '(max-width: 768px) 100vw, 50vw';

        rewritten += 1;
        return (
            `${indent}<picture>\n` +
            `${indent}    <source type="image/webp" sizes="${sizes}" ` +
            `srcset="assets/images/${base}-768.webp 768w, assets/images/${base}.webp ${fullSize.width}w" />\n` +
            `${indent}    ${img}\n` +
            `${indent}</picture>`
        );
    });

    if (rewritten) {
        fs.writeFileSync(file, html);
        console.log(`${page}: wrapped ${rewritten} image(s)`);
        totalRewritten += rewritten;
    }
}

console.log(`\nDone — ${totalRewritten} image(s) now served as responsive WebP with JPEG fallback.`);
