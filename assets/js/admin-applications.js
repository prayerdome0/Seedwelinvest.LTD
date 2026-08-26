(function () {
    'use strict';

    var utils = window.SeedwelRecruitment;
    var shared = window.SeedwelAdminShared;

    function $(id) { return document.getElementById(id); }

    function invitationLink(token) {
        return window.location.origin + '/register#token=' + encodeURIComponent(token);
    }

    async function nextMemberCode(db) {
        var ref = db.ref('counters/memberId');
        var result = await ref.transaction(function (current) {
            current = Number(current || 0);
            return current + 1;
        });
        if (!result.committed) throw new Error('Could not generate a new member ID. Please try again.');
        return utils.createMemberCode(result.snapshot.val());
    }

    async function showPrivateCv(user, application) {
        if (!window.SeedwelCloudinary || !application || !application.cvCloudinaryPublicId) return;
        var download = await window.SeedwelCloudinary.privateCvUrl({
            user: user,
            publicId: application.cvCloudinaryPublicId,
            fileName: application.cvFileName || 'cv',
            format: application.cvFormat || ''
        });
        window.open(download.url, '_blank', 'noopener');
    }

    function renderDocuments(application, user) {
        var holder = $('documentList');
        if (!holder) return;
        holder.innerHTML = '';
        var hasAny = false;
        if (application.cvCloudinaryPublicId || application.cvDownloadUrl) {
            hasAny = true;
            var row = document.createElement('div');
            row.className = 'document-item';
            row.innerHTML = '<div><strong>CV / Resume</strong><p>' + utils.escapeHtml(application.cvFileName || 'Private Cloudinary document') + '</p></div>';
            var button = document.createElement(application.cvCloudinaryPublicId ? 'button' : 'a');
            button.className = 'btn btn-secondary';
            if (application.cvCloudinaryPublicId) {
                button.type = 'button';
                button.textContent = 'Open Document';
                button.addEventListener('click', function () { showPrivateCv(user, application).catch(function (error) {
                    shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not open the document.', 'error');
                }); });
            } else {
                button.href = utils.safeHttpUrl(application.cvDownloadUrl) || '#';
                button.target = '_blank';
                button.rel = 'noopener';
                button.textContent = 'Open Document';
            }
            row.appendChild(button);
            holder.appendChild(row);
        }

        var extraGroups = [
            { key: 'certificates', label: 'Certificates' },
            { key: 'attachments', label: 'Other attachments' }
        ];
        extraGroups.forEach(function (group) {
            var items = Array.isArray(application[group.key]) ? application[group.key] : [];
            items.forEach(function (item) {
                hasAny = true;
                var row = document.createElement('div');
                row.className = 'document-item';
                row.innerHTML = '<div><strong>' + utils.escapeHtml(group.label) + '</strong><p>' + utils.escapeHtml(item.fileName || item.label || 'Cloudinary document') + '</p></div>';
                var link = document.createElement('a');
                link.className = 'btn btn-secondary';
                link.textContent = 'Open Document';
                link.href = utils.safeHttpUrl(item.url) || '#';
                link.target = '_blank';
                link.rel = 'noopener';
                row.appendChild(link);
                holder.appendChild(row);
            });
        });

        if (!hasAny) {
            holder.innerHTML = '<div class="empty-state">No CV, certificates or attachments have been uploaded for this application yet.</div>';
        }
    }

    function setValue(id, value) {
        var el = $(id);
        if (el) el.textContent = value || '—';
    }

    function currentInvitation(data, applicationId) {
        var match = utils.findInvitationForApplication(data.invitations, applicationId);
        if (!match) return null;
        return { key: match.key, value: match.value || {} };
    }

    function currentWorker(data, application, invitation) {
        var match = utils.findWorkerForApplication(data.workers, application, invitation);
        if (!match) return null;
        return { uid: match.uid, value: match.value || {} };
    }

    async function saveAdminNote(ctx, data, applicationId) {
        var application = data.applications[applicationId] || {};
        var button = $('saveNotesBtn');
        if (!button) return;
        button.disabled = true;
        try {
            await ctx.db.ref('applications/' + applicationId).update({
                adminNote: utils.safeText($('adminNotes').value, 1000),
                updatedAt: window.firebase.database.ServerValue.TIMESTAMP
            });
            await utils.recordAudit(ctx.db, 'Application note updated', application.fullName || applicationId, 'Private recruitment note saved.');
            shared.setMessage('pageMessage', 'Admin note saved.', 'success');
        } finally {
            button.disabled = false;
        }
    }

    async function changeApplicationStatus(ctx, data, applicationId, nextStatus) {
        var application = data.applications[applicationId] || {};
        var invitation = currentInvitation(data, applicationId);
        var updates = {
            ['applications/' + applicationId + '/status']: nextStatus,
            ['applications/' + applicationId + '/updatedAt']: window.firebase.database.ServerValue.TIMESTAMP
        };
        if (nextStatus === 'rejected' && invitation && invitation.value && String(invitation.value.status || '').toLowerCase() === 'pending') {
            updates['registrationInvitations/' + invitation.key + '/status'] = 'revoked';
            updates['registrationInvitations/' + invitation.key + '/revokedAt'] = window.firebase.database.ServerValue.TIMESTAMP;
        }
        if (application.linkedMemberId) {
            updates['members/' + application.linkedMemberId + '/status'] = nextStatus === 'rejected' ? 'rejected' : nextStatus;
            updates['members/' + application.linkedMemberId + '/updatedAt'] = window.firebase.database.ServerValue.TIMESTAMP;
        }
        await ctx.db.ref().update(updates);
        await utils.recordAudit(ctx.db, 'Application ' + nextStatus.replace(/_/g, ' '), application.fullName || applicationId, application.position || '');
    }

    async function createInvitation(ctx, data, applicationId) {
        var application = data.applications[applicationId] || {};
        var invitation = currentInvitation(data, applicationId);
        var worker = currentWorker(data, application, invitation);
        if (worker && String(worker.value.status || '').toLowerCase() === 'active') {
            throw new Error('This applicant has already completed registration and has an active member account.');
        }

        var roleType = $('approveRole').value;
        var department = utils.safeText($('approveDepartment').value, 120) || utils.defaultDepartment(application.position);
        var expiryDays = Number($('approveExpiry').value || 7);
        var memberKey = application.linkedMemberId || ctx.db.ref('members').push().key;
        var existingMember = memberKey && data.members[memberKey] ? data.members[memberKey] : null;
        var memberCode = existingMember && existingMember.memberCode ? existingMember.memberCode : await nextMemberCode(ctx.db);
        var token = utils.randomToken();
        var expiresAt = utils.nowPlusDays(expiryDays);
        var updates = {};

        if (invitation && invitation.value && String(invitation.value.status || '').toLowerCase() === 'pending') {
            updates['registrationInvitations/' + invitation.key + '/status'] = 'replaced';
            updates['registrationInvitations/' + invitation.key + '/replacedAt'] = window.firebase.database.ServerValue.TIMESTAMP;
        }

        updates['applications/' + applicationId + '/status'] = 'registration_sent';
        updates['applications/' + applicationId + '/updatedAt'] = window.firebase.database.ServerValue.TIMESTAMP;
        updates['applications/' + applicationId + '/reviewedAt'] = window.firebase.database.ServerValue.TIMESTAMP;
        updates['applications/' + applicationId + '/linkedMemberId'] = memberKey;
        updates['applications/' + applicationId + '/invitationToken'] = token;
        updates['members/' + memberKey] = {
            applicationId: applicationId,
            fullName: utils.safeText(application.fullName, 120),
            email: utils.safeText(application.email, 160).toLowerCase(),
            phone: utils.safeText(application.phone, 40),
            location: utils.safeText(application.location || application.country, 120),
            position: utils.safeText(application.position, 120),
            experience: utils.safeText(application.experience, 40),
            department: department,
            roleType: roleType,
            memberCode: memberCode,
            invitationToken: token,
            status: 'pending_registration',
            createdAt: existingMember && existingMember.createdAt ? existingMember.createdAt : window.firebase.database.ServerValue.TIMESTAMP,
            updatedAt: window.firebase.database.ServerValue.TIMESTAMP
        };
        updates['registrationInvitations/' + token] = {
            applicationId: applicationId,
            memberId: memberKey,
            memberCode: memberCode,
            fullName: utils.safeText(application.fullName, 120),
            email: utils.safeText(application.email, 160).toLowerCase(),
            phone: utils.safeText(application.phone, 40),
            location: utils.safeText(application.location || application.country, 120),
            position: utils.safeText(application.position, 120),
            experience: utils.safeText(application.experience, 40),
            department: department,
            roleType: roleType,
            status: 'pending',
            expiresAt: expiresAt,
            createdAt: window.firebase.database.ServerValue.TIMESTAMP
        };

        await ctx.db.ref().update(updates);
        await utils.recordAudit(ctx.db, 'Registration invitation created', application.fullName || applicationId, memberCode + ' · ' + department);
        return { token: token, memberKey: memberKey, memberCode: memberCode, expiresAt: expiresAt };
    }

    function renderInvitationPanel(data, applicationId, application) {
        var wrapper = $('invitationDetails');
        var holder = $('invitationLink');
        var state = $('invitationState');
        var invite = currentInvitation(data, applicationId);
        var worker = currentWorker(data, application, invite);
        if (!wrapper || !holder || !state) return;

        if (worker && String(worker.value.status || '').toLowerCase() === 'active') {
            wrapper.classList.remove('hide');
            holder.value = '';
            state.innerHTML = '<div class="banner success">This applicant completed registration and is now active. <a class="portal-link" href="/admin/members/' + encodeURIComponent(application.linkedMemberId || '') + '">Open member profile</a>.</div>';
            return;
        }
        if (!invite || !invite.value) {
            wrapper.classList.add('hide');
            holder.value = '';
            state.innerHTML = '';
            return;
        }
        wrapper.classList.remove('hide');
        holder.value = invitationLink(invite.key);
        var expired = Number(invite.value.expiresAt || 0) <= Date.now();
        var inviteStatus = String(invite.value.status || 'pending').toLowerCase();
        var tone = inviteStatus === 'pending' && !expired ? 'warning' : inviteStatus === 'registered' ? 'success' : 'info';
        var text = inviteStatus === 'registered'
            ? 'Registration completed on ' + utils.formatDateTime(invite.value.usedAt || invite.value.createdAt) + '.'
            : expired
                ? 'This invitation has expired. Generate a new one below.'
                : 'Invitation is pending registration and expires on ' + utils.formatDateTime(invite.value.expiresAt) + '.';
        state.innerHTML = '<div class="banner ' + tone + '">' + utils.escapeHtml(text) + '</div>';
    }

    function renderDetail(ctx, data, applicationId) {
        var application = data.applications[applicationId];
        if (!application) {
            shared.setMessage('pageMessage', 'That application could not be found.', 'error');
            return;
        }
        var invite = currentInvitation(data, applicationId);
        var worker = currentWorker(data, application, invite);
        var derivedStatus = utils.deriveApplicationStatus(application, invite && invite.value, worker && worker.value);

        setValue('applicationName', application.fullName || 'Applicant');
        var statusEl = $('applicationStatus');
        if (statusEl) statusEl.innerHTML = utils.statusBadge(derivedStatus);
        setValue('applicationDate', utils.formatDate(application.submittedAt));
        setValue('appFullName', application.fullName);
        setValue('appEmail', application.email);
        setValue('appPhone', application.phone);
        setValue('appLocation', application.location || application.country || 'Not provided');
        setValue('appPosition', application.position);
        setValue('appExperience', application.experience || 'Not provided');
        setValue('appPortfolio', application.portfolioUrl || 'Not provided');
        setValue('appAnswers', application.coverLetter || 'No written response provided.');
        setValue('appMemberId', application.linkedMemberId || 'Will be created on approval');
        if ($('appPortfolioLink')) {
            var href = utils.safeHttpUrl(application.portfolioUrl);
            $('appPortfolioLink').href = href || '#';
            $('appPortfolioLink').hidden = !href;
        }
        if ($('adminNotes')) $('adminNotes').value = application.adminNote || '';
        if ($('approveDepartment')) $('approveDepartment').value = application.department || utils.defaultDepartment(application.position);
        renderDocuments(application, ctx.user);
        renderInvitationPanel(data, applicationId, application);
    }

    function attachDetailHandlers(ctx, data, applicationId) {
        var application = data.applications[applicationId] || {};
        var approvePanel = $('approvePanel');
        if ($('saveNotesBtn')) $('saveNotesBtn').onclick = function () {
            saveAdminNote(ctx, data, applicationId).catch(function (error) {
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not save the note.', 'error');
            });
        };
        if ($('shortlistBtn')) $('shortlistBtn').onclick = function () {
            changeApplicationStatus(ctx, data, applicationId, 'shortlisted').then(function () {
                shared.setMessage('pageMessage', 'Application shortlisted.', 'success');
                window.location.reload();
            }).catch(function (error) {
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not shortlist the application.', 'error');
            });
        };
        if ($('rejectBtn')) $('rejectBtn').onclick = function () {
            if (!window.confirm('Reject this application?')) return;
            changeApplicationStatus(ctx, data, applicationId, 'rejected').then(function () {
                shared.setMessage('pageMessage', 'Application rejected.', 'success');
                window.location.reload();
            }).catch(function (error) {
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not reject the application.', 'error');
            });
        };
        if ($('approveBtn')) $('approveBtn').onclick = function () {
            if (approvePanel) approvePanel.classList.toggle('hide');
        };
        if ($('createInvitationBtn')) $('createInvitationBtn').onclick = function () {
            var button = $('createInvitationBtn');
            button.disabled = true;
            createInvitation(ctx, data, applicationId).then(function (result) {
                if ($('invitationLink')) $('invitationLink').value = invitationLink(result.token);
                if ($('invitationDetails')) $('invitationDetails').classList.remove('hide');
                if ($('invitationState')) $('invitationState').innerHTML = '<div class="banner success">Invitation created for ' + utils.escapeHtml(application.fullName || 'the applicant') + '. It expires on ' + utils.escapeHtml(utils.formatDateTime(result.expiresAt)) + '.</div>';
                shared.setMessage('pageMessage', 'Application approved and registration invitation created.', 'success');
                window.setTimeout(function () { window.location.reload(); }, 800);
            }).catch(function (error) {
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not create the invitation.', 'error');
            }).finally(function () {
                button.disabled = false;
            });
        };
        if ($('copyInvitationBtn')) $('copyInvitationBtn').onclick = function () {
            utils.copyText($('invitationLink').value).then(function () {
                shared.setMessage('pageMessage', 'Invitation link copied.', 'success');
            }).catch(function () {
                shared.setMessage('pageMessage', 'Could not copy the invitation link. Please copy it manually.', 'error');
            });
        };
    }

    function renderList(data) {
        var body = $('applicationsTableBody');
        if (!body) return;
        var search = utils.safeText(($('applicationSearch') && $('applicationSearch').value) || '', 160).toLowerCase();
        var filter = (($('applicationFilter') && $('applicationFilter').value) || 'all').toLowerCase();
        var entries = Object.entries(data.applications || {}).map(function (entry) {
            var appId = entry[0];
            var app = entry[1] || {};
            var invite = currentInvitation(data, appId);
            var worker = currentWorker(data, app, invite);
            return {
                id: appId,
                app: app,
                state: utils.deriveApplicationStatus(app, invite && invite.value, worker && worker.value)
            };
        }).filter(function (entry) {
            var haystack = [entry.app.fullName, entry.app.email, entry.app.phone, entry.app.position, entry.app.location]
                .map(function (value) { return utils.safeText(value, 160).toLowerCase(); }).join(' ');
            if (search && haystack.indexOf(search) === -1) return false;
            if (filter !== 'all' && entry.state !== filter) return false;
            return true;
        }).sort(function (a, b) {
            return Number((b.app && b.app.submittedAt) || 0) - Number((a.app && a.app.submittedAt) || 0);
        });

        body.innerHTML = '';
        if (!entries.length) {
            body.innerHTML = '<tr><td colspan="5"><div class="empty-state">No applications match the current filters.</div></td></tr>';
            return;
        }
        entries.forEach(function (entry) {
            var row = document.createElement('tr');
            row.innerHTML = '<td><strong>' + utils.escapeHtml(entry.app.fullName || 'Applicant') + '</strong><small>' + utils.escapeHtml(entry.app.email || 'No email') + '</small></td>'
                + '<td>' + utils.escapeHtml(entry.app.position || '—') + '</td>'
                + '<td>' + utils.escapeHtml(utils.formatDate(entry.app.submittedAt)) + '</td>'
                + '<td>' + utils.statusBadge(entry.state) + '</td>'
                + '<td><a class="btn btn-secondary" href="/admin/applications/' + encodeURIComponent(entry.id) + '">Review</a></td>';
            body.appendChild(row);
        });
    }

    function attachListHandlers(data) {
        var rerender = utils.debounce(function () { renderList(data); }, 120);
        if ($('applicationSearch')) $('applicationSearch').addEventListener('input', rerender);
        if ($('applicationFilter')) $('applicationFilter').addEventListener('change', function () { renderList(data); });
        if ($('refreshApplications')) $('refreshApplications').addEventListener('click', function () { window.location.reload(); });
    }

    shared.withAdminPage(async function (ctx) {
        var data = {
            applications: await utils.getSnapshotMap(ctx.db.ref('applications')),
            workers: await utils.getSnapshotMap(ctx.db.ref('workers')),
            invitations: await utils.getSnapshotMap(ctx.db.ref('registrationInvitations')),
            members: await utils.getSnapshotMap(ctx.db.ref('members'))
        };

        if (document.body.getAttribute('data-page') === 'applications') {
            renderList(data);
            attachListHandlers(data);
            return;
        }

        var applicationId = utils.queryParam('id');
        renderDetail(ctx, data, applicationId);
        attachDetailHandlers(ctx, data, applicationId);
    });
})();
