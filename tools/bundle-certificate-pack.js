#!/usr/bin/env node
'use strict';

/**
 * Headless builder for the combined certificate pack:
 *
 *   page 1      — Seedwel's OWN certificate (same template/drawing code as
 *                 tools/issue-certificate.js and the admin studio),
 *   page 2      — the reference-library cover, prepared for the recipient,
 *   pages 3..N  — every sample in assets/certificates (the AI-Certificates-Share
 *                 collection), reproduced EXACTLY as shipped: untouched image,
 *                 rotated "reference sample" stamp and a caption carrying the
 *                 provider, credential, public source URL and status.
 *
 * The third-party samples are never edited and never re-issued in anyone's
 * name — the pack only records who it was prepared for. This runs the exact
 * same drawing code the admin studio uses in the browser
 * (assets/js/certificate-utils.js + the studio's sample page descriptors)
 * against a Node canvas, then assembles everything with the same jsPDF.
 *
 * Setup (canvas + fonts are tooling-only, kept out of package.json):
 *   npm i --no-save @napi-rs/canvas @fontsource/great-vibes @fontsource/montserrat \
 *       @fontsource/playfair-display @fontsource/inter jspdf
 *
 * Usage:
 *   node tools/bundle-certificate-pack.js [--recipient "Zacheus Simbaya"]
 *        [--course "..."] [--date 2026-08-27] [--out path/to/file.pdf]
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
        console.error('Missing @napi-rs/canvas. Run:\n  npm i --no-save @napi-rs/canvas @fontsource/great-vibes @fontsource/montserrat @fontsource/playfair-display @fontsource/inter jspdf');
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

/** Builds a single PDF from page descriptors (same contract as the admin studio). */
function buildPdf(jsPDF, pages, properties) {
    if (!pages.length) throw new Error('There is nothing to put in the PDF yet.');
    const doc = new jsPDF({
        orientation: pages[0].orientation,
        unit: 'mm',
        format: pages[0].format,
        compress: true
    });

    pages.forEach(function (page, index) {
        if (index > 0) doc.addPage(page.format, page.orientation);
        page.render(doc);
    });

    if (properties) {
        doc.setProperties(Object.assign({ creator: 'Seedwel admin certificate studio' }, properties));
    }
    return doc;
}

/** Full-bleed page from an already-rendered canvas (certificates, cover pages). */
function canvasPage(canvas, format, orientation, quality) {
    const dims = C.PAGE_SIZES[format] ? C.PAGE_SIZES[format] : C.PAGE_SIZES.a4;
    const size = orientation === 'portrait' ? dims.portrait : dims.landscape;
    const dataUrl = 'data:image/jpeg;base64,' + canvas.toBuffer('image/jpeg', { quality: quality === undefined ? 0.92 : quality }).toString('base64');
    return {
        format: [size[0], size[1]],
        orientation: orientation === 'portrait' ? 'portrait' : 'landscape',
        render: function (doc) {
            doc.addImage(dataUrl, 'JPEG', 0, 0, size[0], size[1], undefined, 'FAST');
        }
    };
}

/**
 * One reference-library page: the untouched sample image, a rotated
 * "reference sample" stamp and a caption. Same descriptor the admin studio's
 * combined PDF uses, so the bundled pages match the on-screen preview.
 */
function samplePageDescriptor(item, imageDataUrl, imageWidth, imageHeight) {
    const plan = C.samplePagePlan(item, imageWidth, imageHeight, { orientation: 'portrait' });
    const MM_TO_PT = 72 / 25.4;

    return {
        format: [plan.pageWidth, plan.pageHeight],
        orientation: 'portrait',
        render: function (doc) {
            doc.addImage(imageDataUrl, 'JPEG', plan.image.x, plan.image.y, plan.image.width, plan.image.height, undefined, 'FAST');

            // stamp (jsPDF angles are counter-clockwise, canvas angles are clockwise)
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38);
            const stampPt = C.fitFontByWidth(function (value, pt) {
                doc.setFontSize(pt);
                return doc.getTextWidth(value);
            }, plan.stamp.text, plan.image.width * 0.92, plan.stamp.size * MM_TO_PT, 10);
            doc.setFontSize(stampPt);
            const hasGState = typeof doc.setGState === 'function' && typeof doc.GState === 'function';
            if (hasGState) doc.setGState(new doc.GState({ opacity: 0.45 }));
            doc.text(plan.stamp.text, plan.stamp.x, plan.stamp.y, { align: 'center', angle: -plan.stamp.angle });
            if (hasGState) doc.setGState(new doc.GState({ opacity: 1 }));

            // caption
            const caption = plan.caption;
            const rightX = plan.pageWidth - plan.margin;
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.3);
            doc.line(caption.x, caption.y - 3, rightX, caption.y - 3);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(17, 24, 39);
            doc.text(caption.provider, caption.x, caption.y + 5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128);
            doc.text(caption.credential, caption.x, caption.y + 11);
            doc.text(caption.source, caption.x, caption.y + 16.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            if (caption.status === 'verified') doc.setTextColor(22, 101, 52);
            else doc.setTextColor(146, 64, 14);
            doc.text(caption.statusLabel, rightX, caption.y + 5, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(107, 114, 128);
            doc.text(caption.numberLabel, rightX, caption.y + 11, { align: 'right' });
        }
    };
}

