'use strict';

const { v2: cloudinary } = require('cloudinary');
const {
    ROOT_FOLDER,
    applyCloudinaryConfig,
    cleanupToken,
    getBody,
    json,
    randomId,
    requireUser,
    safeExtension,
    safeFileName,
    safeSegment,
    sameOriginRequest
} = require('./_cloudinary');

const uploadLimits = {
    portfolio: { maxBytes: 25 * 1024 * 1024, resourceType: 'image', deliveryType: 'upload' },
    profile: { maxBytes: 5 * 1024 * 1024, resourceType: 'image', deliveryType: 'upload' },
    cv: { maxBytes: 5 * 1024 * 1024, resourceType: 'raw', deliveryType: 'authenticated' }
};

const publicCvRequests = new Map();
function allowPublicCvRequest(req) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const entry = publicCvRequests.get(ip);
    if (!entry || now - entry.startedAt > windowMs) {
        publicCvRequests.set(ip, { startedAt: now, count: 1 });
        return true;
    }
    entry.count += 1;
    return entry.count <= 10;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(res, 405, { error: 'Method not allowed.' });
    }
    if (!sameOriginRequest(req)) return json(res, 403, { error: 'Cross-origin upload requests are not allowed.' });

    try {
        const body = getBody(req);
        const kind = String(body.kind || '');
        const policy = uploadLimits[kind];
        if (!policy) return json(res, 400, { error: 'Unknown upload type.' });

        let user = null;
        if (kind === 'portfolio') user = await requireUser(req, true);
        if (kind === 'profile') user = await requireUser(req, false);
        if (kind === 'cv' && !allowPublicCvRequest(req)) {
            return json(res, 429, { error: 'Too many upload attempts. Please wait a few minutes and try again.' });
        }

        const suppliedFileName = String(body.fileName || '').trim();
        const originalName = safeFileName(suppliedFileName, 'upload', 200);
        let mimeType = String(body.mimeType || '').toLowerCase().split(';')[0].trim().slice(0, 100);
        mimeType = {
            'application/x-pdf': 'application/pdf',
            'application/vnd.ms-word': 'application/msword'
        }[mimeType] || mimeType;
        const extensionHint = safeExtension(originalName);
        // Browsers on some phones and Windows installations report Office files
        // as a generic binary stream. In that case, use the separately validated
        // extension rather than rejecting an otherwise valid CV before upload.
        if (!mimeType || mimeType === 'application/octet-stream') {
            mimeType = {
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
                pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }[extensionHint] || '';
        }
        const size = Number(body.fileSize);
        if (!suppliedFileName || !Number.isFinite(size) || size <= 0 || size > policy.maxBytes) {
            return json(res, 400, { error: 'The selected file is missing or exceeds the allowed size.' });
        }

        if ((kind === 'portfolio' || kind === 'profile') && !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(mimeType)) {
            return json(res, 400, { error: 'Choose a supported image file.' });
        }
        if (kind === 'profile' && !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
            return json(res, 400, { error: 'Profile photos must be JPG, PNG or WEBP.' });
        }
        if (kind === 'cv' && !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType)) {
            return json(res, 400, { error: 'CV files must be PDF, DOC or DOCX.' });
        }

        // Throws a 503 with an actionable message when the Vercel project has no
        // Cloudinary credentials, instead of returning an unusable signature.
        const { cloudName, apiKey, apiSecret } = applyCloudinaryConfig();

        const timestamp = Math.floor(Date.now() / 1000);
        let publicId;
        if (kind === 'portfolio') {
            const title = safeSegment(body.ownerName, 'project', 50);
            publicId = ROOT_FOLDER + '/projects/' + title + '-' + timestamp + '-' + randomId();
        } else if (kind === 'profile') {
            publicId = ROOT_FOLDER + '/profile-pictures/' + user.uid;
        } else {
            const extension = safeExtension(originalName);
            if (!['pdf', 'doc', 'docx'].includes(extension)) {
                return json(res, 400, { error: 'The CV filename must end in .pdf, .doc or .docx.' });
            }
            const applicant = safeSegment(body.ownerName, 'applicant', 50);
            publicId = ROOT_FOLDER + '/job-applications/' + applicant + '-' + timestamp + '-' + randomId() + '.' + extension;
        }

        const signedParams = {
            // `asset_folder` places uploads in the visible portfolio folder for
            // Cloudinary environments using dynamic folders. The portfolio/
            // prefix in public_id provides the equivalent placement in legacy
            // fixed-folder environments and keeps deletion checks scoped.
            asset_folder: ROOT_FOLDER,
            invalidate: true,
            overwrite: kind === 'profile',
            public_id: publicId,
            timestamp,
            type: policy.deliveryType
        };
        // Keep the stable profile public ID on one predictable image format, and
        // preserve an applicant's sanitised original CV filename as asset metadata.
        if (kind === 'profile') signedParams.format = 'jpg';
        if (kind === 'cv') signedParams.filename_override = originalName;
        const signature = cloudinary.utils.api_sign_request(signedParams, apiSecret);

        return json(res, 200, {
            cloudName,
            apiKey,
            signature,
            signedParams,
            assetFolder: ROOT_FOLDER,
            resourceType: policy.resourceType,
            maxBytes: policy.maxBytes,
            cleanupToken: cleanupToken(apiSecret, kind, publicId, policy.resourceType, policy.deliveryType)
        });
    } catch (error) {
        console.error('Cloudinary signature error:', error && error.message ? error.message : error);
        return json(res, error.statusCode || 500, {
            error: error.message || 'Could not prepare the upload.',
            code: error.code || undefined
        });
    }
};
