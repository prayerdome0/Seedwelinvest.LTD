'use strict';

/**
 * Certificate studio tests.
 *
 *  1. manifest integrity — every sample the admin page can offer exists on disk
 *  2. certificate-utils — layout maths and the canvas drawing calls
 *  3. PDF assembly — the shipped page descriptors through the real jsPDF build
 *  4. end-to-end — the actual admin page in headless Chrome (skipped when
 *     puppeteer is not installed)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const CERT_DIR = path.join(ROOT, 'assets', 'certificates');

const C = require(path.join(ROOT, 'assets/js/certificate-utils.js'));

function loadPdfLibrary() {
    try { return require('jspdf').jsPDF; }
    catch (_) { return null; }
}

/**
 * Launches a headless Chrome we can actually drive: PUPPETEER_EXECUTABLE_PATH,
 * puppeteer's own download, or the serverless chromium build from npm.
 * Returns null (so the test skips) when nothing can start — e.g. a sandbox
 * without the shared libraries Chrome needs.
 */
async function launchHeadlessBrowser() {
    let puppeteer = null;
    try { puppeteer = require('puppeteer'); }
    catch (_) {
        try { puppeteer = require('puppeteer-core'); }
        catch (__) { return null; }
    }

    const args = ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'];
    const candidates = [];

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        candidates.push(() => puppeteer.launch({ headless: 'new', args }));
    }
    try {
        const bundled = await puppeteer.executablePath();
        if (bundled && fs.existsSync(bundled)) candidates.push(() => puppeteer.launch({ headless: 'new', args }));
    } catch (_) { /* puppeteer has no browser of its own here */ }
    try {
        const module = await import('@sparticuz/chromium');
        const chromium = module.default || module;
        const executablePath = await chromium.executablePath();
        if (executablePath && fs.existsSync(executablePath)) {
            candidates.push(() => puppeteer.launch({
                executablePath,
                headless: 'new',
                args: args.concat(['--single-process', '--no-zygote', '--disable-gpu'])
            }));
        }
    } catch (_) { /* serverless chromium is not installed either */ }

    for (const candidate of candidates) {
        try { return await candidate(); }
        catch (_) { /* this one could not start; try the next */ }
    }
    return null;
}

/** Minimal PNG writer so the upload test has a real image file to hand over. */
const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

function crc32(buffer) {
    let crc = -1;
    for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
}

function makeTestPng(width, height, rgb) {
    const stride = width * 3 + 1;
    const raw = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = y * stride + 1 + x * 3;
            raw[offset] = rgb[0];
            raw[offset + 1] = rgb[1];
            raw[offset + 2] = rgb[2];
        }
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;  // bit depth
    header[9] = 2;  // truecolour
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', header),
        pngChunk('IDAT', zlib.deflateSync(raw)),
        pngChunk('IEND', Buffer.alloc(0))
    ]);
}

// --------------------------------------------------------------- stub canvas

function stubContext(charWidthFactor) {
    const calls = [];
    const factor = charWidthFactor || 0.5;
    const ctx = {
        font: '400 16px sans-serif',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        textAlign: 'left',
        textBaseline: 'alphabetic',
        globalAlpha: 1,
        measureText(value) {
            const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)[1]);
            return { width: String(value).length * size * factor };
        }
    };
    ['save', 'restore', 'fillRect', 'strokeRect', 'fillText', 'beginPath', 'moveTo', 'lineTo',
        'stroke', 'fill', 'translate', 'rotate', 'drawImage'].forEach((name) => {
        ctx[name] = function () {
            calls.push({ name, args: Array.from(arguments), font: ctx.font, fillStyle: ctx.fillStyle, align: ctx.textAlign });
        };
    });
    ctx.calls = calls;
    ctx.text = function (needle) {
        return calls.filter((call) => call.name === 'fillText' && String(call.args[0]).indexOf(needle) !== -1);
    };
    return ctx;
}

// ---------------------------------------------------------- 1. the manifest

