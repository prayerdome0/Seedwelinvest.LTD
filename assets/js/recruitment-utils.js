(function (global) {
    'use strict';

    var STATUS_META = Object.freeze({
        pending: { label: 'Pending', className: 'pending' },
        under_review: { label: 'Under Review', className: 'under_review' },
        shortlisted: { label: 'Shortlisted', className: 'shortlisted' },
        approved: { label: 'Approved', className: 'approved' },
        rejected: { label: 'Rejected', className: 'rejected' },
        registration_sent: { label: 'Registration Sent', className: 'registration_sent' },
        registered: { label: 'Registered', className: 'registered' },
        active: { label: 'Active', className: 'active' }
    });

    var POSITION_DEPARTMENTS = Object.freeze({
        'Web Developer': 'Technology',
        'Mobile App Developer': 'Technology',
        'Graphic Designer': 'Creative',
        'Video Editor': 'Creative',
        'Digital Marketer': 'Marketing',
        'Cold Caller': 'Sales',
        'Virtual Assistant': 'Operations',
        'Online Tutor': 'Education'
    });

    function safeText(value, maxLength) {
        var text = String(value == null ? '' : value)
            .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return typeof maxLength === 'number' && maxLength > 0 ? text.slice(0, maxLength) : text;
    }

    function escapeHtml(value) {
        return safeText(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function formatDate(timestamp) {
        var value = Number(timestamp || 0);
        if (!value) return '—';
        return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateTime(timestamp) {
        var value = Number(timestamp || 0);
        if (!value) return '—';
        return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function mapLegacyStatus(status) {
        switch (String(status || '').toLowerCase()) {
            case 'new':
            case 'application_started':
            case 'submitted':
            case 'pending':
                return 'pending';
            case 'reviewing':
            case 'interview':
            case 'under_review':
            case 'info_required':
                return 'under_review';
            case 'shortlisted':
                return 'shortlisted';
            case 'approved':
                return 'approved';
            case 'registration_sent':
            case 'pending_registration':
                return 'registration_sent';
            case 'registered':
                return 'registered';
            case 'active':
            case 'active_worker':
            case 'worker_id_generated':
            case 'job_assigned':
            case 'completed':
            case 'hired':
                return 'active';
            case 'rejected':
            case 'revoked':
                return 'rejected';
            default:
                return 'pending';
        }
    }

    function deriveApplicationStatus(application, invitation, worker) {
        var raw = mapLegacyStatus(application && application.status);
        if (raw === 'rejected') return 'rejected';
        if (worker && String(worker.status || '').toLowerCase() === 'active') return 'active';
        if (invitation) {
            var inviteStatus = String(invitation.status || '').toLowerCase();
            if (inviteStatus === 'registered' || inviteStatus === 'used') return 'registered';
            if (inviteStatus === 'pending') return raw === 'approved' ? 'approved' : 'registration_sent';
        }
        return raw;
    }

    function statusMeta(status) {
        return STATUS_META[status] || { label: safeText(status || 'Pending') || 'Pending', className: safeText(status || 'pending').toLowerCase() || 'pending' };
    }

    function statusBadge(status) {
        var meta = statusMeta(status);
        return '<span class="status-badge ' + escapeHtml(meta.className) + '">' + escapeHtml(meta.label) + '</span>';
    }

    function normalizeKey(value) {
        return safeText(value, 200).toLowerCase();
    }

    function findInvitationForApplication(invitations, applicationId) {
        var matches = Object.entries(invitations || {}).filter(function (entry) {
            return String((entry[1] && entry[1].applicationId) || '') === String(applicationId || '');
        }).sort(function (a, b) {
            var left = a[1] || {};
            var right = b[1] || {};
            var leftPriority = String(left.status || '') === 'pending' ? 0 : String(left.status || '') === 'registered' ? 1 : 2;
            var rightPriority = String(right.status || '') === 'pending' ? 0 : String(right.status || '') === 'registered' ? 1 : 2;
            if (leftPriority !== rightPriority) return leftPriority - rightPriority;
            return Number(right.createdAt || 0) - Number(left.createdAt || 0);
        });
        if (!matches.length) return null;
        return { key: matches[0][0], value: matches[0][1] || {} };
    }

    function findWorkerForApplication(workers, application, invitation) {
        var workerEntries = Object.entries(workers || {});
        var email = normalizeKey(application && application.email);
        var invitationToken = invitation && invitation.key ? String(invitation.key) : '';
        for (var i = 0; i < workerEntries.length; i += 1) {
            var uid = workerEntries[i][0];
            var worker = workerEntries[i][1] || {};
            if (invitationToken && String(worker.invitationToken || '') === invitationToken) return { uid: uid, value: worker };
            if (email && normalizeKey(worker.email) === email) return { uid: uid, value: worker };
        }
        return null;
    }

    function randomToken() {
        var bytes = new Uint8Array(24);
        global.crypto.getRandomValues(bytes);
        return Array.prototype.map.call(bytes, function (value) {
            return value.toString(16).padStart(2, '0');
        }).join('');
    }

    async function copyText(text) {
        var value = String(text || '');
        if (!value) return false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
        var area = document.createElement('textarea');
        area.value = value;
        area.setAttribute('readonly', 'readonly');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
        document.body.removeChild(area);
        return ok;
    }

    function queryParam(name) {
        return new URLSearchParams(global.location.search).get(name) || '';
    }

    function hashParam(name) {
        var hash = String(global.location.hash || '').replace(/^#/, '');
        if (!hash) return '';
        if (hash.indexOf('=') === -1 && name === 'token') return hash;
        return new URLSearchParams(hash).get(name) || '';
    }

    function defaultDepartment(position) {
        return POSITION_DEPARTMENTS[safeText(position, 120)] || 'Operations';
    }

    function createMemberCode(sequence, date) {
        var year = (date || new Date()).getFullYear();
        return 'SW-' + year + '-' + String(Number(sequence || 0)).padStart(4, '0');
    }

    function nowPlusDays(days) {
        return Date.now() + Number(days || 7) * 24 * 60 * 60 * 1000;
    }

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            var args = arguments;
            clearTimeout(timer);
            timer = global.setTimeout(function () { fn.apply(null, args); }, wait || 180);
        };
    }

    async function getSnapshotMap(ref) {
        var snapshot = await ref.once('value');
        return snapshot.val() || {};
    }

    function safeHttpUrl(value) {
        try {
            var url = new URL(String(value || ''));
            return /^https?:$/i.test(url.protocol) ? url.href : '';
        } catch (_) {
            return '';
        }
    }

    async function recordAudit(db, action, target, detail) {
        var entry = {
            action: safeText(action, 80),
            target: safeText(target, 200),
            detail: safeText(detail, 500),
            actor: (global.SeedwelFirebase && global.SeedwelFirebase.adminEmail) || '',
            at: global.firebase.database.ServerValue.TIMESTAMP
        };
        await db.ref('auditLog').push(entry);
    }

    global.SeedwelRecruitment = Object.freeze({
        STATUS_META: STATUS_META,
        createMemberCode: createMemberCode,
        copyText: copyText,
        debounce: debounce,
        defaultDepartment: defaultDepartment,
        deriveApplicationStatus: deriveApplicationStatus,
        escapeHtml: escapeHtml,
        findInvitationForApplication: findInvitationForApplication,
        findWorkerForApplication: findWorkerForApplication,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        getSnapshotMap: getSnapshotMap,
        hashParam: hashParam,
        mapLegacyStatus: mapLegacyStatus,
        nowPlusDays: nowPlusDays,
        queryParam: queryParam,
        randomToken: randomToken,
        recordAudit: recordAudit,
        safeHttpUrl: safeHttpUrl,
        safeText: safeText,
        statusBadge: statusBadge,
        statusMeta: statusMeta
    });
})(window);
