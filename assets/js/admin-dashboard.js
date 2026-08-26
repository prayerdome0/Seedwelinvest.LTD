(function () {
    'use strict';

    var utils = window.SeedwelRecruitment;
    var shared = window.SeedwelAdminShared;

    function countOpenTasks(tasks) {
        var total = 0;
        Object.keys(tasks || {}).forEach(function (uid) {
            var workerTasks = tasks[uid] || {};
            Object.keys(workerTasks).forEach(function (taskId) {
                var task = workerTasks[taskId] || {};
                if (String(task.status || 'pending') !== 'completed') total += 1;
            });
        });
        return total;
    }

    function deriveMetrics(applications, invitations, workers, tasks, documents) {
        var applicationEntries = Object.entries(applications || {});
        var counts = {
            applications: applicationEntries.length,
            pendingReviews: 0,
            shortlisted: 0,
            approved: 0,
            pendingRegistrations: 0,
            activeMembers: 0,
            openTasks: countOpenTasks(tasks),
            publishedDocuments: Object.values(documents || {}).filter(function (doc) { return doc && String(doc.status || '') === 'published'; }).length
        };

        var workerEntries = Object.values(workers || {});
        counts.activeMembers = workerEntries.filter(function (worker) { return String(worker.status || '').toLowerCase() === 'active'; }).length;

        applicationEntries.forEach(function (entry) {
            var appId = entry[0];
            var app = entry[1] || {};
            var invitation = utils.findInvitationForApplication(invitations, appId);
            var worker = utils.findWorkerForApplication(workers, app, invitation);
            var state = utils.deriveApplicationStatus(app, invitation && invitation.value, worker && worker.value);
            if (state === 'pending' || state === 'under_review') counts.pendingReviews += 1;
            if (state === 'shortlisted') counts.shortlisted += 1;
            if (state === 'approved' || state === 'registration_sent' || state === 'registered' || state === 'active') counts.approved += 1;
            if (state === 'registration_sent') counts.pendingRegistrations += 1;
        });
        return counts;
    }

    function renderMetrics(counts) {
        var ids = {
            metricApplications: counts.applications,
            metricPending: counts.pendingReviews,
            metricShortlisted: counts.shortlisted,
            metricApproved: counts.approved,
            metricRegistrations: counts.pendingRegistrations,
            metricMembers: counts.activeMembers,
            metricTasks: counts.openTasks,
            metricDocuments: counts.publishedDocuments
        };
        Object.keys(ids).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = String(ids[id]);
        });
    }

    function renderRecentApplications(applications, invitations, workers) {
        var list = document.getElementById('recentApplications');
        if (!list) return;
        var entries = Object.entries(applications || {}).sort(function (a, b) {
            return Number((b[1] && b[1].submittedAt) || 0) - Number((a[1] && a[1].submittedAt) || 0);
        }).slice(0, 6);
        list.innerHTML = '';
        if (!entries.length) {
            list.innerHTML = '<div class="empty-state">No applications yet.</div>';
            return;
        }
        entries.forEach(function (entry) {
            var appId = entry[0];
            var app = entry[1] || {};
            var invitation = utils.findInvitationForApplication(invitations, appId);
            var worker = utils.findWorkerForApplication(workers, app, invitation);
            var state = utils.deriveApplicationStatus(app, invitation && invitation.value, worker && worker.value);
            var item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = '<strong>' + utils.escapeHtml(app.fullName || 'Applicant') + '</strong>'
                + '<p>' + utils.escapeHtml(app.position || 'Unspecified position') + ' · ' + utils.formatDate(app.submittedAt) + '</p>'
                + '<div style="margin-top:10px;display:flex;justify-content:space-between;gap:10px;align-items:center;">'
                + utils.statusBadge(state)
                + '<a class="btn btn-secondary" href="/admin/applications/' + encodeURIComponent(appId) + '">Review</a>'
                + '</div>';
            list.appendChild(item);
        });
    }

    function renderPendingActions(applications, invitations, workers) {
        var list = document.getElementById('pendingActions');
        if (!list) return;
        var items = [];
        Object.entries(applications || {}).forEach(function (entry) {
            var appId = entry[0];
            var app = entry[1] || {};
            var invitation = utils.findInvitationForApplication(invitations, appId);
            var worker = utils.findWorkerForApplication(workers, app, invitation);
            var state = utils.deriveApplicationStatus(app, invitation && invitation.value, worker && worker.value);
            if (state === 'pending' || state === 'under_review' || state === 'registration_sent') {
                items.push({ id: appId, app: app, state: state });
            }
        });
        items.sort(function (a, b) {
            return Number((b.app && b.app.submittedAt) || 0) - Number((a.app && a.app.submittedAt) || 0);
        });
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = '<div class="empty-state">No pending actions right now.</div>';
            return;
        }
        items.slice(0, 6).forEach(function (entry) {
            var copy = entry.state === 'registration_sent'
                ? 'Invitation pending registration.'
                : 'Needs review by the administrator.';
            var item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = '<strong>' + utils.escapeHtml(entry.app.fullName || 'Applicant') + '</strong>'
                + '<p>' + utils.escapeHtml(copy) + '</p>'
                + '<div style="margin-top:10px;display:flex;justify-content:space-between;gap:10px;align-items:center;">'
                + utils.statusBadge(entry.state)
                + '<a class="btn btn-secondary" href="/admin/applications/' + encodeURIComponent(entry.id) + '">Open</a>'
                + '</div>';
            list.appendChild(item);
        });
    }

    function renderMemberActivity(members, workers, invitations) {
        var list = document.getElementById('recentMemberActivity');
        if (!list) return;
        var items = [];
        Object.entries(members || {}).forEach(function (entry) {
            var memberId = entry[0];
            var member = entry[1] || {};
            var invitation = member.invitationToken ? { key: member.invitationToken, value: invitations[member.invitationToken] || null } : null;
            var worker = utils.findWorkerForApplication(workers, { email: member.email }, invitation);
            var status = worker && worker.value && String(worker.value.status || '').toLowerCase() === 'active'
                ? 'active'
                : invitation && invitation.value && String(invitation.value.status || '') === 'registered'
                    ? 'registered'
                    : (member.status || 'approved');
            items.push({
                id: memberId,
                fullName: member.fullName,
                position: member.position,
                status: utils.mapLegacyStatus(status),
                updatedAt: member.updatedAt || member.createdAt || 0
            });
        });
        Object.entries(workers || {}).forEach(function (entry) {
            var uid = entry[0];
            var worker = entry[1] || {};
            if (!worker || !worker.workerId) return;
            var duplicate = items.some(function (item) { return utils.safeText(item.fullName, 160) === utils.safeText(worker.fullName, 160) && utils.safeText(item.position, 160) === utils.safeText(worker.role, 160); });
            if (duplicate) return;
            items.push({ id: uid, fullName: worker.fullName, position: worker.role, status: utils.mapLegacyStatus(worker.status), updatedAt: worker.updatedAt || worker.approvedAt || worker.createdAt || 0, legacy: true });
        });
        items.sort(function (a, b) { return Number(b.updatedAt || 0) - Number(a.updatedAt || 0); });
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = '<div class="empty-state">No member activity yet.</div>';
            return;
        }
        items.slice(0, 8).forEach(function (item) {
            var link = item.legacy ? '/admin/member?legacy=' + encodeURIComponent(item.id) : '/admin/members/' + encodeURIComponent(item.id);
            var row = document.createElement('div');
            row.className = 'list-item';
            row.innerHTML = '<strong>' + utils.escapeHtml(item.fullName || 'Member') + '</strong>'
                + '<p>' + utils.escapeHtml(item.position || 'Member record') + ' · Updated ' + utils.escapeHtml(utils.formatDateTime(item.updatedAt)) + '</p>'
                + '<div style="margin-top:10px;display:flex;justify-content:space-between;gap:10px;align-items:center;">'
                + utils.statusBadge(item.status)
                + '<a class="btn btn-secondary" href="' + link + '">View</a>'
                + '</div>';
            list.appendChild(row);
        });
    }

    shared.withAdminPage(async function (ctx) {
        var maps = await Promise.all([
            utils.getSnapshotMap(ctx.db.ref('applications')),
            utils.getSnapshotMap(ctx.db.ref('registrationInvitations')),
            utils.getSnapshotMap(ctx.db.ref('workers')),
            utils.getSnapshotMap(ctx.db.ref('tasks')),
            utils.getSnapshotMap(ctx.db.ref('members')),
            utils.getSnapshotMap(ctx.db.ref('documents'))
        ]);
        var applications = maps[0];
        var invitations = maps[1];
        var workers = maps[2];
        var tasks = maps[3];
        var members = maps[4];
        var documents = maps[5];
        var counts = deriveMetrics(applications, invitations, workers, tasks, documents);
        renderMetrics(counts);
        renderRecentApplications(applications, invitations, workers);
        renderPendingActions(applications, invitations, workers);
        renderMemberActivity(members, workers, invitations);
    });
})();
