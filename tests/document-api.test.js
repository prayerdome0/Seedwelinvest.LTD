'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLOUDINARY_URL = 'cloudinary://test-key:test-secret@test-cloud';

const signatureHandler = require('../api/cloudinary-signature');
const documentHandler = require('../api/cloudinary-document');

function makeRes() {
    let statusCode = 200;
    const res = {
        setHeader() {},
        status(value) { statusCode = value; return this; },
        json(payload) { return { statusCode, payload }; }
    };
    return res;
}

function invokeDocument(body, headers = {}) {
    const req = {
        method: 'POST',
        body,
        headers: {
            host: 'seedwel.ltd',
            origin: 'https://seedwel.ltd',
            authorization: 'Bearer worker-id-token',
            ...headers
        },
        socket: { remoteAddress: '192.0.2.30' }
    };
    return documentHandler(req, makeRes());
}

async function invokeSignature(body, headers = {}) {
    const req = {
        method: 'POST',
        body,
        headers: {
            host: 'seedwel.ltd',
            origin: 'https://seedwel.ltd',
            authorization: 'Bearer admin-id-token',
            ...headers
        },
        socket: { remoteAddress: '192.0.2.31' }
    };
    return signatureHandler(req, makeRes());
}

function stubFetch(identityUser, documentResponse) {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
        calls.push(String(url));
        if (String(url).startsWith('https://identitytoolkit.googleapis.com/')) {
            return { ok: Boolean(identityUser), status: identityUser ? 200 : 401, json: async () => ({ users: identityUser ? [identityUser] : [] }) };
        }
        if (String(url).includes('/documents/')) {
            if (typeof documentResponse === 'number') {
                return { ok: false, status: documentResponse, json: async () => ({ error: 'Permission denied' }) };
            }
            return { ok: true, status: 200, json: async () => documentResponse };
        }
        return { ok: false, status: 404, json: async () => ({}) };
    };
    return {
        restore() { global.fetch = originalFetch; },
        calls
    };
}

const WORKER = { localId: 'worker-uid', email: 'assistant@example.com', emailVerified: true };
const ADMIN = { localId: 'admin-uid', email: 'zacheussimbaya@gmail.com', emailVerified: false };

const DOC_RECORD = {
    title: 'VA Onboarding Guide',
    fileName: 'VA_Onboarding_Guide.pdf',
    cloudinaryPublicId: 'seedwel/worker-documents/virtual-assistant/va_onboarding_guide-1700000000-abc123.pdf',
    format: 'pdf',
    fileSize: 340_000,
    status: 'published',
    roles: { 'Virtual Assistant': true }
};

test('document signature places admin uploads in a role-scoped authenticated folder', async () => {
    const fetchStub = stubFetch(ADMIN, null);
    try {
        const response = await invokeSignature({
            kind: 'document',
            fileName: 'VA_Onboarding_Guide.pdf',
            fileSize: 340_000,
            mimeType: 'application/pdf',
            ownerName: 'Virtual Assistant'
        });
        assert.equal(response.statusCode, 200);
        assert.equal(response.payload.resourceType, 'raw');
        assert.equal(response.payload.signedParams.type, 'authenticated');
        assert.match(response.payload.signedParams.public_id, /^seedwel\/worker-documents\/virtual-assistant\/va-onboarding-guide-\d+-[a-f0-9]+\.pdf$/);
        assert.equal(response.payload.signedParams.filename_override, 'VA_Onboarding_Guide.pdf');
        assert.ok(response.payload.signature);
    } finally {
        fetchStub.restore();
    }
});

test('document signatures require an administrator account', async () => {
    const fetchStub = stubFetch(WORKER, null);
    try {
        const response = await invokeSignature({
            kind: 'document',
            fileName: 'guide.pdf',
            fileSize: 1000,
            mimeType: 'application/pdf',
            ownerName: 'Virtual Assistant'
        });
        assert.equal(response.statusCode, 403);
        assert.match(response.payload.error, /administrator/i);
    } finally {
        fetchStub.restore();
    }
});

test('a worker with an allowed role receives a short-lived signed document URL', async () => {
    const fetchStub = stubFetch(WORKER, DOC_RECORD);
    try {
        const response = await invokeDocument({ documentId: '-doc-001' });
        assert.equal(response.statusCode, 200);
        assert.match(response.payload.url, /^https:\/\/api\.cloudinary\.com\/v1_1\/test-cloud\/raw\/download\?/);
        const url = new URL(response.payload.url);
        assert.equal(url.searchParams.get('public_id'), DOC_RECORD.cloudinaryPublicId);
        assert.equal(url.searchParams.get('format'), 'pdf');
        assert.equal(url.searchParams.get('type'), 'authenticated');
        assert.equal(url.searchParams.get('attachment'), 'true');
        assert.ok(Number(response.payload.expiresAt) > Math.floor(Date.now() / 1000));
        // The visibility check must be made with the worker's own ID token.
        const dbCall = fetchStub.calls.find((call) => call.includes('/documents/'));
        assert.ok(dbCall, 'database read performed');
        assert.match(dbCall, /\/documents\/-doc-001\.json\?auth=worker-id-token$/);
    } finally {
        fetchStub.restore();
    }
});

test('a worker is refused when the Database Rules deny the document', async () => {
    const fetchStub = stubFetch(WORKER, 401);
    try {
        const response = await invokeDocument({ documentId: '-doc-002' });
        assert.equal(response.statusCode, 403);
        assert.match(response.payload.error, /not available for your account/i);
        assert.equal(response.payload.url, undefined);
    } finally {
        fetchStub.restore();
    }
});

test('missing or removed documents return a clear 404', async () => {
    const fetchStub = stubFetch(WORKER, null);
    try {
        const response = await invokeDocument({ documentId: '-doc-gone' });
        assert.equal(response.statusCode, 404);
    } finally {
        fetchStub.restore();
    }
});

test('documents outside the managed seedwel folder are refused', async () => {
    const fetchStub = stubFetch(ADMIN, Object.assign({}, DOC_RECORD, {
        cloudinaryPublicId: 'portfolio/job-applications/someone-else.pdf'
    }));
    try {
        const response = await invokeDocument({ documentId: '-doc-003' });
        assert.equal(response.statusCode, 403);
    } finally {
        fetchStub.restore();
    }
});

test('malformed document ids are rejected before any lookup', async () => {
    const fetchStub = stubFetch(WORKER, DOC_RECORD);
    try {
        const response = await invokeDocument({ documentId: '../documents' });
        assert.equal(response.statusCode, 400);
        // Identity is verified first, but no document record may be looked up.
        assert.equal(fetchStub.calls.filter((call) => call.includes('/documents/')).length, 0);
    } finally {
        fetchStub.restore();
    }
});
