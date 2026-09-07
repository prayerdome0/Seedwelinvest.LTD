(function () {
    'use strict';

    var utils = window.SeedwelRecruitment;
    var portal = window.SeedwelPortal;
    var shared = window.SeedwelAdminShared;
    var $ = shared.$;
    var esc = portal.esc;

    var state = {
        usersByUid: {},
        workersByUid: {},
        invitations: {},
        rows: []
    };
    var filter = { search: '', role: '', status: '' };

    async function nextMemberCode() {
        var ref = shared.db.ref('counters/memberId');
        var result = await ref.transaction(function (current) {
            current = Number(current || 0);
            return current + 1;
        });
        if (!result.committed) throw new Error('Could not generate a member ID. Please try again.');
        return utils.createMemberCode(result.snapshot.val());
    }

    function inviteLink(token) {
        return window.location.origin + '/register#token=' + encodeURIComponent(token);
    }

    /** Build a full users record from a legacy worker record (upgrade path). */
    function legacyUserRecordFor(uid) {
        var worker = state.workersByUid[uid] || {};
        var isActive = String(worker.status || '').toLowerCase() === 'active';
        var now = window.firebase.database.ServerValue.TIMESTAMP;
        return {
            fullName: utils.safeText(worker.fullName, 120),
            name: utils.safeText(worker.fullName, 120),
            email: utils.safeText(worker.email, 160).toLowerCase(),
            phone: utils.safeText(worker.phone, 40),
            country: utils.safeText(worker.country || worker.location, 80),
            role: roleFromRecord(worker, true),
            position: utils.safeText(worker.position || worker.role, 120),
            department: utils.safeText(worker.department, 120),
            workerId: utils.safeText(worker.workerId, 20),
            assignedManagerId: utils.safeText(worker.assignedManagerId, 128),
            assignedManagerName: utils.safeText(worker.assignedManagerName, 120),
            status: isActive ? 'active' : 'suspended',
            registeredAt: Number(worker.approvedAt || worker.createdAt || Date.now()),
            createdAt: Number(worker.createdAt || worker.approvedAt || Date.now()),
            updatedAt: now,
            source: 'legacy-conversion'
        };
    }

    /** Make sure a users/{uid} record exists before role/status/manager updates. */
    async function ensureUserRecord(uid) {
        if (state.usersByUid[uid]) return;
        await shared.db.ref('users/' + uid).set(legacyUserRecordFor(uid));
        state.usersByUid[uid] = legacyUserRecordFor(uid);
    }

    function roleFromRecord(record, isLegacy) {
        if (record.role) {
            var role = String(record.role).toLowerCase();
            if (['admin', 'manager', 'staff', 'client'].indexOf(role) !== -1) return role;
        }
        if (isLegacy && /virtual\s*assistant/i.test(String(record.position || record.role || ''))) return 'manager';
        return 'staff';
    }

    function isVirtualAssistant(position) {
        return /virtual\s*assistant/i.test(String(position || ''));
    }

    function buildRows(users, workers, invitations) {
        var rows = [];
        Object.keys(users).forEach(function (uid) {
            var record = users[uid] || {};
            rows.push({
                kind: 'user',
                uid: uid,
                record: record,
                name: record.fullName || record.name || record.email || 'Member',
                email: record.email || '',
                phone: record.phone || '',
                role: roleFromRecord(record, false),
                status: String(record.status || 'active').toLowerCase(),
                managerId: String(record.assignedManagerId || record.assignedManagerEmail || ''),
                managerName: record.assignedManagerName || '',
                position: record.position || record.role || '',
                department: record.department || '',
                country: record.country || record.location || '',
                createdAt: Number(record.createdAt || record.registeredAt || 0),
                workerId: record.workerId || '',
                skills: record.skills || ''
            });
        });
        Object.keys(workers).forEach(function (uid) {
            if (users[uid]) return;
            var record = workers[uid] || {};
            var active = String(record.status || '').toLowerCase() === 'active';
            rows.push({
                kind: 'user',
                uid: uid,
                legacy: true,
                record: record,
                name: record.fullName || record.email || 'Member',
                email: record.email || '',
                phone: record.phone || '',
                role: roleFromRecord(record, true),
                status: active ? 'active' : 'suspended',
                managerId: String(record.assignedManagerId || ''),
                managerName: record.assignedManagerName || '',
                position: record.position || record.role || '',
                department: record.department || '',
                country: record.country || record.location || '',
                createdAt: Number(record.createdAt || record.approvedAt || 0),
                workerId: record.workerId || '',
                skills: record.skills || '',
                legacyStatus: record.status || ''
            });
        });
        Object.keys(invitations).forEach(function (token) {
            var record = invitations[token] || {};
            if (String(record.status || '').toLowerCase() !== 'pending') return;
            rows.push({
                kind: 'invite',
                token: token,
                record: record,
                name: record.fullName || record.email || 'Invitee',
                email: record.email || '',
                phone: record.phone || '',
                role: record.role || (String(record.roleType || '') === 'Member' ? 'client' : (isVirtualAssistant(record.position) ? 'manager' : 'staff')),
                status: 'invite',
                managerName: record.assignedManagerName || '',
                position: record.position || '',
                department: record.department || '',
                country: record.location || '',
                createdAt: Number(record.createdAt || 0),
                expiresAt: Number(record.expiresAt || 0),
                workerId: record.memberCode || ''
            });
        });
        return rows;
    }

    function renderMetrics() {
        var all = state.rows;
        $('metricAccounts').textContent = String(all.filter(function (row) { return row.kind === 'user'; }).length);
        $('metricActive').textContent = String(all.filter(function (row) { return row.kind === 'user' && row.status === 'active'; }).length);
        $('metricSuspended').textContent = String(all.filter(function (row) { return row.kind === 'user' && row.status !== 'active'; }).length);
        $('metricInvites').textContent = String(all.filter(function (row) { return row.kind === 'invite'; }).length);
    }

    function managerOptions(selectedId) {
        var opts = '<option value="">— None —</option>';
        Object.keys(state.usersByUid).forEach(function (uid) {
            var record = state.usersByUid[uid] || {};
            if (String(record.role || '').toLowerCase() !== 'manager') return;
            var name = record.fullName || record.name || record.email || 'Manager';
            var selected = uid === selectedId ? ' selected' : '';
            opts += '<option value="' + esc(uid) + '"' + selected + '>' + esc(name) + '</option>';
        });
        Object.keys(state.workersByUid).forEach(function (uid) {
            if (state.usersByUid[uid]) return;
            var record = state.workersByUid[uid] || {};
            if (!isVirtualAssistant(record.position || record.role)) return;
            var name = record.fullName || record.email || 'Virtual Assistant';
            var selected = uid === selectedId ? ' selected' : '';
            opts += '<option value="' + esc(uid) + '"' + selected + '>' + esc(name) + '</option>';
        });
        return opts;
    }

    function filteredRows() {
        var rows = state.rows.slice();
        var search = filter.search.toLowerCase();
        if (search) {
            rows = rows.filter(function (row) {
                var haystack = [row.name, row.email, row.phone, row.position, row.department, row.workerId].join(' ').toLowerCase();
                return haystack.indexOf(search) !== -1;
            });
        }
        if (filter.role) rows = rows.filter(function (row) { return row.role === filter.role; });
        if (filter.status === 'invite') rows = rows.filter(function (row) { return row.kind === 'invite'; });
        else if (filter.status) rows = rows.filter(function (row) { return row.kind === 'user' && row.status === filter.status; });
        rows.sort(function (a, b) {
            return (String(a.kind === 'invite' ? 1 : 0).localeCompare(String(b.kind === 'invite' ? 1 : 0))) || String(a.name).localeCompare(String(b.name));
        });
        return rows;
    }

    function rowCell(name, email, row) {
        return '<td><strong>' + esc(name) + '</strong><small>' + esc(email) + '</small></td>';
    }

    function roleBadge(role) {
        var label = portal.roleLabel(role === 'client' ? 'client' : role);
        var cls = role === 'manager' ? 'manager' : role === 'client' ? 'client' : role === 'admin' ? 'admin' : 'staff';
        return '<span class="role-chip ' + cls + '">' + esc(label) + '</span>';
    }

    function statusBadge(row) {
        if (row.kind === 'invite') return '<span class="wf-pill pending"><i class="fa-regular fa-envelope"></i> Invitation pending</span>';
        var active = row.status === 'active';
        return '<span class="wf-pill ' + (active ? 'approved' : 'changes_required') + '">' + (active ? 'Active' : 'Suspended / Inactive') + '</span>';
    }

    function renderTable() {
        var tbody = $('usersTable');
        tbody.textContent = '';
        var rows = filteredRows();
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="7">No users match this view.</td></tr>';
            return;
        }
        rows.forEach(function (row) {
            var tr = document.createElement('tr');
            tr.innerHTML = rowCell(row.name, row.email, row)
                + '<td><small>' + esc(row.phone || '—') + '</small></td>'
                + '<td>' + roleBadge(row.role) + '</td>'
                + '<td>' + statusBadge(row) + '</td>'
                + '<td><small>' + esc(row.managerName || '—') + '</small></td>'
                + '<td>' + (row.kind === 'invite'
                    ? '<div class="row-actions"><button class="wf-btn" data-copy="' + esc(inviteLink(row.token)) + '"><i class="fa-regular fa-copy"></i> Link</button><button class="wf-btn" data-resend="' + esc(row.token) + '">Resend</button></div>'
                    : '<small>' + esc(utils.formatDate(row.createdAt)) + '</small>') + '</td>'
                + '<td>' + actionCell(row) + '</td>';

            var detail = document.createElement('tr');
            detail.className = 'hide';
            detail.innerHTML = '<td colspan="7"><div class="record-detail">'
                + '<div><span>Position</span><strong>' + esc(row.position || '—') + '</strong></div>'
                + '<div><span>Department</span><strong>' + esc(row.department || '—') + '</strong></div>'
                + '<div><span>Country / Location</span><strong>' + esc(row.country || '—') + '</strong></div>'
                + '<div><span>Worker ID</span><strong>' + esc(row.workerId || '—') + '</strong></div>'
                + '<div><span>Registered</span><strong>' + esc(utils.formatDateTime(row.createdAt)) + '</strong></div>'
                + '<div><span>Account role</span><strong>' + esc(portal.roleLabel(row.role)) + '</strong></div>'
                + '</div></td>';

            var profileBtn = tr.querySelector('[data-profile]');
            if (profileBtn) {
                profileBtn.addEventListener('click', function () {
                    detail.classList.toggle('hide');
                });
            }
            var copyBtn = tr.querySelector('[data-copy]');
            if (copyBtn) {
                copyBtn.addEventListener('click', function () {
                    utils.copyText(copyBtn.getAttribute('data-copy')).then(function (ok) {
                        shared.setMessage('pageMessage', ok ? 'Invitation link copied — send it privately to the invitee.' : 'Copy failed — use the invite detail row.', ok ? 'success' : 'error');
                    });
                });
            }
            var resendBtn = tr.querySelector('[data-resend]');
            if (resendBtn) {
                resendBtn.addEventListener('click', function () {
                    resendInvitation(resendBtn.getAttribute('data-resend'));
                });
            }
            tbody.append(tr, detail);
        });
    }

    function actionCell(row) {
        if (row.kind === 'invite') return '<div class="row-actions"><button class="wf-btn ghost" data-profile="1">Details</button><button class="wf-btn danger" data-revoke="' + esc(row.token) + '">Revoke</button></div>';
        var roleSelect = '<select data-role="' + esc(row.uid) + '" aria-label="Change role">'
            + '<option value="staff"' + (row.role === 'staff' ? ' selected' : '') + '>Staff</option>'
            + '<option value="manager"' + (row.role === 'manager' ? ' selected' : '') + '>Manager / VA</option>'
            + '<option value="client"' + (row.role === 'client' ? ' selected' : '') + '>Client / Business</option>'
            + '<option value="admin"' + (row.role === 'admin' ? ' selected' : '') + '>Administrator</option>'
            + '</select>';
        var managerSelect = '<select data-manager="' + esc(row.uid) + '" aria-label="Assign manager">' + managerOptions(row.managerId) + '</select>';
        var statusBtn = row.status === 'active'
            ? '<button class="wf-btn danger" data-toggle="' + esc(row.uid) + '"><i class="fa-solid fa-ban"></i> Suspend</button>'
            : '<button class="wf-btn success" data-toggle="' + esc(row.uid) + '"><i class="fa-solid fa-circle-check"></i> Activate</button>';
        return '<div class="row-actions">' + roleSelect + managerSelect + statusBtn
            + '<button class="wf-btn ghost" data-profile="1"><i class="fa-solid fa-id-card"></i> Profile</button></div>';
    }

    function renderActivity() {
        var list = $('accountActivity');
        list.textContent = '';
        // Audit entries are loaded into state.audit by the caller.
        var entries = (state.audit || [])
            .filter(function (entry) {
                return /account|user|role|invit|suspend|activat|member/i.test(String(entry.action || ''));
            })
            .sort(function (a, b) { return Number(b.at || 0) - Number(a.at || 0); })
            .slice(0, 12);
        if (!entries.length) {
            list.innerHTML = '<div class="empty-state">No account activity yet.</div>';
            return;
        }
        entries.forEach(function (entry) {
            var card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = '<div class="task-card-head"><strong>' + esc(entry.action || 'Account update') + '</strong>'
                + '<span class="wf-pill pending">' + esc(utils.formatDateTime(entry.at)) + '</span></div>'
                + '<p class="task-copy"><strong>' + esc(entry.target || '') + '</strong>' + (entry.detail ? ' — ' + esc(entry.detail) : '') + '</p>'
                + '<div class="notice-copy">by ' + esc(entry.actorName || entry.actor || 'Administrator') + '</div>';
            list.appendChild(card);
        });
    }

    function renderAll() {
        renderMetrics();
        renderTable();
        renderActivity();
    }

    function fillManagerSelect() {
        $('inviteManager').innerHTML = '<option value="">— None yet —</option>' + managerOptions('');
    }

    async function afterChange() {
        var maps = await Promise.all([
            utils.getSnapshotMap(shared.db.ref('users')),
            utils.getSnapshotMap(shared.db.ref('workers')),
            utils.getSnapshotMap(shared.db.ref('registrationInvitations'))
        ]);
        state.usersByUid = maps[0];
        state.workersByUid = maps[1];
        state.invitations = maps[2];
        state.rows = buildRows(state.usersByUid, state.workersByUid, state.invitations);
        fillManagerSelect();
        renderAll();
    }

    async function resendInvitation(token) {
        try {
            await shared.db.ref('registrationInvitations/' + token).update({
                status: 'pending',
                expiresAt: utils.nowPlusDays(7),
                resentAt: window.firebase.database.ServerValue.TIMESTAMP
            });
            await utils.recordAudit(shared.db, 'Registration invitation re-sent', 'Invitee', 'Invitation renewed for 7 days.');
            shared.setMessage('pageMessage', 'The invitation has been renewed for 7 days.', 'success');
        } catch (error) {
            shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not resend the invitation.', 'error');
            return;
        }
        await afterChange();
    }

    shared.withAdminPage(async function (ctx) {
        var snapshots = await Promise.all([
            utils.getSnapshotMap(shared.db.ref('users')),
            utils.getSnapshotMap(shared.db.ref('workers')),
            utils.getSnapshotMap(shared.db.ref('registrationInvitations')),
            utils.getSnapshotMap(shared.db.ref('auditLog'))
        ]);
        state.usersByUid = snapshots[0];
        state.workersByUid = snapshots[1];
        state.invitations = snapshots[2];
        state.audit = Object.values(snapshots[3] || {});
        state.rows = buildRows(state.usersByUid, state.workersByUid, state.invitations);
        fillManagerSelect();

        $('userSearch').addEventListener('input', function (event) {
            filter.search = event.target.value;
            renderTable();
        });
        $('roleFilter').addEventListener('change', function (event) {
            filter.role = event.target.value;
            renderTable();
        });
        $('statusFilter').addEventListener('change', function (event) {
            filter.status = event.target.value;
            renderTable();
        });

        $('createAccountForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            var fullName = $('inviteName').value.trim();
            var email = $('inviteEmail').value.trim().toLowerCase();
            var phone = $('invitePhone').value.trim();
            var role = $('inviteRole').value;
            var position = $('invitePosition').value.trim();
            var department = $('inviteDepartment').value.trim() || (role === 'client' ? 'Client Services' : 'Operations');
            var managerId = $('inviteManager').value;
            var expiryDays = Number($('inviteExpiry').value || 7);
            var note = $('inviteNote').value.trim();

            if (!fullName) { shared.setMessage('pageMessage', 'Enter the person\u2019s full name.', 'error'); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { shared.setMessage('pageMessage', 'Enter a valid email address.', 'error'); return; }
            if (!position) { shared.setMessage('pageMessage', 'Enter a position or job title.', 'error'); return; }
            if (state.rows.some(function (row) { return row.kind === 'user' && row.email.toLowerCase() === email; })) {
                shared.setMessage('pageMessage', 'An account already exists for this email.', 'error');
                return;
            }
            if (state.rows.some(function (row) { return row.kind === 'invite' && row.email.toLowerCase() === email && Number(row.expiresAt || 0) > Date.now(); })) {
                shared.setMessage('pageMessage', 'A pending invitation already exists for this email.', 'error');
                return;
            }

            var button = $('createAccountBtn');
            button.disabled = true;
            button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating…';
            try {
                var memberCode = await nextMemberCode();
                var memberKey = shared.db.ref('members').push().key;
                var token = utils.randomToken();
                var managerName = '';
                if (managerId) {
                    managerName = state.usersByUid[managerId] && (state.usersByUid[managerId].fullName || state.usersByUid[managerId].name)
                        || (state.workersByUid[managerId] && state.workersByUid[managerId].fullName) || '';
                }
                var roleType = role === 'client' ? 'Member' : 'Staff';
                var now = window.firebase.database.ServerValue.TIMESTAMP;
                await shared.db.ref().update({
                    ['members/' + memberKey]: {
                        applicationId: 'manual-' + token,
                        fullName: fullName.slice(0, 120),
                        email: email.slice(0, 160),
                        phone: phone.slice(0, 40),
                        location: '',
                        position: position.slice(0, 120),
                        department: department.slice(0, 120),
                        roleType: roleType,
                        memberCode: memberCode,
                        invitationToken: token,
                        status: 'approved',
                        createdAt: now,
                        updatedAt: now
                    },
                    ['registrationInvitations/' + token]: {
                        applicationId: 'manual-' + token,
                        memberId: memberKey,
                        memberCode: memberCode,
                        fullName: fullName.slice(0, 120),
                        email: email.slice(0, 160),
                        phone: phone.slice(0, 40),
                        location: '',
                        position: position.slice(0, 120),
                        experience: '',
                        department: department.slice(0, 120),
                        roleType: roleType,
                        role: role,
                        accountType: role === 'client' ? 'client' : 'worker',
                        assignedManagerId: managerId || '',
                        assignedManagerName: managerName.slice(0, 120),
                        internalNote: note.slice(0, 300),
                        status: 'pending',
                        expiresAt: utils.nowPlusDays(expiryDays),
                        createdAt: now
                    }
                });
                await utils.recordAudit(shared.db, 'Account invitation created', fullName, role + ' · ' + position + ' · ' + memberCode);
                shared.setMessage('pageMessage', 'Invitation created for ' + fullName + '. Send them: ' + inviteLink(token), 'success');
                await utils.copyText(inviteLink(token)).catch(function () {});
                $('createAccountForm').reset();
            } catch (error) {
                console.error(error);
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not create the invitation.', 'error');
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Create &amp; send invitation';
            }
            await afterChange();
        });

        $('usersTable').addEventListener('change', async function (event) {
            var target = event.target;
            var uid = target.getAttribute('data-role') || target.getAttribute('data-manager');
            if (!uid) return;
            try {
                if (target.hasAttribute('data-role')) {
                    var role = target.value;
                    await ensureUserRecord(uid);
                    var record = state.usersByUid[uid] || {};
                    await shared.db.ref('users/' + uid).update({
                        role: role,
                        updatedAt: window.firebase.database.ServerValue.TIMESTAMP
                    });
                    if (record.email) {
                        await shared.db.ref('workers/' + uid).update({ role: record.position || record.role || 'Team Member' }).catch(function () {});
                    }
                    await utils.recordAudit(shared.db, 'Account role changed', record.fullName || record.email || uid, 'Now: ' + role);
                    shared.setMessage('pageMessage', 'Role updated.', 'success');
                } else {
                    var name = target.options[target.selectedIndex] ? target.options[target.selectedIndex].text : '';
                    await ensureUserRecord(uid);
                    await shared.db.ref('users/' + uid).update({
                        assignedManagerId: target.value || '',
                        assignedManagerName: name || '',
                        updatedAt: window.firebase.database.ServerValue.TIMESTAMP
                    });
                    await shared.db.ref('workers/' + uid).update({
                        assignedManagerId: target.value || '',
                        assignedManagerName: name || ''
                    }).catch(function () {});
                    await utils.recordAudit(shared.db, 'Manager assigned', state.usersByUid[uid] && (state.usersByUid[uid].fullName || state.usersByUid[uid].email) || uid, name || 'None');
                    shared.setMessage('pageMessage', 'Manager assignment updated.', 'success');
                }
            } catch (error) {
                console.error(error);
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not update the account.', 'error');
            }
            await afterChange();
        });

        $('usersTable').addEventListener('click', async function (event) {
            var toggle = event.target.closest('[data-toggle]');
            if (!toggle) return;
            var uid = toggle.getAttribute('data-toggle');
            await ensureUserRecord(uid);
            var record = state.usersByUid[uid] || {};
            var next = String(record.status || 'active').toLowerCase() === 'active' ? 'suspended' : 'active';
            try {
                await shared.db.ref('users/' + uid).update({
                    status: next,
                    updatedAt: window.firebase.database.ServerValue.TIMESTAMP
                });
                await shared.db.ref('workers/' + uid).update({ status: next }).catch(function () {});
                await utils.recordAudit(shared.db, 'Account ' + (next === 'active' ? 'activated' : 'suspended'), record.fullName || record.email || uid, '');
                shared.setMessage('pageMessage', 'Account ' + (next === 'active' ? 'activated' : 'suspended') + '.', 'success');
            } catch (error) {
                console.error(error);
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not change account status.', 'error');
                return;
            }
            await afterChange();
        });

        $('usersTable').addEventListener('click', async function (event) {
            var revoke = event.target.closest('[data-revoke]');
            if (!revoke) return;
            var token = revoke.getAttribute('data-revoke');
            var record = state.invitations[token] || {};
            try {
                await shared.db.ref('registrationInvitations/' + token).update({
                    status: 'revoked',
                    revokedAt: window.firebase.database.ServerValue.TIMESTAMP
                });
                await utils.recordAudit(shared.db, 'Registration invitation revoked', record.fullName || record.email || 'Invitee', '');
                shared.setMessage('pageMessage', 'Invitation revoked.', 'success');
            } catch (error) {
                console.error(error);
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not revoke the invitation.', 'error');
                return;
            }
            await afterChange();
        });

        await afterChange();
    });
})();
