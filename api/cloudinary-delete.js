'use strict';

const { v2: cloudinary } = require('cloudinary');
const {
    applyCloudinaryConfig,
    getBody,
    isManagedPublicId,
    json,
    requireUser,
    sameOriginRequest,
    validCleanupToken
} = require('./_cloudinary');

const policies = {
    portfolio: { resourceType: 'image', deliveryType: 'upload', adminOnly: true },
    profile: { resourceType: 'image', deliveryType: 'upload', adminOnly: false },
    cv: { resourceType: 'raw', deliveryType: 'authenticated', adminOnly: true },
    document: { resourceType: 'raw', deliveryType: 'authenticated', adminOnly: true }
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(res, 405, { error: 'Method not allowed.' });
    }
    if (!sameOriginRequest(req)) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });

    try {
        const body = getBody(req);
        const kind = String(body.kind || '');
        const publicId = String(body.publicId || '');
        const policy = policies[kind];
        if (!policy || !publicId) return json(res, 400, { error: 'A managed Cloudinary asset is required.' });

        const { apiSecret } = applyCloudinaryConfig();
        const cleanupAllowed = kind === 'cv' && validCleanupToken(
            apiSecret,
            body.cleanupToken,
            kind,
            publicId,
            policy.resourceType,
            policy.deliveryType
        );

        let user = null;
        if (!cleanupAllowed) user = await requireUser(req, policy.adminOnly);
        if (!isManagedPublicId(publicId, kind, user && user.uid)) {
            return json(res, 403, { error: 'That asset is outside the managed Seedwel upload folders.' });
        }

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: policy.resourceType,
            type: policy.deliveryType,
            invalidate: true
        });
        return json(res, 200, { result: result && result.result ? result.result : 'ok' });
    } catch (error) {
        console.error('Cloudinary delete error:', error && error.message ? error.message : error);
        return json(res, error.statusCode || 500, { error: error.message || 'Could not remove the uploaded file.' });
    }
};
