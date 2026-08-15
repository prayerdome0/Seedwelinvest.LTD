'use strict';

const crypto = require('node:crypto');

// The Cloudinary SDK parses `process.env.CLOUDINARY_URL` while it is being
// required and throws immediately when the value is not a real
// `cloudinary://` URL. A placeholder or half-connected integration variable
// would therefore crash the whole serverless function at import time and
// surface as an opaque 500 to visitors. Quarantine an unusable value before
// the SDK ever sees it so the handlers can return a clear, actionable error.
const RAW_CLOUDINARY_URL = process.env.CLOUDINARY_URL;
if (RAW_CLOUDINARY_URL && !/^cloudinary:\/\/[^:@\s/]+:[^@\s/]+@[^\s/?#]+/i.test(String(RAW_CLOUDINARY_URL).trim())) {
    delete process.env.CLOUDINARY_URL;
}

const { v2: cloudinary } = require('cloudinary');

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyA-BpRy-RVc2rqIG6uiRu_XrGEu1ZGnQwU';
const ADMIN_EMAIL = 'zacheussimbaya@gmail.com';
const ROOT_FOLDER = 'portfolio';

/**
 * Trim an environment variable and ignore the placeholder values that get
 * copied out of documentation (for example `<your_api_key>`), so a half-filled
 * Vercel environment is reported as "not configured" instead of silently
 * producing invalid Cloudinary signatures.
 */
const PLACEHOLDER_VALUES = new Set([
    'changeme', 'change_me', 'example', 'null', 'placeholder', 'todo',
    'undefined', 'xxx', 'xxxxx', 'your_api_key', 'your_api_secret',
    'your_cloud_name', 'yourapikey', 'yourapisecret', 'yourcloudname'
]);

function cleanEnv(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return '';
    // Bracketed templates copied from documentation, e.g. `<your_api_key>`.
    if (/^[<[{(].*[>\]})]$/.test(text)) return '';
    // Exact placeholder tokens only, so legitimate values that merely begin
    // with "my" or "example" (a real cloud name such as `mycloud`) are kept.
    if (PLACEHOLDER_VALUES.has(text.toLowerCase())) return '';
    return text;
}

/**
 * Parse the standard `CLOUDINARY_URL` that the Cloudinary/Vercel integration
 * injects: cloudinary://<api_key>:<api_secret>@<cloud_name>
 */
function parseCloudinaryUrl(rawValue) {
    const value = cleanEnv(rawValue);
    if (!value) return null;
    const match = value.match(/^cloudinary:\/\/([^:@\s/]+):([^@\s/]+)@([^\s/?#]+)/i);
    if (!match) return null;
    try {
        const cloudName = decodeURIComponent(match[3]);
        const apiKey = decodeURIComponent(match[1]);
        const apiSecret = decodeURIComponent(match[2]);
        if (!cloudName || !apiKey || !apiSecret) return null;
        return { cloudName, apiKey, apiSecret };
    } catch (_) {
        return null;
    }
}

/**
 * Resolve credentials from `CLOUDINARY_URL` first (what the Vercel integration
 * provides) and fall back to the individual variables, allowing either source
 * to fill in a value the other is missing.
 */
function readCloudinaryEnv() {
    // Use the captured original value: an unusable CLOUDINARY_URL is removed
    // from process.env above so the SDK cannot crash on import.
    const rawUrl = process.env.CLOUDINARY_URL || RAW_CLOUDINARY_URL;
    const parsed = parseCloudinaryUrl(rawUrl);
    const cloudName = (parsed && parsed.cloudName) || cleanEnv(process.env.CLOUDINARY_CLOUD_NAME) || '';
    const apiKey = (parsed && parsed.apiKey) || cleanEnv(process.env.CLOUDINARY_API_KEY) || '';
    const apiSecret = (parsed && parsed.apiSecret) || cleanEnv(process.env.CLOUDINARY_API_SECRET) || '';

    const missing = [];
    if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!apiKey) missing.push('CLOUDINARY_API_KEY');
    if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');

    return {
        cloudName,
        apiKey,
        apiSecret,
        missing,
        usedCloudinaryUrl: Boolean(parsed),
        hasCloudinaryUrlValue: Boolean(cleanEnv(rawUrl)),
        configured: missing.length === 0
    };
}

function cloudinaryConfigError(env) {
    const detail = env.hasCloudinaryUrlValue && !env.usedCloudinaryUrl
        ? 'CLOUDINARY_URL is present but is not a valid cloudinary://api_key:api_secret@cloud_name value.'
        : 'Missing ' + env.missing.join(', ') + '.';
    const error = new Error(
        'The upload service is not configured yet. ' + detail +
        ' An administrator needs to connect the Cloudinary integration in the Vercel project settings and redeploy.'
    );
    error.statusCode = 503;
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    return error;
}

/**
 * Configure the Cloudinary SDK for this invocation. Throws a clear, actionable
 * 503 when credentials are absent instead of failing later with an opaque
 * signature error.
 */
function applyCloudinaryConfig() {
    const env = readCloudinaryEnv();
    if (!env.configured) throw cloudinaryConfigError(env);

    cloudinary.config({
        cloud_name: env.cloudName,
        api_key: env.apiKey,
        api_secret: env.apiSecret,
        secure: true
    });

    return { cloudName: env.cloudName, apiKey: env.apiKey, apiSecret: env.apiSecret };
}

function setApiHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function json(res, status, payload) {
    setApiHeaders(res);
    return res.status(status).json(payload);
}

function getBody(req) {
    if (!req.body) return {};
    if (typeof req.body === 'object') return req.body;
    try { return JSON.parse(req.body); } catch (_) { return {}; }
}

function sameOriginRequest(req) {
    const origin = req.headers.origin;
    if (!origin) return true;
    try {
        const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
        return new URL(origin).host.toLowerCase() === requestHost;
    } catch (_) {
        return false;
    }
}

function bearerToken(req) {
    const value = String(req.headers.authorization || '');
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

async function verifyFirebaseUser(req) {
    const idToken = bearerToken(req);
    if (!idToken) {
        const error = new Error('Sign in again before uploading.');
        error.statusCode = 401;
        throw error;
    }

    const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(FIREBASE_WEB_API_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
    });
    const data = await response.json().catch(() => ({}));
    const user = data && Array.isArray(data.users) ? data.users[0] : null;
    if (!response.ok || !user || !user.localId) {
        const error = new Error('Your session is invalid or has expired. Sign in again.');
        error.statusCode = 401;
        throw error;
    }
    return {
        uid: String(user.localId),
        email: String(user.email || '').toLowerCase()
    };
}

async function requireUser(req, adminOnly) {
    const user = await verifyFirebaseUser(req);
    // Administrator access is granted by the account email alone; email
    // verification is not required.
    if (adminOnly && user.email !== ADMIN_EMAIL) {
        const error = new Error('Administrator access is required.');
        error.statusCode = 403;
        throw error;
    }
    return user;
}

function safeSegment(value, fallback, maxLength = 60) {
    const clean = String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLength);
    return clean || fallback;
}

function safeExtension(fileName) {
    const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]{1,8})$/);
    return match ? match[1] : '';
}

