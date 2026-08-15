'use strict';

const { v2: cloudinary } = require('cloudinary');
const {
    applyCloudinaryConfig,
    getBody,
    isManagedPublicId,
    json,
    requireUser,
    safeExtension,
    sameOriginRequest
} = require('./_cloudinary');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(res, 405, { error: 'Method not allowed.' });
    }
    if (!sameOriginRequest(req)) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });

    try {
        await requireUser(req, true);
        const body = getBody(req);
        const publicId = String(body.publicId || '');
        const fileName = String(body.fileName || 'cv').slice(0, 200);
        if (!isManagedPublicId(publicId, 'cv')) return json(res, 403, { error: 'That CV is outside the managed upload folder.' });

        applyCloudinaryConfig();
        const format = String(body.format || safeExtension(fileName) || safeExtension(publicId)).toLowerCase();
        if (!['pdf', 'doc', 'docx'].includes(format)) return json(res, 400, { error: 'Unsupported CV format.' });

        const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
        const url = cloudinary.utils.private_download_url(publicId, format, {
            resource_type: 'raw',
            type: 'authenticated',
            expires_at: expiresAt,
            attachment: true
        });
        return json(res, 200, { url, expiresAt });
    } catch (error) {
        console.error('Cloudinary download error:', error && error.message ? error.message : error);
        return json(res, error.statusCode || 500, { error: error.message || 'Could not prepare the private CV download.' });
    }
};
