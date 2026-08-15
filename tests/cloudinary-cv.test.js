'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLOUDINARY_URL = 'cloudinary://test-key:test-secret@test-cloud';

const signatureHandler = require('../api/cloudinary-signature');
const downloadHandler = require('../api/cloudinary-download');
const { ROOT_FOLDER, safeFileName } = require('../api/_cloudinary');

function invokeSignature(body, headers = {}) {
    const req = {
        method: 'POST',
        body,
        headers: {
            host: 'seedwel.ltd',
            origin: 'https://seedwel.ltd',
            'x-forwarded-for': '192.0.2.10',
            ...headers
        },
        socket: { remoteAddress: '192.0.2.10' }
    };
    let statusCode = 200;
    const responseHeaders = new Map();
    const res = {
        setHeader(name, value) { responseHeaders.set(String(name).toLowerCase(), value); },
        status(value) { statusCode = value; return this; },
        json(payload) { return { statusCode, headers: responseHeaders, payload }; }
    };
    return signatureHandler(req, res);
}

function invokeDownload(body) {
    const req = {
        method: 'POST',
        body,
        headers: {
            host: 'seedwel.ltd',
            origin: 'https://seedwel.ltd',
            authorization: 'Bearer valid-test-token'
        },
        socket: { remoteAddress: '192.0.2.20' }
    };
    let statusCode = 200;
    const res = {
        setHeader() {},
        status(value) { statusCode = value; return this; },
        json(payload) { return { statusCode, payload }; }
    };
    return downloadHandler(req, res);
}

test('CV signature uploads an authenticated raw asset into the portfolio folder', async () => {
    const response = await invokeSignature({
        kind: 'cv',
        fileName: 'Zacheus Resume.pdf',
        fileSize: 245_000,
        mimeType: 'application/pdf',
        ownerName: 'Zacheus Simbaya'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.assetFolder, ROOT_FOLDER);
    assert.equal(response.payload.signedParams.asset_folder, 'portfolio');
    assert.equal(response.payload.signedParams.type, 'authenticated');
    assert.equal(response.payload.resourceType, 'raw');
    assert.match(response.payload.signedParams.public_id, /^portfolio\/job-applications\/zacheus-simbaya-\d+-[a-f0-9]+\.pdf$/);
    assert.equal(response.payload.signedParams.filename_override, 'Zacheus Resume.pdf');
    assert.ok(response.payload.signature);
    assert.ok(response.payload.cleanupToken);
});

test('generic browser MIME is resolved from a valid DOCX extension', async () => {
    const response = await invokeSignature({
        kind: 'cv',
        fileName: 'candidate.docx',
        fileSize: 98_000,
        mimeType: 'application/octet-stream',
        ownerName: 'Candidate'
    }, { 'x-forwarded-for': '192.0.2.11' });

    assert.equal(response.statusCode, 200);
    assert.match(response.payload.signedParams.public_id, /\.docx$/);
});

test('administrator receives a short-lived authenticated download URL for a managed CV', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: true,
        async json() {
            return {
                users: [{
                    localId: 'admin-uid',
                    email: 'zacheussimbaya@gmail.com',
                    emailVerified: true
                }]
            };
        }
    });

    try {
        const response = await invokeDownload({
            publicId: 'portfolio/job-applications/candidate-123.pdf',
            fileName: 'Candidate Resume.pdf',
            format: 'pdf'
        });
        assert.equal(response.statusCode, 200);
        assert.match(response.payload.url, /^https:\/\/api\.cloudinary\.com\/v1_1\/test-cloud\/raw\/download\?/);
        const url = new URL(response.payload.url);
        assert.equal(url.searchParams.get('public_id'), 'portfolio/job-applications/candidate-123.pdf');
        assert.equal(url.searchParams.get('format'), 'pdf');
        assert.equal(url.searchParams.get('type'), 'authenticated');
        assert.equal(url.searchParams.get('attachment'), 'true');
        assert.ok(Number(response.payload.expiresAt) > Math.floor(Date.now() / 1000));
    } finally {
        global.fetch = originalFetch;
    }
});

test('unsupported CV extensions are rejected before an upload signature is issued', async () => {
    const response = await invokeSignature({
        kind: 'cv',
        fileName: 'resume.exe',
        fileSize: 50_000,
        mimeType: 'application/pdf',
        ownerName: 'Candidate'
    }, { 'x-forwarded-for': '192.0.2.12' });

    assert.equal(response.statusCode, 400);
    assert.match(response.payload.error, /filename must end in \.pdf, \.doc or \.docx/i);
    assert.equal(response.payload.signature, undefined);
});

test('Cloudinary filename metadata strips paths and control characters while preserving extension', () => {
    assert.equal(safeFileName('../private\\bad\n resume.pdf'), 'private bad resume.pdf');
    const veryLong = 'a'.repeat(250) + '.docx';
    const safe = safeFileName(veryLong, 'upload', 200);
    assert.equal(safe.length, 200);
    assert.match(safe, /\.docx$/);
});