/**
 * Keep applicant-provided filenames useful to administrators without passing
 * path separators or control characters into Cloudinary metadata. Preserve the
 * final extension even when a very long filename must be shortened.
 */
function safeFileName(value, fallback = 'upload', maxLength = 200) {
    const normalised = String(value || '')
        .normalize('NFKC')
        .replace(/[\u0000-\u001f\u007f/\\]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalised) return fallback;

    const extension = safeExtension(normalised);
    const suffix = extension ? '.' + extension : '';
    const rawStem = suffix ? normalised.slice(0, -suffix.length) : normalised;
    const stem = rawStem.replace(/^\.+/, '').trim() || fallback;
    const stemLimit = Math.max(1, maxLength - suffix.length);
    return stem.slice(0, stemLimit).trim() + suffix;
}

function randomId() {
    return crypto.randomBytes(9).toString('hex');
}

function cleanupToken(apiSecret, kind, publicId, resourceType, deliveryType) {
    return crypto
        .createHmac('sha256', apiSecret)
        .update([kind, publicId, resourceType, deliveryType].join(':'))
        .digest('base64url');
}

function validCleanupToken(apiSecret, supplied, kind, publicId, resourceType, deliveryType) {
    if (!supplied) return false;
    const expected = cleanupToken(apiSecret, kind, publicId, resourceType, deliveryType);
    const left = Buffer.from(String(supplied));
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isManagedPublicId(publicId, kind, uid) {
    const value = String(publicId || '');
    // Portfolio images stay permissive: assets created by an earlier unsigned
    // upload preset live outside the managed folder and must remain deletable
    // by the administrator (this path is already admin-only).
    if (kind === 'portfolio') return Boolean(value);
    if (kind === 'cv') return value.startsWith(ROOT_FOLDER + '/job-applications/');
    if (kind === 'profile') return value === ROOT_FOLDER + '/profile-pictures/' + uid;
    return false;
}

module.exports = {
    ADMIN_EMAIL,
    ROOT_FOLDER,
    applyCloudinaryConfig,
    bearerToken,
    cleanupToken,
    getBody,
    isManagedPublicId,
    json,
    randomId,
    readCloudinaryEnv,
    requireUser,
    safeExtension,
    safeFileName,
    safeSegment,
    sameOriginRequest,
    validCleanupToken
};