test('certificate manifest matches the images on disk', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(CERT_DIR, 'manifest.json'), 'utf8'));

    assert.equal(manifest.total, manifest.items.length);
    assert.equal(manifest.total, 167, 'the shipped collection has 167 samples');
    assert.equal(manifest.counts.verified, 104);
    assert.equal(manifest.counts.sample, 63);

    const numbers = new Set();
    manifest.items.forEach((item) => {
        assert.ok(!numbers.has(item.number), 'duplicate number ' + item.number);
        numbers.add(item.number);
        assert.ok(item.provider.length > 0, 'sample ' + item.number + ' has no provider');
        assert.ok(['verified', 'sample'].includes(item.status), 'bad status on ' + item.number);
        assert.ok(item.statusLabel.length > 0, 'sample ' + item.number + ' has no status label');
        assert.ok(
            fs.existsSync(path.join(CERT_DIR, item.image)),
            'missing image for sample ' + item.number + ': ' + item.image
        );
        assert.equal(item.slug, path.basename(item.image).replace(/\.[a-z0-9]+$/i, ''));
        if (item.sourceUrl) assert.match(item.sourceUrl, /^https:\/\//);
    });
});

test('every sample is stamped as a reference sample, never renamed', () => {
    const ctx = stubContext();
    const item = {
        number: 12, provider: 'SAP', credential: 'openSAP AI Record of Achievement',
        status: 'sample', statusLabel: 'Sample only — not a certificate document',
        sourceUrl: 'https://example.com/sap'
    };
    const size = C.renderSize('a4', 'portrait', 120);
    const result = C.drawSamplePage(ctx, { width: 400, height: 263 }, item, size);

    const printed = ctx.calls.filter((call) => call.name === 'fillText').map((call) => String(call.args[0]));
    assert.equal(printed.filter((value) => value === C.SAMPLE_STAMP).length, 1, 'the sample page must carry the reference stamp');
    assert.ok(printed.includes('SAP'), 'the original provider is kept in the caption');
    assert.ok(printed.includes('openSAP AI Record of Achievement'), 'the original credential is kept in the caption');
    assert.ok(printed.includes('Sample #12'), 'the caption keeps the sample number');
    assert.ok(!printed.some((value) => /zacheus/i.test(value)), 'nobody is renamed onto a third-party sample');
    assert.ok(result.imageRect.width > 0 && result.imageRect.height > 0);
    // the stamp is rotated, so it is drawn inside a save/translate/rotate block
    const names = ctx.calls.map((call) => call.name);
    assert.ok(names.includes('rotate'), 'the stamp should be drawn at an angle');
});

// ---------------------------------------------------------- 2. layout maths

test('slugify and file names stay filesystem safe', () => {
    assert.equal(C.slugify('Zacheus Simbaya'), 'Zacheus-Simbaya');
    assert.equal(C.slugify('  AI & Automation!! '), 'AI-Automation');
    assert.equal(C.slugify('///', 'fallback'), 'fallback');
    assert.equal(C.pdfFileName('Zacheus Simbaya'), 'Zacheus-Simbaya-Seedwel-Certificates.pdf');
    assert.equal(C.pdfFileName('', 'AI-Certificate-Reference-Library'), 'AI-Certificate-Reference-Library.pdf');
    assert.equal(C.pdfFileName('Zacheus Simbaya', 'x', 'png'), 'x.png');
});

test('dates and certificate ids are stable and readable', () => {
    assert.equal(C.formatIssueDate('2026-08-27'), '27 August 2026');
    assert.equal(C.formatIssueDate('2026-12-01'), '1 December 2026');
    assert.equal(C.formatIssueDate('nonsense'), 'nonsense');
    assert.equal(C.todayInputValue(new Date(2026, 7, 27)), '2026-08-27');

    const first = C.certificateId('zacheus|ai', new Date(2026, 7, 27));
    const second = C.certificateId('zacheus|ai', new Date(2026, 7, 27));
    const other = C.certificateId('somebody|else', new Date(2026, 7, 27));
    assert.match(first, /^SEED-2026-[A-Z0-9]{4}$/);
    assert.equal(first, second, 'the same seed produces the same id');
    assert.notEqual(first, other, 'different recipients get different ids');
});

test('pageFit fills the sheet and keeps the caption space', () => {
    const wide = C.pageFit(640, 420, { format: 'a4', marginMm: 12, reserveBottomMm: 26 });
    assert.equal(wide.orientation, 'landscape');
    assert.equal(wide.pageWidth, 297);
    assert.equal(wide.pageHeight, 210);
    assert.ok(wide.width <= 297 - 24 + 0.01, 'image must fit inside the margins');
    assert.ok(wide.height <= 210 - 24 - 26 + 0.01, 'image must not overlap the caption band');

    const tall = C.pageFit(420, 640, { format: 'a4', marginMm: 10 });
    assert.equal(tall.orientation, 'portrait');
    assert.ok(tall.width <= 190.01 && tall.height <= 277.01);

    const forced = C.pageFit(640, 420, { orientation: 'portrait', marginMm: 12, reserveBottomMm: 26 });
    assert.equal(forced.orientation, 'portrait', 'the caller can force portrait for the catalogue');
    assert.equal(forced.pageWidth, 210);
});