async function main() {
    const canvasLib = loadCanvasLib();
    const fonts = registerFonts(canvasLib);
    const { jsPDF } = require('jspdf');

    const recipient = arg('recipient', 'Zacheus Simbaya');
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'certificates', 'manifest.json'), 'utf8'));
    const counts = manifest.counts;
    const total = manifest.total;
    const today = C.todayInputValue(new Date());
    const stampDate = C.formatIssueDate(today);

    // ------------------------------------------------------------ page 1: Seedwel certificate (unchanged template)
    const certData = {
        recipient,
        course: arg('course', 'AI & Automation Fundamentals'),
        awardType: 'Certificate of Completion',
        description: 'Completed the supervised practical programme, including the final assessment.',
        issuedOn: arg('date', today),
        signerName: recipient,
        signerRole: 'Founder & Lead Digital Strategist',
        company: 'SEEDWEL INVESTMENT LTD',
        verifyUrl: 'seedwel.ltd/verify',
        accent: '#dc2626',
        nameStyle: 'script'
    };
    certData.certificateId = C.certificateId(certData.recipient + ' | ' + certData.course + ' | ' + certData.issuedOn);

    const certSize = C.renderSize('a4', 'landscape', 150);
    const certCanvas = canvasLib.createCanvas(certSize.width, certSize.height);
    let logo = null;
    const logoPath = path.join(ROOT, 'seedwel.png');
    if (fs.existsSync(logoPath)) logo = await canvasLib.loadImage(logoPath);
    C.drawCertificate(certCanvas.getContext('2d'), certData, certSize, logo);

    // -------------------------------------------- page 2: reference library cover, prepared for the recipient
    const coverSize = C.renderSize('a4', 'portrait', 150);
    const coverCanvas = canvasLib.createCanvas(coverSize.width, coverSize.height);
    C.drawCoverPage(coverCanvas.getContext('2d'), {
        eyebrow: certData.company + ' · Reference library',
        title: 'AI Certificate Reference Library',
        subtitle: 'Sample images showing what AI credentials from ' + total + ' providers look like. Nothing in this pack was issued by Seedwel.',
        lines: [
            'Prepared for::' + recipient,
            'Samples::' + total + ' (' + counts.verified + ' full certificate documents, ' + counts.sample + ' badge or credential samples)',
            'Generated::' + stampDate
        ],
        note: 'Every page keeps the original provider details and is stamped "Reference sample — not a credential". These images must not be presented as certificates held by anyone at Seedwel.',
        footer: 'Seedwel Investment LTD · seedwel.ltd'
    }, coverSize);

    const pages = [
        canvasPage(certCanvas, 'a4', 'landscape'),
        canvasPage(coverCanvas, 'a4', 'portrait')
    ];

    // --------------------------------------- pages 3..N: every sample in the collection, untouched
    for (let index = 0; index < manifest.items.length; index += 1) {
        const item = manifest.items[index];
        const imagePath = path.join(ROOT, 'assets', 'certificates', item.image);
        const image = await canvasLib.loadImage(imagePath);

        const raster = canvasLib.createCanvas(image.width, image.height);
        raster.getContext('2d').drawImage(image, 0, 0);
        const dataUrl = 'data:image/jpeg;base64,' + raster.toBuffer('image/jpeg', { quality: 0.92 }).toString('base64');

        pages.push(samplePageDescriptor(item, dataUrl, image.width, image.height));
        if ((index + 1) % 25 === 0) console.log('rendered ' + (index + 1) + '/' + manifest.items.length + ' — ' + item.provider);
    }

    const doc = buildPdf(jsPDF, pages, {
        title: 'Certificate of Completion — ' + recipient + ' + AI Certificate Reference Library',
        author: certData.company,
        subject: 'Seedwel certificate for ' + recipient + ' with ' + total + ' third-party AI credential reference samples'
    });

    const outPath = path.resolve(arg('out', path.join(ROOT, C.pdfFileName(recipient))));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));

    console.log('bundled ' + outPath);
    console.log('  pages: ' + pages.length + ' (certificate + cover + ' + manifest.items.length + ' samples), ' + fonts + ' webfont file(s) loaded, ID ' + certData.certificateId);
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
