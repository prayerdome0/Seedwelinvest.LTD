'use strict';

const crypto = require('node:crypto');
const { v2: cloudinary } = require('cloudinary');

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyA-BpRy-RVc2rqIG6uiRu_XrGEu1ZGnQwU';
const ADMIN_EMAIL = 'zacheussimbaya@gmail.com';
const ROOT_FOLDER = 'seedwel-investment-ltd';

function applyCloudinaryConfig() {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (process.env.CLOUDINARY_URL) {
        try {
            const parsed = new URL(process.env.CLOUDINARY_URL);
            if (parsed.protocol !== 'cloudinary:') throw new Error('Unexpected Cloudinary URL protocol.');
            cloudName = decodeURIComponent(parsed.hostname);
            apiKey = decodeURIComponent(parsed.username);
            apiSecret = decodeURIComponent(parsed.password);
        } catch (_) {
            throw new Error('CLOUDINARY_URL is not valid. Reconnect the Cloudinary integration in Vercel.');
        }
    }

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary is not configured. Connect the existing Cloudinary product environment to this Vercel project.');
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    return { cloudName, apiKey, apiSecret };
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
        email: String(user.email || '').toLowerCase(),
        emailVerified: Boolean(user.emailVerified)
    };
}

async function requireUser(req, adminOnly) {
    const user = await verifyFirebaseUser(req);
    if (adminOnly && (user.email !== ADMIN_EMAIL || !user.emailVerified)) {
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
    if (kind === 'portfolio') return value.startsWith(ROOT_FOLDER + '/portfolio/');
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
    requireUser,
    safeExtension,
    safeSegment,
    sameOriginRequest,
    validCleanupToken
};