test('samplePagePlan keeps the image clear of the caption', () => {
    const plan = C.samplePagePlan({ number: 3, provider: 'AWS', credential: 'ML', status: 'verified', statusLabel: 'Verified', sourceUrl: 'https://x.test' }, 640, 420);
    assert.equal(plan.pageWidth, 210);
    assert.equal(plan.pageHeight, 297);
    assert.ok(plan.image.y + plan.image.height <= plan.caption.y, 'image bottom ' + (plan.image.y + plan.image.height) + ' must be above the caption at ' + plan.caption.y);
    assert.equal(plan.stamp.text, C.SAMPLE_STAMP);
    assert.ok(plan.stamp.size > 8 && plan.stamp.size < 60, 'stamp size stays printable: ' + plan.stamp.size);
    assert.equal(plan.caption.numberLabel, 'Sample #3');
});

test('fitFontByWidth shrinks until the text fits', () => {
    const sizes = [];
    const size = C.fitFontByWidth((text, px) => {
        sizes.push(px);
        return text.length * px * 0.5;
    }, 'REFERENCE SAMPLE — NOT A CREDENTIAL', 100, 40, 4);

    assert.ok(size < 40, 'the long stamp must shrink below the starting size');
    assert.ok(size >= 4, 'it must not shrink past the floor');
    assert.ok(sizes.length > 1, 'it should measure more than once');
    assert.ok(sizes.every((value, index) => index === 0 || value <= sizes[index - 1]), 'sizes only ever step down');
});

test('wrapText respects the width and the line cap', () => {
    const ctx = stubContext(0.5);
    ctx.font = C.fontString('400', 10, 'Inter');
    const lines = C.wrapText(ctx, 'one two three four five six seven eight nine ten', 40, 2);
    assert.equal(lines.length, 2);
    assert.ok(lines[1].endsWith('…'), 'the clipped line ends with an ellipsis');

    const single = C.wrapText(ctx, 'short', 400, 3);
    assert.deepEqual(single, ['short']);
});

test('manifest payloads are normalised and filterable', () => {
    const manifest = C.normaliseManifest({
        items: [
            { number: 2, provider: 'B', credential: 'x', status: 'sample', statusLabel: 's', image: 'b.webp', slug: 'b', sourceUrl: 'javascript:alert(1)' },
            { number: 1, provider: 'A', credential: 'y', status: 'verified', statusLabel: 'v', image: 'a.webp', slug: 'a', sourceUrl: 'https://ok.test' },
            null
        ]
    });
    assert.equal(manifest.total, 2);
    assert.deepEqual(manifest.items.map((item) => item.number), [1, 2], 'items are sorted by number');
    assert.equal(manifest.items[1].sourceUrl, '', 'non-http source urls are dropped');
    assert.deepEqual(C.filterItems(manifest.items, 'a', 'all').map((i) => i.provider), ['A']);
    assert.deepEqual(C.filterItems(manifest.items, '', 'verified').map((i) => i.provider), ['A']);
});

// --------------------------------------------------- 3. the drawn certificate

test('drawCertificate renders the recipient, course, id and signer', () => {
    const size = C.renderSize('a4', 'landscape', 200);
    const ctx = stubContext();
    const data = {
        recipient: 'Zacheus Simbaya',
        course: 'AI & Automation Fundamentals',
        awardType: 'Certificate of Completion',
        description: 'Completed the supervised practical programme.',
        issuedOn: '2026-08-27',
        certificateId: 'SEED-2026-ABCD',
        signerName: 'Zacheus Simbaya',
        signerRole: 'Founder & Lead Digital Strategist',
        company: 'SEEDWEL INVESTMENT LTD',
        verifyUrl: 'seedwel.ltd/verify',
        accent: '#dc2626',
        nameStyle: 'script'
    };

    C.drawCertificate(ctx, data, size, { width: 1024, height: 1024 });

    assert.equal(ctx.calls.filter((call) => call.name === 'drawImage').length, 1, 'the logo is placed once');
    assert.ok(ctx.text('AI & Automation Fundamentals').length === 1, 'the course is printed');
    assert.ok(ctx.text('SEED-2026-ABCD').length >= 1, 'the certificate id is printed');
    assert.ok(ctx.text('27 August 2026').length === 1, 'the issue date is printed in full');
    assert.ok(ctx.text('Founder & Lead Digital Strategist').length === 1, 'the signer role is printed');
    assert.ok(ctx.text('This is to certify that').length === 1);

    // the recipient name is drawn letter by letter by drawTracked, so join it back up
    const nameCalls = ctx.calls.filter((call) => call.name === 'fillText' && /^.$/.test(String(call.args[0])));
    assert.ok(nameCalls.length > 20, 'the tracked name is drawn');
});

