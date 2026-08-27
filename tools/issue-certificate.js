#!/usr/bin/env node
'use strict';

/**
 * Headless issuer for Seedwel's OWN certificate template.
 *
 * Runs the exact same drawing code the admin studio uses in the browser
 * (assets/js/certificate-utils.js -> drawCertificate) against a Node canvas,
 * then bundles the sheet into a one-page PDF with the same jsPDF the studio
 * uses. Recipient, course, signer and every other line are plain arguments —
 * this is how Seedwel issues certificates in anyone's name.
 *
 * It never touches the third-party reference library in assets/certificates:
 * those images keep the provider details they were issued with.
 *
 * Setup (canvas + fonts are tooling-only, kept out of package.json):
 *   npm i --no-save @napi-rs/canvas @fontsource/great-vibes @fontsource/montserrat \
 *       @fontsource/playfair-display @fontsource/inter
 *
 * Usage:
 *   node tools/issue-certificate.js [--recipient "Zacheus Simbaya"] [--course "..."]
 *        [--award "Certificate of Completion"] [--signer "..."] [--signer-role "..."]
 *        [--date 2026-08-27] [--style script|serif|sans] [--format a4|letter]
 *        [--orientation landscape|portrait] [--out-dir .]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const C = require(path.join(ROOT, 'assets', 'js', 'certificate-utils.js'));

function arg(name, fallback) {
    const flag = '--' + name;
    const at = process.argv.indexOf(flag);
    if (at === -1) return fallback;
    return process.argv[at + 1] || fallback;
}

function loadCanvasLib() {
    try {
        return require('@napi-rs/canvas');
    } catch (error) {
        console.error('Missing @napi-rs/canvas. Run:\n  npm i --no-save @napi-rs/canvas @fontsource/great-vibes @fontsource/montserrat @fontsource/playfair-display @fontsource/inter');
        process.exit(1);
    }
}

/** Registers the webfonts the studio uses, from @fontsource packages when present. */
function registerFonts(canvasLib) {
    const files = [
        '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff',
        '@fontsource/montserrat/files/montserrat-latin-400-normal.woff',
        '@fontsource/montserrat/files/montserrat-latin-500-normal.woff',
        '@fontsource/montserrat/files/montserrat-latin-600-normal.woff',
        '@fontsource/montserrat/files/montserrat-latin-700-normal.woff',
        '@fontsource/montserrat/files/montserrat-latin-800-normal.woff',
        '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff',
        '@fontsource/inter/files/inter-latin-400-normal.woff',
        '@fontsource/inter/files/inter-latin-500-normal.woff',
        '@fontsource/inter/files/inter-latin-600-normal.woff',
        '@fontsource/inter/files/inter-latin-700-normal.woff'
    ];
    let loaded = 0;
    for (const file of files) {
        const at = path.join(ROOT, 'node_modules', file);
        if (!fs.existsSync(at)) continue;
        try {
            if (canvasLib.GlobalFonts.registerFromPath(at)) loaded += 1;
        } catch (error) {
            /* a missing weight just falls back; the sheet still renders */
        }
    }
    return loaded;
}

async function main() {
    const canvasLib = loadCanvasLib();
    const fonts = registerFonts(canvasLib);

    const recipient = arg('recipient', 'Zacheus Simbaya');
    const course = arg('course', 'AI & Automation Fundamentals');
    const data = {
        recipient,
        course,
        awardType: arg('award', 'Certificate of Completion'),
        description: arg('description', 'Completed the supervised practical programme, including the final assessment.'),
        issuedOn: arg('date', C.todayInputValue()),
        signerName: arg('signer', 'Zacheus Simbaya'),
        signerRole: arg('signer-role', 'Founder & Lead Digital Strategist'),
        company: arg('company', 'SEEDWEL INVESTMENT LTD'),
        verifyUrl: arg('verify', 'seedwel.ltd/verify'),
        accent: arg('accent', '#dc2626'),
        nameStyle: arg('style', 'script')
    };
    const format = arg('format', 'a4');
    const orientation = arg('orientation', 'landscape');
    const outDir = path.resolve(arg('out-dir', ROOT));

    const seed = data.recipient + ' | ' + data.course + ' | ' + data.issuedOn;
    data.certificateId = C.certificateId(seed);

    const size = C.renderSize(format, orientation, 150);
    const canvas = canvasLib.createCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d');

    let logo = null;
    const logoPath = path.join(ROOT, 'seedwel.png');
    if (fs.existsSync(logoPath)) logo = await canvasLib.loadImage(logoPath);

    C.drawCertificate(ctx, data, size, logo);

    fs.mkdirSync(outDir, { recursive: true });
    const pngPath = path.join(outDir, C.pdfFileName(recipient, undefined, 'png'));
    fs.writeFileSync(pngPath, canvas.toBuffer('image/png'));

    const { jsPDF } = require('jspdf');
    const dims = orientation === 'portrait' ? C.PAGE_SIZES[format].portrait : C.PAGE_SIZES[format].landscape;
    const doc = new jsPDF({ orientation, unit: 'mm', format, compress: true });
    // JPEG keeps the one-page PDF small; the PNG next to it stays lossless.
    doc.addImage(canvas.toBuffer('image/jpeg', { quality: 0.92 }).toString('base64'), 'JPEG', 0, 0, dims[0], dims[1]);
    doc.setProperties({ title: data.awardType + ' — ' + recipient, author: data.company, subject: course });
    const pdfPath = path.join(outDir, C.pdfFileName(recipient));
    fs.writeFileSync(pdfPath, Buffer.from(doc.output('arraybuffer')));

    console.log('issued  ' + path.relative(ROOT, pngPath) + '  (' + size.width + 'x' + size.height + 'px, ' + fonts + ' webfont file(s) loaded)');
    console.log('issued  ' + path.relative(ROOT, pdfPath) + '  (ID ' + data.certificateId + ')');
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
