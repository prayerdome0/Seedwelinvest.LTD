'use strict';

const { v2: cloudinary } = require('cloudinary');
const {
    DOCUMENT_ROOT_FOLDER,
    FIREBASE_DATABASE_URL,
    applyCloudinaryConfig,
    bearerToken,
    getBody,
    json,
    requireUser,
    safeExtension,
    sameOriginRequest
} = require('./_cloudinary');

/**
 * Secure download endpoint for admin-published worker documents.
 *
 * Documents are stored in Cloudinary with `authenticated` delivery, so they are
 * never reachable through publicly guessable URLs. Access is decided by the
 * deployed Firebase Realtime Database Rules: this handler re-reads the
 * `/documents/{id}` record with the REQUESTING USER'S OWN ID token, so the
 * read only succeeds when the rules allow it — for the administrator, or for a
 * signed-in worker whose role is listed on a published document. If the rules
 * deny the read, this API denies the download. Only then is a short-lived
 * signed Cloudinary download URL generated.
 */
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(res, 405, { error: 'Method not allowed.' });
    }
    if (!sameOriginRequest(req)) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });

    try {
        // Any signed-in user may reach this point; the Database Rules decide
        // below whether this particular document is theirs to open.
        const user = await requireUser(req, false);

        const body = getBody(req);
        const documentId = String(body.documentId || '').trim();
        if (!documentId || !/^[A-Za-z0-9_-]{1,80}$/.test(documentId)) {
            return json(res, 400, { error: 'A valid document is required.' });
        }

        // Authoritative permission check + metadata read, performed with the
        // user's own token against the Realtime Database REST API.
        const idToken = bearerToken(req);
        const dbUrl = FIREBASE_DATABASE_URL + '/documents/' + encodeURIComponent(documentId) + '.json?auth=' + encodeURIComponent(idToken);
        const dbResponse = await fetch(dbUrl, { headers: { Accept: 'application/json' } });
        if (dbResponse.status === 401 || dbResponse.status === 403) {
            return json(res, 403, { error: 'This document is not available for your account.' });
        }
        if (!dbResponse.ok) {
            return json(res, 502, { error: 'The document service is temporarily unavailable. Please try again.' });
        }
        const record = await dbResponse.json().catch(() => null);
        if (!record || typeof record !== 'object') {
            return json(res, 404, { error: 'This document is no longer available.' });
        }

        const publicId = String(record.cloudinaryPublicId || '');
        if (!publicId.startsWith(DOCUMENT_ROOT_FOLDER + '/worker-documents/')) {
            return json(res, 403, { error: 'That document is outside the managed Seedwel folders.' });
        }
        const format = String(record.format || safeExtension(record.fileName || '') || safeExtension(publicId)).toLowerCase();
        if (!['pdf', 'doc', 'docx'].includes(format)) {
            return json(res, 400, { error: 'Unsupported document format.' });
        }

        applyCloudinaryConfig();
        const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
        const url = cloudinary.utils.private_download_url(publicId, format, {
            resource_type: 'raw',
            type: 'authenticated',
            expires_at: expiresAt,
            attachment: true
        });
        return json(res, 200, {
            url,
            expiresAt,
            fileName: String(record.fileName || 'document').slice(0, 200)
        });
    } catch (error) {
        console.error('Cloudinary document download error:', error && error.message ? error.message : error);
        return json(res, error.statusCode || 500, {
            error: error.message || 'Could not prepare the document download.',
            code: error.code || undefined
        });
    }
};