test('a very long recipient name shrinks instead of overflowing', () => {
    const size = C.renderSize('a4', 'landscape', 200);
    const shortName = stubContext();
    const longName = stubContext();

    C.drawCertificate(shortName, { recipient: 'Zacheus Simbaya', course: 'AI', issuedOn: '2026-08-27', certificateId: 'X', signerName: 'S', signerRole: 'R' }, size);
    C.drawCertificate(longName, { recipient: 'Bartholomew Constantino Mwelape-Simbaya The Third Of Lusaka North', course: 'AI', issuedOn: '2026-08-27', certificateId: 'X', signerName: 'S', signerRole: 'R' }, size);

    const nameFont = (ctx) => {
        const fonts = ctx.calls.filter((call) => call.name === 'fillText').map((call) => call.font);
        const script = fonts.filter((font) => /Great Vibes/.test(font));
        return parseFloat(/(\d+(?:\.\d+)?)px/.exec(script[0])[1]);
    };

    assert.ok(nameFont(longName) < nameFont(shortName), 'long names are rendered smaller');
    assert.ok(nameFont(longName) >= 20, 'and never below a readable floor');
});

test('cover pages print the bundle details', () => {
    const ctx = stubContext();
    C.drawCoverPage(ctx, {
        eyebrow: 'Seedwel Investment LTD',
        title: 'AI Certificate Reference Library',
        subtitle: 'Third-party samples',
        lines: ['Prepared for::Zacheus Simbaya', 'Samples::167'],
        note: 'Every page is stamped.',
        footer: 'seedwel.ltd'
    }, C.renderSize('a4', 'portrait', 120));

    const printed = ctx.calls.filter((call) => call.name === 'fillText').map((call) => String(call.args[0])).join(' ');
    assert.ok(/AI Certificate Reference Library/.test(printed.replace(/\s+/g, ' ')), 'the title is printed (wrapped if needed)');
    assert.ok(ctx.text('Zacheus Simbaya').length === 1, 'the "label::value" split prints the value');
    assert.ok(ctx.text('167').length === 1);
    assert.ok(ctx.text('Every page is stamped.').length === 1);
    assert.ok(ctx.text('seedwel.ltd').length === 1, 'the footer is printed');
});

test('uploaded certificates get a caption only when one is written', () => {
    const plain = C.ownedPagePlan({ label: '', meta: '' }, 800, 600);
    assert.equal(plain.captionMm, 0, 'no caption band when there is nothing to say');
    assert.equal(plain.orientation, 'landscape', 'a wide certificate gets a landscape page');
    assert.ok(plain.image.height <= plain.pageHeight - 2 * plain.margin + 0.01);

    const labelled = C.ownedPagePlan({ label: 'OpenAI Academy — Prompt Engineering', meta: 'Issued 2026-05-02 · ID 4vjheebp7n' }, 800, 600);
    assert.equal(labelled.captionMm, 20);
    assert.ok(labelled.image.y + labelled.image.height <= labelled.caption.y, 'the page must not overlap its caption');
    assert.equal(labelled.caption.label, 'OpenAI Academy — Prompt Engineering');

    const tall = C.ownedPagePlan({ label: 'x' }, 600, 800);
    assert.equal(tall.orientation, 'portrait', 'a tall certificate gets a portrait page');
});

