(function (global) {
    'use strict';

    function errorMessage(data, fallback) {
        return data && typeof data.error === 'string' ? data.error : fallback;
    }

    async function apiRequest(path, body, user) {
        const headers = { 'Content-Type': 'application/json' };
        if (user) headers.Authorization = 'Bearer ' + await user.getIdToken();
        const response = await fetch(path, {
            method: 'POST',
            credentials: 'same-origin',
            headers,
            body: JSON.stringify(body || {})
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(errorMessage(data, 'The upload service is unavailable. Please try again.'));
            error.status = response.status;
            error.code = data && data.code ? String(data.code) : '';
            throw error;
        }
        return data;
    }

    async function upload(file, options) {
        options = options || {};
        if (!file) throw new Error('Choose a file to upload.');

        const config = await apiRequest('/api/cloudinary-signature', {
            kind: options.kind,
            fileName: file.name || 'upload',
            fileSize: file.size,
            mimeType: file.type,
            ownerName: options.ownerName || ''
        }, options.user || null);

        if (file.size > Number(config.maxBytes || 0)) throw new Error('The selected file exceeds the upload limit.');
        if (!config.cloudName) throw new Error('The upload service is not configured yet. Please contact an administrator.');

        const form = new FormData();
        form.append('file', file);

        if (config.uploadPreset) {
            form.append('upload_preset', String(config.uploadPreset));
        } else {
            Object.keys(config.signedParams || {}).forEach(function (key) {
                form.append(key, String(config.signedParams[key]));
            });
            form.append('api_key', String(config.apiKey));
            form.append('signature', String(config.signature));
        }

        const result = await new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(config.cloudName) + '/' + encodeURIComponent(config.resourceType) + '/upload');
            xhr.responseType = 'json';
            xhr.upload.addEventListener('progress', function (event) {
                if (event.lengthComputable && typeof options.onProgress === 'function') {
                    options.onProgress(Math.round((event.loaded / event.total) * 100));
                }
            });
            xhr.addEventListener('load', function () {
                const response = xhr.response || {};
                if (xhr.status >= 200 && xhr.status < 300) resolve(response);
                else reject(new Error((response.error && response.error.message) || 'Cloudinary could not upload this file.'));
            });
            xhr.addEventListener('error', function () { reject(new Error('The Cloudinary upload was interrupted. Check your connection and try again.')); });
            xhr.addEventListener('abort', function () { reject(new Error('The upload was cancelled.')); });
            xhr.send(form);
        });

        if (!result.secure_url || !result.public_id) throw new Error('Cloudinary returned an incomplete upload response.');
        return {
            url: String(result.secure_url),
            publicId: String(result.public_id),
            assetFolder: String(result.asset_folder || config.assetFolder || (config.signedParams && config.signedParams.asset_folder) || ''),
            resourceType: String(result.resource_type || config.resourceType),
            deliveryType: String(result.type || (config.signedParams && config.signedParams.type) || 'upload'),
            bytes: Number(result.bytes || file.size || 0),
            format: String(result.format || file.name.split('.').pop() || '').toLowerCase(),
            version: Number(result.version || 0),
            originalFileName: String(file.name || 'upload').slice(0, 200),
            cleanupToken: String(config.cleanupToken || '')
        };
    }

    async function remove(options) {
        options = options || {};
        if (!options.publicId) return { result: 'not found' };
        return apiRequest('/api/cloudinary-delete', {
            kind: options.kind,
            publicId: options.publicId,
            cleanupToken: options.cleanupToken || ''
        }, options.user || null);
    }

    async function privateCvUrl(options) {
        options = options || {};
        return apiRequest('/api/cloudinary-download', {
            publicId: options.publicId,
            fileName: options.fileName,
            format: options.format
        }, options.user);
    }

    global.SeedwelCloudinary = Object.freeze({ upload: upload, remove: remove, privateCvUrl: privateCvUrl });
})(window);
