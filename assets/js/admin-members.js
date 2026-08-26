(function () {
    'use strict';

    var utils = window.SeedwelRecruitment;
    var shared = window.SeedwelAdminShared;

    function $(id) { return document.getElementById(id); }

    function deriveMemberStatus(member, invitation, worker) {
        if (worker && String(worker.status || '').toLowerCase() === 'active') return 'active';
        if (invitation) {
            var expired = Number(invitation.expiresAt || 0) <= Date.now();
            if (String(invitation.status || '').toLowerCase() === 'registered') return 'registered';
            if (String(invitation.status || '').toLowerCase() === 'pending' && !expired) return 'registration_sent';
        }
        return utils.mapLegacyStatus(member && member.status ? member.status : 'approved');
    }

    function buildMemberEntries(data) {
        var entries = [];
        Object.entries(data.members || {}).forEach(function (entry) {
            var memberId = entry[0];
            var member = entry[1] || {};
            var invitation = member.invitationToken ? data.invitations[member.invitationToken] || null : null;
            var workerMatch = utils.findWorkerForApplication(data.workers, { email: member.email }, member.invitationToken ? { key: member.invitationToken, value: invitation } : null);
            entries.push({
                id: memberId,
                type: 'member',
                member: member,
                invitation: invitation,
                worker: workerMatch ? workerMatch.value : null,
                workerUid: workerMatch ? workerMatch.uid : '',
                status: deriveMemberStatus(member, invitation, workerMatch && workerMatch.value)
            });
        });
        Object.entries(data.workers || {}).forEach(function (entry) {
            var uid = entry[0];
            var worker = entry[1] || {};
            var alreadyLinked = entries.some(function (item) { return item.workerUid === uid || (utils.safeText(item.member.email, 160).toLowerCase() === utils.safeText(worker.email, 160).toLowerCase()); });
            if (alreadyLinked) return;
            entries.push({
                id: uid,
                type: 'legacy',
                member: {
                    fullName: worker.fullName,
                    email: worker.email,
                    phone: worker.phone,
                    location: worker.country,
                    position: worker.role,
                    experience: worker.experience,
                    department: worker.department,
                    roleType: 'Member',
                    memberCode: worker.workerId,
                    status: worker.status,
                    createdAt: worker.createdAt,
                    updatedAt: worker.updatedAt || worker.approvedAt || worker.createdAt
                },
                invitation: null,
                worker: worker,
                workerUid: uid,
                status: utils.mapLegacyStatus(worker.status || 'active')
            });
        });
        return entries.sort(function (a, b) {
            return Number((b.member && (b.member.updatedAt || b.member.createdAt)) || 0) - Number((a.member && (a.member.updatedAt || a.member.createdAt)) || 0);
        });
    }

    function renderList(data) {
        var body = $('membersTableBody');
        if (!body) return;
        var search = utils.safeText(($('memberSearch') && $('memberSearch').value) || '', 160).toLowerCase();
        var filter = (($('memberFilter') && $('memberFilter').value) || 'all').toLowerCase();
        var entries = buildMemberEntries(data).filter(function (entry) {
            var haystack = [entry.member.fullName, entry.member.email, entry.member.position, entry.member.memberCode]
                .map(function (value) { return utils.safeText(value, 160).toLowerCase(); }).join(' ');
            if (search && haystack.indexOf(search) === -1) return false;
            if (filter !== 'all' && entry.status !== filter) return false;
            return true;
        });
        body.innerHTML = '';
        if (!entries.length) {
            body.innerHTML = '<tr><td colspan="5"><div class="empty-state">No members match the current filters.</div></td></tr>';
            return;
        }
        entries.forEach(function (entry) {
            var detailUrl = entry.type === 'legacy' ? '/admin/member?legacy=' + encodeURIComponent(entry.id) : '/admin/members/' + encodeURIComponent(entry.id);
            var row = document.createElement('tr');
            row.innerHTML = '<td><strong>' + utils.escapeHtml(entry.member.fullName || 'Member') + '</strong><small>' + utils.escapeHtml(entry.member.email || 'No email') + '</small></td>'
                + '<td>' + utils.escapeHtml(entry.member.position || '—') + '</td>'
                + '<td>' + utils.escapeHtml(entry.member.memberCode || 'Pending') + '</td>'
                + '<td>' + utils.statusBadge(entry.status) + '</td>'
                + '<td><a class="btn btn-secondary" href="' + detailUrl + '">View</a></td>';
            body.appendChild(row);
        });
    }

    function renderTasksForMember(tasks, uid) {
        var list = $('memberTaskList');
        if (!list) return;
        list.innerHTML = '';
        var entries = Object.entries((tasks && tasks[uid]) || {}).sort(function (a, b) {
            return Number((b[1] && (b[1].updatedAt || b[1].createdAt)) || 0) - Number((a[1] && (a[1].updatedAt || a[1].createdAt)) || 0);
        });
        if (!entries.length) {
            list.innerHTML = '<div class="empty-state">No assignments yet. This area will update when work is assigned.</div>';
            return;
        }
        entries.forEach(function (entry) {
            var task = entry[1] || {};
            var item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = '<strong>' + utils.escapeHtml(task.title || 'Assigned task') + '</strong>'
                + '<p>Status: ' + utils.escapeHtml(String(task.status || 'pending').replace(/_/g, ' '))
                + (task.dueDate ? ' · Due ' + utils.escapeHtml(task.dueDate) : '')
                + (task.priority ? ' · ' + utils.escapeHtml(task.priority) + ' priority' : '') + '</p>'
                + '<p>' + utils.escapeHtml(task.notes || 'No instructions added.') + '</p>';
            list.appendChild(item);
        });
    }

    function findDetailEntry(data) {
        var legacy = utils.queryParam('legacy');
        if (legacy) {
            return buildMemberEntries(data).find(function (entry) { return entry.type === 'legacy' && entry.id === legacy; }) || null;
        }
        var id = utils.queryParam('id');
        return buildMemberEntries(data).find(function (entry) { return entry.type === 'member' && entry.id === id; }) || null;
    }

    function setValue(id, value) {
        var el = $(id);
        if (el) el.textContent = value || '—';
    }

    async function assignTask(ctx, entry) {
        if (!entry.workerUid) throw new Error('This member has not completed registration yet, so work cannot be assigned.');
        var project = utils.safeText($('taskProject').value, 120);
        var taskTitle = utils.safeText($('taskTitle').value, 160);
        var priority = utils.safeText($('taskPriority').value, 20) || 'medium';
        var dueDate = utils.safeText($('taskDueDate').value, 20);
        var instructions = utils.safeText($('taskInstructions').value, 2000);
        if (!project || !taskTitle) throw new Error('Please provide both a project name and a task title.');
        var title = project + ' — ' + taskTitle;
        var task = {
            title: title,
            status: 'pending',
            priority: /^(low|medium|high)$/.test(priority) ? priority : 'medium',
            dueDate: dueDate,
            notes: instructions,
            assignedBy: window.SeedwelFirebase.adminEmail,
            createdAt: window.firebase.database.ServerValue.TIMESTAMP,
            updatedAt: window.firebase.database.ServerValue.TIMESTAMP
        };
        await ctx.db.ref('tasks/' + entry.workerUid).push(task);
        await utils.recordAudit(ctx.db, 'Task assigned', entry.member.fullName || entry.id, title);
    }

    function renderDetail(data, entry) {
        if (!entry) {
            shared.setMessage('pageMessage', 'That member profile could not be found.', 'error');
            return;
        }
        setValue('memberName', entry.member.fullName || 'Member');
        if ($('memberStatus')) $('memberStatus').innerHTML = utils.statusBadge(entry.status);
        setValue('memberPosition', entry.member.position || '—');
        setValue('memberCode', entry.member.memberCode || 'Pending');
        setValue('memberEmail', entry.member.email || '—');
        setValue('memberPhone', entry.member.phone || '—');
        setValue('memberLocation', entry.member.location || '—');
        setValue('memberDepartment', entry.member.department || 'Operations');
        setValue('memberRoleType', entry.member.roleType || 'Member');
        setValue('memberExperience', entry.member.experience || '—');
        setValue('memberApplicationId', entry.member.applicationId || 'Legacy record');
        setValue('memberAuthUid', entry.workerUid || 'Pending registration');
        setValue('memberLastUpdated', utils.formatDateTime(entry.member.updatedAt || entry.member.createdAt));

        var assignmentBanner = $('assignmentBanner');
        if (assignmentBanner) {
            if (!entry.workerUid) {
                assignmentBanner.className = 'banner warning';
                assignmentBanner.textContent = 'This member has been approved, but registration is not complete yet. Generate or resend their invitation from Applications before assigning work.';
            } else {
                assignmentBanner.className = 'banner info';
                assignmentBanner.textContent = 'Assignments created here appear in the member dashboard immediately.';
            }
        }

        if ($('taskAssignForm')) {
            $('taskAssignForm').addEventListener('submit', function (event) {
                event.preventDefault();
                var button = $('assignTaskBtn');
                button.disabled = true;
                assignTask(shared, entry).then(function () {
                    shared.setMessage('pageMessage', 'Task assigned successfully.', 'success');
                    window.location.reload();
                }).catch(function (error) {
                    shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not assign the task.', 'error');
                }).finally(function () {
                    button.disabled = false;
                });
            });
        }
        renderTasksForMember(data.tasks, entry.workerUid);
    }

    shared.withAdminPage(async function (ctx) {
        var data = {
            members: await utils.getSnapshotMap(ctx.db.ref('members')),
            workers: await utils.getSnapshotMap(ctx.db.ref('workers')),
            invitations: await utils.getSnapshotMap(ctx.db.ref('registrationInvitations')),
            tasks: await utils.getSnapshotMap(ctx.db.ref('tasks')),
            applications: await utils.getSnapshotMap(ctx.db.ref('applications'))
        };

        if (document.body.getAttribute('data-page') === 'members') {
            renderList(data);
            var rerender = utils.debounce(function () { renderList(data); }, 120);
            if ($('memberSearch')) $('memberSearch').addEventListener('input', rerender);
            if ($('memberFilter')) $('memberFilter').addEventListener('change', function () { renderList(data); });
            if ($('refreshMembers')) $('refreshMembers').addEventListener('click', function () { window.location.reload(); });
            return;
        }

        renderDetail(data, findDetailEntry(data));
    });
})();