test('an uploaded certificate page is reproduced, never stamped', () => {
    const ctx = stubContext();
    const entry = { label: 'Harvard CS50 AI', meta: 'Issued 2026-05-02', width: 800, height: 600 };
    const size = C.renderSize('a4', 'landscape', 150);
    C.drawOwnedPage(ctx, { width: 800, height: 600 }, entry, size);

    assert.equal(ctx.calls.filter((call) => call.name === 'drawImage').length, 1, 'the original file is drawn once');
    assert.equal(ctx.text(C.SAMPLE_STAMP).length, 0, 'no reference stamp on your own certificates');
    assert.ok(ctx.text('Harvard CS50 AI').length === 1, 'the caption prints below the image');
    assert.ok(ctx.text('Issued 2026-05-02').length === 1);
    assert.ok(!ctx.calls.some((call) => call.name === 'rotate'), 'nothing is drawn over the certificate at an angle');
});

// ------------------------------------------------------------ 4. PDF assembly

test('the shipped page descriptors build a real PDF with jsPDF', async (t) => {
    const jsPDF = loadPdfLibrary();
    if (!jsPDF) { t.skip('jspdf is not installed (npm install)'); return; }

    globalThis.jsPDF = jsPDF;
    const studio = require(path.join(ROOT, 'assets/js/admin-certificates.js'));

    // a real 8x6 JPEG (generated with ImageMagick) so jsPDF has something to embed
    const tinyJpeg = 'data:image/jpeg;base64,' + [
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkI',
        'CQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQ',
        'EBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAAGAAgD',
        'AREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAU',
        'AQEAAAAAAAAAAAAAAAAAAAAG/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AQgrGn//Z'
    ].join('');

    const item = {
        number: 7, provider: 'AWS', credential: 'Machine Learning certificate', status: 'verified',
        statusLabel: 'Verified certificate document', sourceUrl: 'https://aws.example/cert'
    };

    const page = studio.samplePageDescriptor(item, tinyJpeg, 640, 420);
    assert.equal(page.orientation, 'portrait');
    assert.deepEqual(page.format, [210, 297]);

    const blob = studio.buildPdf([page, page], { title: 'Reference library' });
    const bytes = Buffer.from(await blob.arrayBuffer());

    assert.equal(bytes.slice(0, 5).toString('latin1'), '%PDF-', 'the output is a PDF');
    assert.ok(bytes.length > 1000, 'the PDF has content (' + bytes.length + ' bytes)');

    const raw = bytes.toString('latin1');
    assert.equal((raw.match(/\/Type \/Page[^s]/g) || []).length, 2, 'one page per sample');

    let stamped = false;
    for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
        try {
            if (/REFERENCE SAMPLE/.test(zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'))) stamped = true;
        } catch (_) { /* not every stream is flated */ }
    }
    assert.ok(stamped, 'the reference stamp is written into the PDF content');
});

test('buildPdf refuses an empty bundle', () => {
    const jsPDF = loadPdfLibrary();
    if (!jsPDF) return;
    globalThis.jsPDF = jsPDF;
    const studio = require(path.join(ROOT, 'assets/js/admin-certificates.js'));
    assert.throws(() => studio.buildPdf([]), /nothing to put in the PDF/i);
});

// -------------------------------------------------- 4b. real raster rendering

function loadCanvasLibrary() {
    try { return require('@napi-rs/canvas'); }
    catch (_) { return null; }
}

test('the certificate template renders real pixels', async (t) => {
    const canvasLib = loadCanvasLibrary();
    if (!canvasLib) { t.skip('@napi-rs/canvas is not installed (npm i --no-save @napi-rs/canvas)'); return; }

    const size = C.renderSize('a4', 'landscape', 200);
    const canvas = canvasLib.createCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d');

    C.drawCertificate(ctx, {
        recipient: 'Zacheus Simbaya',
        course: 'AI & Automation Fundamentals',
        awardType: 'Certificate of Completion',
        description: 'Completed the supervised practical programme, including the final assessment.',
        issuedOn: '2026-08-27',
        certificateId: 'SEED-2026-QK41',
        signerName: 'Zacheus Simbaya',
        signerRole: 'Founder & Lead Digital Strategist',
        company: 'SEEDWEL INVESTMENT LTD',
        verifyUrl: 'seedwel.ltd/verify',
        accent: '#dc2626',
        nameStyle: 'script'
    }, size, null);

    const { data, width, height } = ctx.getImageData(0, 0, size.width, size.height);
    const pixel = (x, y) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
    };

    // paper is white, the frame is the brand accent
    const centre = pixel(Math.round(width / 2), Math.round(height * 0.32));
    assert.ok(centre[0] > 230 && centre[1] > 230 && centre[2] > 230, 'the sheet is white paper');

    const frameY = Math.round(width * 0.026);
    let accentPixels = 0;
    for (let x = frameY + 20; x < width - frameY - 20; x += 3) {
        const [r, g, b] = pixel(x, frameY);
        if (r > 170 && g < 100 && b < 100) accentPixels += 1;
    }
    assert.ok(accentPixels > 100, 'the accent frame runs across the top (' + accentPixels + ' accent samples)');

    // ink where the name and course sit
    let inkPixels = 0;
    for (let y = Math.round(height * 0.42); y < Math.round(height * 0.6); y += 2) {
        for (let x = Math.round(width * 0.2); x < Math.round(width * 0.8); x += 4) {
            const [r, g, b] = pixel(x, y);
            if (r < 120 && g < 120 && b < 120) inkPixels += 1;
        }
    }
    assert.ok(inkPixels > 200, 'the recipient and course are printed as dark ink (' + inkPixels + ' ink samples)');

    // and it encodes to a real image file
    const png = canvas.toBuffer('image/png');
    assert.ok(png.length > 20000, 'the rendered certificate encodes to a usable PNG (' + png.length + ' bytes)');
    fs.writeFileSync(path.join(os.tmpdir(), 'seedwel-certificate-preview.png'), png);
});

test('a real sample image is laid out on a stamped page', async (t) => {
    const canvasLib = loadCanvasLibrary();
    if (!canvasLib) { t.skip('@napi-rs/canvas is not installed (npm i --no-save @napi-rs/canvas)'); return; }

    const manifest = JSON.parse(fs.readFileSync(path.join(CERT_DIR, 'manifest.json'), 'utf8'));
    const item = manifest.items[0];
    const image = await canvasLib.loadImage(path.join(CERT_DIR, item.image));

    const size = C.renderSize('a4', 'portrait', 120);
    const canvas = canvasLib.createCanvas(size.width, size.height);
    const result = C.drawSamplePage(canvas.getContext('2d'), image, item, size);

    assert.ok(result.imageRect.width > size.width * 0.7, 'the sample fills the page width');
    assert.ok(result.imageRect.y + result.imageRect.height < size.height, 'the sample stays on the page');

    const png = canvas.toBuffer('image/png');
    assert.ok(png.length > 15000, 'the stamped page encodes (' + png.length + ' bytes)');
    fs.writeFileSync(path.join(os.tmpdir(), 'seedwel-sample-preview.png'), png);
});

test('rasterised pages assemble into a real PDF through the shipped helpers', async (t) => {
    const canvasLib = loadCanvasLibrary();
    const jsPDF = loadPdfLibrary();
    if (!canvasLib || !jsPDF) { t.skip('@napi-rs/canvas or jspdf is not installed'); return; }

    globalThis.jsPDF = jsPDF;
    const studio = require(path.join(ROOT, 'assets/js/admin-certificates.js'));

    const size = C.renderSize('a4', 'landscape', 150);
    const canvas = canvasLib.createCanvas(size.width, size.height);
    C.drawCertificate(canvas.getContext('2d'), {
        recipient: 'Zacheus Simbaya',
        course: 'AI & Automation Fundamentals',
        awardType: 'Certificate of Completion',
        issuedOn: '2026-08-27',
        certificateId: 'SEED-2026-QK41',
        signerName: 'Zacheus Simbaya',
        signerRole: 'Founder & Lead Digital Strategist',
        company: 'SEEDWEL INVESTMENT LTD'
    }, size, null);

    const page = studio.canvasPage(canvas, 'a4', 'landscape');
    assert.deepEqual(page.format, [297, 210]);
    assert.equal(page.orientation, 'landscape');

    const blob = studio.buildPdf([page], { title: 'Zacheus Simbaya — Seedwel certificate' });
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.slice(0, 5).toString('latin1'), '%PDF-');
    assert.ok(bytes.length > 40000, 'the certificate PDF carries the raster (' + bytes.length + ' bytes)');
    assert.equal((bytes.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length, 1);
    fs.writeFileSync(path.join(os.tmpdir(), 'seedwel-certificate.pdf'), bytes);
});

// ------------------------------------------------------------- 5. end to end

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

function startStaticServer() {
    const server = http.createServer((request, response) => {
        const urlPath = decodeURIComponent(request.url.split('?')[0]);
        let file = path.join(ROOT, urlPath);
        if (urlPath.endsWith('/')) file = path.join(file, 'index.html');
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            response.writeHead(404); response.end('not found'); return;
        }
        response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        response.end(fs.readFileSync(file));
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    });
}

async function waitForFile(dir, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 20000);
    while (Date.now() < deadline) {
        const files = fs.readdirSync(dir).filter((name) => !name.endsWith('.crdownload'));
        if (files.length) return path.join(dir, files[0]);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return null;
}

function clearDir(dir) {
    fs.readdirSync(dir).forEach((name) => fs.rmSync(path.join(dir, name), { force: true }));
}

function pdfPageCount(file) {
    const raw = fs.readFileSync(file).toString('latin1');
    return (raw.match(/\/Type \/Page[^s]/g) || []).length;
}

test('the admin page renders, issues a certificate and downloads PDFs', async (t) => {
    const browser = await launchHeadlessBrowser();
    if (!browser) {
        t.skip('no headless Chrome can start here (npm i --no-save puppeteer-core @sparticuz/chromium)');
        return;
    }

    const { server, port } = await startStaticServer();
    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seedwel-certs-'));

    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        await page.setViewport({ width: 1440, height: 1000 });

        // The sandbox cannot reach gstatic/fonts.googleapis, so external requests are
        // aborted: the page must work from the files in this repository alone.
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            if (url.startsWith('http://127.0.0.1:' + port)) request.continue();
            else request.abort();
        });

        const client = await page.createCDPSession();
        await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir, eventsEnabled: true });

        await page.goto('http://127.0.0.1:' + port + '/admin/certificates.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('#libraryGrid .cert-card', { timeout: 30000 });

        // With no network the Firebase SDK never loads, so the shared admin shim is
        // unavailable and the studio initialises itself. Assert that is what happened.
        assert.equal(await page.evaluate(() => typeof window.SeedwelAdminShared), 'undefined');

        // the reference library loaded from the real manifest
        const cardCount = await page.$$eval('#libraryGrid .cert-card', (cards) => cards.length);
        assert.equal(cardCount, 167, 'all 167 samples are listed');

        const noticeTotal = await page.$eval('#libraryTotal', (el) => el.textContent);
        assert.equal(noticeTotal, '167');

        // the certificate preview really painted something
        const preview = await page.evaluate(() => {
            const canvas = document.getElementById('certPreview');
            const ctx = canvas.getContext('2d');
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const colours = new Set();
            let accent = 0;
            for (let i = 0; i < data.length; i += 4 * 97) {
                colours.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
                if (data[i] > 180 && data[i + 1] < 90 && data[i + 2] < 90) accent += 1;
            }
            return { width: canvas.width, height: canvas.height, colours: colours.size, accent, meta: document.getElementById('certPreviewMeta').textContent };
        });
        assert.ok(preview.width > 800, 'the preview is rendered at page resolution');
        assert.ok(preview.colours > 5, 'the preview is not a blank canvas (' + preview.colours + ' colours)');
        assert.ok(preview.accent > 0, 'the brand accent is drawn');
        assert.match(preview.meta, /SEED-2026-[A-Z0-9]{4}/);

        // the recipient defaults to Zacheus Simbaya
        assert.equal(await page.$eval('#certRecipient', (el) => el.value), 'Zacheus Simbaya');

        // save to the issued list, then download everything as one PDF
        await page.click('#saveIssuedBtn');
        await page.waitForFunction(() => document.getElementById('issuedCount').textContent === '1');
        assert.equal(await page.$eval('#issuedList .issued-item .issued-id', (el) => el.textContent).then((v) => /^SEED-\d{4}-/.test(v)), true);

        await page.click('#downloadIssuedPdfBtn');
        const issuedPdf = await waitForFile(downloadDir);
        assert.ok(issuedPdf, 'the combined certificate PDF was downloaded');
        assert.match(path.basename(issuedPdf), /^Zacheus-Simbaya-Seedwel-Certificates\.pdf$/);
        assert.equal(pdfPageCount(issuedPdf), 2, 'cover page + one certificate');

        // single certificate PDF
        clearDir(downloadDir);
        await page.click('#downloadPdfBtn');
        const singlePdf = await waitForFile(downloadDir);
        assert.ok(singlePdf, 'the single certificate PDF was downloaded');
        assert.equal(pdfPageCount(singlePdf), 1);

        // reference library: select two samples and bundle them
        await page.click('.cert-tab[data-tab="library"]');
        await page.waitForFunction(() => document.getElementById('libraryPanel').hidden === false);
        const boxes = await page.$$('#libraryGrid .cert-card input[data-role="pick"]');
        await boxes[0].click();
        await boxes[1].click();
        assert.equal(await page.$eval('#librarySelectedCount', (el) => el.textContent), '2');

        clearDir(downloadDir);
        await page.click('#libraryDownloadSelected');
        await page.waitForFunction(() => document.getElementById('workProgress').hidden === true, { timeout: 60000 });
        const libraryPdf = await waitForFile(downloadDir);
        assert.ok(libraryPdf, 'the reference bundle was downloaded');
        assert.match(path.basename(libraryPdf), /^AI-Certificate-Reference-Library-2-samples\.pdf$/);
        assert.equal(pdfPageCount(libraryPdf), 3, 'cover page + two samples');

        const libraryRaw = fs.readFileSync(libraryPdf).toString('latin1');
        let stamped = false;
        for (const match of libraryRaw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
            try {
                if (/REFERENCE SAMPLE/.test(zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'))) stamped = true;
            } catch (_) { /* skip non-flated streams */ }
        }
        assert.ok(stamped, 'bundled samples keep the reference stamp');

        // my certificates: upload two real image files and bundle them
        await page.click('.cert-tab[data-tab="mine"]');
        await page.waitForFunction(() => document.getElementById('minePanel').hidden === false);
        assert.equal(await page.$eval('#ownedHolder', (el) => el.value), 'Zacheus Simbaya');

        const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seedwel-upload-'));
        const uploads = ['first.png', 'second.png'].map((name, index) => {
            const file = path.join(uploadDir, name);
            fs.writeFileSync(file, makeTestPng(800, 600, index ? [255, 240, 220] : [220, 235, 255]));
            return file;
        });
        await (await page.$('#ownedFiles')).uploadFile(uploads[0], uploads[1]);
        await page.waitForFunction(() => document.querySelectorAll('#ownedList .owned-item').length === 2, { timeout: 20000 });
        assert.equal(await page.$eval('#ownedCount', (el) => el.textContent), '2');
        assert.equal(await page.$eval('#ownedDownloadPdf', (el) => el.disabled), false);

        // a label prints under the page, never over the certificate
        await page.type('#ownedList .owned-item input[data-role="label"]', 'OpenAI Academy Prompt Engineering');

        clearDir(downloadDir);
        await page.click('#ownedDownloadPdf');
        await page.waitForFunction(() => document.getElementById('workProgress').hidden === true, { timeout: 60000 });
        const ownedPdf = await waitForFile(downloadDir);
        assert.ok(ownedPdf, 'the certificate pack was downloaded');
        assert.match(path.basename(ownedPdf), /^Zacheus-Simbaya-Certificates\.pdf$/);
        assert.equal(pdfPageCount(ownedPdf), 3, 'cover page + two uploaded certificates');

        const ownedRaw = fs.readFileSync(ownedPdf).toString('latin1');
        let captioned = false;
        let stampLeaked = false;
        for (const match of ownedRaw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
            try {
                const text = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
                if (/OpenAI Academy Prompt Engineering/.test(text)) captioned = true;
                if (/REFERENCE SAMPLE/.test(text)) stampLeaked = true;
            } catch (_) { /* skip non-flated streams */ }
        }
        assert.ok(captioned, 'the label you type is printed on the page');
        assert.ok(!stampLeaked, 'your own certificates are never stamped as samples');
        fs.rmSync(uploadDir, { recursive: true, force: true });

        // search narrows the grid
        await page.type('#librarySearch', 'openai');
        await page.waitForFunction(() => document.querySelectorAll('#libraryGrid .cert-card').length < 167);
        const filtered = await page.$$eval('#libraryGrid .cert-card h3', (nodes) => nodes.map((node) => node.textContent));
        assert.ok(filtered.length > 0 && filtered.every((name) => /openai/i.test(name)), 'search matches the provider');

        // "Firebase is not loaded" comes from admin-shared.js when gstatic is blocked;
        // everything else must be clean.
        const unexpected = errors.filter((message) => !/Firebase is not loaded/.test(message));
        assert.deepEqual(unexpected, [], 'the page threw no unexpected JavaScript errors');
    } finally {
        if (browser) await browser.close();
        server.close();
        fs.rmSync(downloadDir, { recursive: true, force: true });
    }
});
