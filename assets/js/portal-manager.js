(function () {
    'use strict';

    var portal = window.SeedwelPortal;
    var utils = window.SeedwelRecruitment;
    var wf = window.SeedwelWorkflow;
    var api = window.SeedwelTasks;
    var $ = portal.$;
    var esc = portal.esc;

    var state = {
        account: null,
        usersByUid: {},
        workersByUid: {},
        data: null,
        team: [],
        teamUids: new Set(),
        rows: []
    };

    function msg(text, ok) {
        var el = $('pageMessage');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'msg ' + (text ? (ok ? 'success' : 'error') : '');
        el.style.display = text ? 'block' : 'none';
    }

    function initials(name) {
        var parts = String(name || '').trim().split(/\s+/);
        var first = (parts[0] || '?')[0] || '?';
        var last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
        return (first + last).toUpperCase();
    }

    function displayName(uid) {
        var user = state.usersByUid[uid];
        if (user) return user.fullName || user.name || user.email || 'Member';
        var worker = state.workersByUid[uid];
        return worker ? (worker.fullName || worker.email || 'Member') : 'Member';
    }

    function roleLabelFor(uid) {
        var user = state.usersByUid[uid];
        if (!user) return 'Staff';
        return portal.roleLabel(user.role || 'staff');
    }

    function teamMembers() {
        var me = state.account.uid;
        var mineEmail = String(state.account.email || '').toLowerCase();
        var members = [];
        Object.keys(state.usersByUid).forEach(function (uid) {
            if (uid === me) return;
            var record = state.usersByUid[uid] || {};
            var byId = String(record.assignedManagerId || '') === me;
            var byEmail = String(record.assignedManagerEmail || '').toLowerCase() === mineEmail;
            if (byId || byEmail) members.push({ uid: uid, record: record, legacy: false });
        });
        Object.keys(state.workersByUid).forEach(function (uid) {
            if (uid === me || state.usersByUid[uid]) return;
            var record = state.workersByUid[uid] || {};
            var byId = String(record.assignedManagerId || '') === me;
            var byEmail = String(record.assignedManagerEmail || '').toLowerCase() === mineEmail;
            if (byId || byEmail) members.push({ uid: uid, record: record, legacy: true });
        });
        members.sort(function (a, b) {
            return String(displayName(a.uid)).localeCompare(String(displayName(b.uid)));
        });
        return members;
    }

    function isActive(record) {
        return String(record && record.status || '').toLowerCase() === 'active';
    }

    async function load() {
        var ctx = { db: window.SeedwelPortal.db };
        var snaps = await Promise.all([
            window.SeedwelPortal.db.ref('users').once('value'),
            window.SeedwelPortal.db.ref('workers').once('value')
        ]);
        state.usersByUid = snaps[0].val() || {};
        state.workersByUid = snaps[1].val() || {};
        state.data = await api.loadTaskData(window.SeedwelPortal.db);
        state.team = teamMembers();
        state.teamUids = new Set(state.team.map(function (m) { return m.uid; }));
        state.rows = api.taskRows(state.data).filter(function (row) {
            return row.kind === 'staff' && state.teamUids.has(row.uid);
        });
    }

    function renderMetrics() {
        var rows = state.rows;
        var open = rows.filter(function (r) { return !wf.isCompleted(r.task.status); });
        var review = rows.filter(function (r) { return wf.isReviewStatus(r.task.status); });
        var overdue = rows.filter(function (r) { return api.isOverdue(r.task); });
        $('metricTeam').textContent = String(state.team.length);
        $('metricOpen').textContent = String(open.length);
        $('metricReview').textContent = String(review.length);
        $('metricOverdue').textContent = String(overdue.length);
    }

    function renderTeam() {
        var grid = $('teamGrid');
        grid.textContent = '';
        if (!state.team.length) {
            grid.innerHTML = '<div class="empty-state">No team members assigned to you yet. The administrator assigns staff to managers.<br><small>Once assigned, their work will appear here automatically.</small></div>';
            return;
        }
        state.team.forEach(function (member) {
            var uid = member.uid;
            var count = state.rows.filter(function (r) { return r.uid === uid && !wf.isCompleted(r.task.status); }).length;
            var card = document.createElement('article');
            card.className = 'person-card';
            card.innerHTML = '<div class="avatar">' + esc(initials(displayName(uid))) + '</div>'
                + '<div><strong>' + esc(displayName(uid)) + '</strong><small>' + esc(roleLabelFor(uid)) + '</small></div>'
                + '<div><span class="wf-pill ' + (isActive(member.record) ? 'approved' : 'changes_required') + '">' + (isActive(member.record) ? 'Active' : 'Inactive') + '</span></div>'
                + '<small>' + count + ' open task' + (count === 1 ? '' : 's') + '</small>';
            grid.appendChild(card);
        });

        var tbody = $('teamTable');
        tbody.textContent = '';
        if (!state.team.length) {
            tbody.innerHTML = '<tr><td colspan="5">No team members assigned yet.</td></tr>';
            return;
        }
        state.team.forEach(function (member) {
            var uid = member.uid;
            var open = state.rows.filter(function (r) { return r.uid === uid && !wf.isCompleted(r.task.status); }).length;
            var total = state.rows.filter(function (r) { return r.uid === uid; }).length;
            var tr = document.createElement('tr');
            tr.innerHTML = '<td><strong>' + esc(displayName(uid)) + '</strong><small>' + esc(member.record.email || '') + '</small></td>'
                + '<td>' + esc(roleLabelFor(uid)) + '</td>'
                + '<td><span class="wf-pill ' + (isActive(member.record) ? 'approved' : 'changes_required') + '">' + (isActive(member.record) ? 'Active' : 'Inactive') + '</span></td>'
                + '<td>' + open + ' open · ' + total + ' total</td>'
                + '<td>' + esc(utils.formatDate(member.record.createdAt || member.record.approvedAt)) + '</td>';
            tbody.appendChild(tr);
        });
    }

    function renderAssigneePicker() {
        var holder = $('assigneePick');
        holder.textContent = '';
        var active = state.team.filter(function (m) { return isActive(m.record); });
        if (!active.length) {
            holder.innerHTML = '<div class="empty-state" style="flex:1;">No active team members to assign work to yet.</div>';
            return;
        }
        active.forEach(function (member) {
            var label = document.createElement('label');
            label.className = 'checkbox-row';
            label.style.padding = '10px 12px';
            label.style.border = '1px solid #e2e8f0';
            label.style.borderRadius = '14px';
            label.style.background = '#fff';
            label.innerHTML = '<input type="checkbox" name="assignee" value="' + esc(member.uid) + '" '
                + (state.team.length === 1 ? 'checked ' : '')
                + '/><span><strong>' + esc(displayName(member.uid)) + '</strong> · ' + esc(roleLabelFor(member.uid)) + '</span>';
            holder.appendChild(label);
        });
        var positionSelect = $('taskTeamRole');
        positionSelect.textContent = '';
        var defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '— Individual only —';
        positionSelect.appendChild(defaultOption);
        var positions = [];
        active.forEach(function (member) {
            var record = member.record;
            var pos = String(record.position || record.role || '');
            if (pos && positions.indexOf(pos) === -1) positions.push(pos);
        });
        positions.forEach(function (position) {
            var option = document.createElement('option');
            option.value = position;
            option.textContent = 'All: ' + position + 's (' + active.filter(function (m) { return String(m.record.position || m.record.role || '') === position; }).length + ')';
            positionSelect.appendChild(option);
        });
    }

    function pill(status) {
        var meta = wf.meta(status);
        return '<span class="wf-pill ' + esc(meta.className) + '"><i class="fas ' + esc(meta.icon) + '"></i> ' + esc(meta.label) + '</span>';
    }

    function dueMark(task) {
        var due = String(task.dueDate || '');
        if (!due) return '';
        var overdue = api.isOverdue(task);
        return '<span class="' + (overdue ? 'overdue' : '') + '"><i class="fa-regular fa-calendar"></i> Due ' + esc(due) + (overdue ? ' · overdue' : '') + '</span>';
    }

    function taskCard(row, opts) {
        var task = row.task || {};
        var meta = wf.meta(task.status);
        var card = document.createElement('article');
        card.className = 'task-card';
        card.dataset.taskId = row.taskId;
        card.dataset.uid = row.uid;

        var head = document.createElement('div');
        head.className = 'task-card-head';
        head.innerHTML = '<strong>' + esc(task.title || 'Untitled task') + '</strong>' + pill(task.status);
        card.appendChild(head);

        var metaRow = document.createElement('div');
        metaRow.className = 'task-meta';
        var person = row.kind === 'client' ? esc(task.assignedToName || displayName(row.uid)) : esc(displayName(row.uid));
        metaRow.innerHTML = '<span><i class="fa-solid fa-user"></i> ' + person + ' · ' + esc(roleLabelFor(row.uid)) + '</span>'
            + '<span><i class="fa-solid fa-flag"></i> ' + esc(String(task.priority || 'medium').replace(/^\w/, function (c) { return c.toUpperCase(); })) + '</span>'
            + dueMark(task)
            + (task.category ? '<span><i class="fa-solid fa-tag"></i> ' + esc(task.category) + '</span>' : '')
            + (task.clientName ? '<span><i class="fa-solid fa-building"></i> ' + esc(task.clientName) + '</span>' : '');
        card.appendChild(metaRow);

        if (task.description) {
            var copy = document.createElement('p');
            copy.className = 'task-copy';
            copy.textContent = String(task.description);
            card.appendChild(copy);
        }

        if (task.status === 'changes_required' && task.reviewNote) {
            var warn = document.createElement('div');
            warn.className = 'review-box warn';
            warn.innerHTML = '<strong><i class="fa-solid fa-pen-to-square"></i> Manager feedback</strong>' + esc(task.reviewNote);
            card.appendChild(warn);
        } else if (wf.isCompleted(task.status) && task.reviewNote) {
            var ok = document.createElement('div');
            ok.className = 'review-box';
            ok.innerHTML = '<strong><i class="fa-solid fa-circle-check"></i> Approval note</strong>' + esc(task.reviewNote);
            card.appendChild(ok);
        }

        var actions = wf.managerActions(task.status);
        if (actions.length || opts && opts.alwaysReview) {
            var actionRow = document.createElement('div');
            actionRow.className = 'task-actions';
            actions.forEach(function (action) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'wf-btn ' + action.cls;
                btn.innerHTML = '<i class="fas ' + action.icon + '"></i> ' + esc(action.label);
                btn.addEventListener('click', function () {
                    runReview(row, action.to, action.key);
                });
                actionRow.appendChild(btn);
            });
            card.appendChild(actionRow);
        }

        if (wf.isReviewStatus(task.status) || (opts && opts.alwaysReview)) {
            var tools = document.createElement('div');
            tools.className = 'approve-tools';
            var note = document.createElement('textarea');
            note.maxLength = 1000;
            note.placeholder = 'Optional note for the team member (a reason is appreciated when requesting changes)…';
            note.setAttribute('aria-label', 'Review note');
            tools.appendChild(note);
            var rowBtns = document.createElement('div');
            rowBtns.className = 'row';
            var approveBtn = document.createElement('button');
            approveBtn.type = 'button';
            approveBtn.className = 'wf-btn success';
            approveBtn.innerHTML = '<i class="fas fa-circle-check"></i> Approve';
            approveBtn.addEventListener('click', function () {
                runReview(row, 'approved', 'approve', note.value);
            });
            var rejectBtn = document.createElement('button');
            rejectBtn.type = 'button';
            rejectBtn.className = 'wf-btn danger';
            rejectBtn.innerHTML = '<i class="fas fa-pen-to-square"></i> Request changes';
            rejectBtn.addEventListener('click', function () {
                if (!note.value.trim()) {
                    note.focus();
                    note.placeholder = 'Please tell them what needs to change before requesting changes.';
                    return;
                }
                runReview(row, 'changes_required', 'reject', note.value);
            });
            rowBtns.append(approveBtn, rejectBtn);
            tools.appendChild(rowBtns);
            card.appendChild(tools);
        }

        renderComments(card, row);

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'wf-btn ghost';
        toggle.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> History';
        toggle.addEventListener('click', function () {
            var time = card.querySelector('.timeline');
            if (time) time.hidden = !time.hidden;
        });
        card.appendChild(toggle);
        var timeline = document.createElement('div');
        timeline.className = 'timeline';
        timeline.hidden = true;
        timeline.appendChild(renderHistory(row));
        card.appendChild(timeline);

        return card;
    }

    function renderHistory(row) {
        var holder = document.createElement('div');
        var task = row.task || {};
        var history = [];
        Object.keys(task.history || {}).forEach(function (key) {
            history.push(Object.assign({}, task.history[key], { id: key }));
        });
        history.sort(function (a, b) { return Number(a.at || 0) - Number(b.at || 0); });
        if (!history.length) {
            holder.innerHTML = '<div class="empty-state">No history yet.</div>';
            return holder;
        }
        history.slice(-8).forEach(function (entry) {
            var item = document.createElement('div');
            item.className = 'timeline-item ' + (entry.action === 'Task approved' ? 'approved' : entry.action === 'Changes required' ? 'changes_required' : '');
            item.innerHTML = '<strong>' + esc(entry.actorName || entry.actor || 'System') + '</strong> · ' + esc(entry.action)
                + (entry.note ? ' — ' + esc(entry.note) : '')
                + '<time>' + esc(utils.formatDateTime(entry.at)) + '</time>';
            holder.appendChild(item);
        });
        return holder;
    }

    function renderComments(card, row) {
        var task = row.task || {};
        var comments = [];
        Object.keys(task.comments || {}).forEach(function (key) {
            comments.push(Object.assign({}, task.comments[key], { id: key }));
        });
        comments.sort(function (a, b) { return Number(a.at || 0) - Number(b.at || 0); });

        var holder = document.createElement('div');
        holder.className = 'task-comments';
        var title = document.createElement('strong');
        title.textContent = 'Comments (' + comments.length + ')';
        holder.appendChild(title);
        comments.slice(-5).forEach(function (comment) {
            var item = document.createElement('div');
            item.className = 'comment-item ' + esc(comment.kind || 'staff');
            item.innerHTML = '<span class="who">' + esc(comment.byName || comment.by || 'Team') + '</span>'
                + '<span class="when">' + esc(utils.formatDateTime(comment.at)) + '</span>'
                + esc(comment.text);
            holder.appendChild(item);
        });

        var form = document.createElement('div');
        form.className = 'approve-tools';
        var textarea = document.createElement('textarea');
        textarea.maxLength = 2000;
        textarea.placeholder = 'Leave a comment for ' + esc(displayName(row.uid)) + '…';
        var send = document.createElement('button');
        send.type = 'button';
        send.className = 'wf-btn';
        send.innerHTML = '<i class="fa-solid fa-comment"></i> Add comment';
        send.addEventListener('click', async function () {
            var text = textarea.value.trim();
            if (!text) return;
            send.disabled = true;
            try {
                await api.comment(window.SeedwelPortal.db, 'tasks/' + row.uid, row.taskId, {
                    by: state.account.email,
                    byName: state.account.fullName || state.account.email,
                    kind: 'manager',
                    text: text
                });
                await portal.notify(row.uid, 'New comment on ' + (task.title || 'your task'), text, 'dashboard#tasks', 'task');
                await load();
                renderAll();
                msg('Comment added.', true);
            } catch (error) {
                msg(error && error.message ? error.message : 'Could not add the comment.', false);
                send.disabled = false;
            }
        });
        var rowBtns = document.createElement('div');
        rowBtns.className = 'row';
        rowBtns.appendChild(send);
        form.appendChild(textarea);
        form.appendChild(rowBtns);
        holder.appendChild(form);
        card.appendChild(holder);
    }

    async function runReview(row, status, actionKey, note) {
        var task = row.task || {};
        var actor = { uid: state.account.uid, name: state.account.fullName || state.account.email, email: state.account.email };
        try {
            await api.updateStatus(window.SeedwelPortal.db, 'tasks/' + row.uid, row.taskId, {
                status: status,
                note: String(note || '').trim(),
                actor: actor
            });
            var title = status === 'approved' ? 'Task approved' : status === 'changes_required' ? 'Changes requested' : 'Task reopened';
            await portal.notify(row.uid, title + ': ' + (task.title || 'task'), String(note || '').trim() || 'Please check your tasks.', 'dashboard#tasks', 'task');
            await load();
            renderAll();
            msg(title + ' — saved.', true);
        } catch (error) {
            console.error(error);
            msg(error && error.message ? error.message : 'Could not update the task.', false);
        }
    }

    var currentFilter = { search: '', status: '' };

    function filteredRows() {
        var rows = state.rows.slice();
        var search = currentFilter.search.toLowerCase();
        if (search) {
            rows = rows.filter(function (row) {
                var task = row.task || {};
                var haystack = [task.title, task.description, task.assignedToName, displayName(row.uid), task.category].join(' ').toLowerCase();
                return haystack.indexOf(search) !== -1;
            });
        }
        if (currentFilter.status === 'overdue') {
            rows = rows.filter(function (row) { return api.isOverdue(row.task); });
        } else if (currentFilter.status) {
            rows = rows.filter(function (row) {
                var status = String(row.task.status || 'pending').toLowerCase();
                return status === currentFilter.status || (currentFilter.status === 'approved' && status === 'completed');
            });
        }
        rows.sort(function (a, b) {
            var p = { urgent: 0, high: 1, medium: 2, low: 3 };
            var prio = (p[String((a.task || {}).priority || 'medium')] || 2) - (p[String((b.task || {}).priority || 'medium')] || 2);
            return prio || String((a.task || {}).dueDate || '9999').localeCompare(String((b.task || {}).dueDate || '9999'));
        });
        return rows;
    }

    function renderTasks() {
        var list = $('taskList');
        list.textContent = '';
        var rows = filteredRows();
        if (!rows.length) {
            list.innerHTML = '<div class="empty-state">No tasks match this view.<br><small>Create one in Assign Work, or change the filters above.</small></div>';
            return;
        }
        rows.forEach(function (row) {
            list.appendChild(taskCard(row, { alwaysReview: wf.isReviewStatus(row.task.status) }));
        });
    }

    function renderApprovals() {
        var list = $('approvalList');
        list.textContent = '';
        var rows = state.rows.filter(function (row) { return wf.isReviewStatus(row.task.status); });
        if (!rows.length) {
            list.innerHTML = '<div class="empty-state">Nothing is waiting for your approval right now.</div>';
            return;
        }
        rows.forEach(function (row) {
            list.appendChild(taskCard(row, { alwaysReview: true }));
        });
    }

    function renderActivity() {
        var feed = $('activityFeed');
        feed.textContent = '';
        var events = [];
        state.rows.forEach(function (row) {
            var task = row.task || {};
            Object.keys(task.history || {}).forEach(function (key) {
                var entry = task.history[key] || {};
                events.push(Object.assign({}, entry, {
                    taskTitle: task.title || 'Untitled task',
                    person: displayName(row.uid)
                }));
            });
        });
        events.sort(function (a, b) { return Number(b.at || 0) - Number(a.at || 0); });
        if (!events.length) {
            feed.innerHTML = '<div class="empty-state">No task activity yet for your team.</div>';
            return;
        }
        events.slice(0, 30).forEach(function (event) {
            var item = document.createElement('div');
            item.className = 'timeline-item ' + (event.action === 'Task approved' ? 'approved' : event.action === 'Changes required' ? 'changes_required' : '');
            item.innerHTML = '<strong>' + esc(event.actorName || event.actor || 'System') + '</strong> · ' + esc(event.action)
                + ' — <strong>' + esc(event.person) + '</strong> · ' + esc(event.taskTitle)
                + (event.note ? ' <span>(' + esc(event.note) + ')</span>' : '')
                + '<time>' + esc(utils.formatDateTime(event.at)) + '</time>';
            feed.appendChild(item);
        });
    }

    function renderAll() {
        renderMetrics();
        renderTeam();
        renderAssigneePicker();
        renderTasks();
        renderApprovals();
        renderActivity();
    }

    portal.gate(['manager'], async function (ctx) {
        state.account = ctx.account;
        portal.bindShell(ctx.account, 'overview');
        $('welcomeName').textContent = ctx.account.fullName || ctx.account.email || 'Manager';
        $('taskDue').min = new Date().toISOString().slice(0, 10);

        $('taskSearch').addEventListener('input', function (event) {
            currentFilter.search = event.target.value;
            renderTasks();
        });
        $('taskStatusFilter').addEventListener('change', function (event) {
            currentFilter.status = event.target.value;
            renderTasks();
        });

        $('createTaskForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            var title = $('taskTitle').value.trim();
            var description = $('taskDescription').value.trim();
            if (title.length < 2) { msg('Give the task a title (at least 2 characters).', false); return; }
            if (description.length < 2) { msg('Describe what needs to be done.', false); return; }

            var checked = Array.prototype.slice.call(document.querySelectorAll('#assigneePick input[name="assignee"]:checked'))
                .map(function (input) { return input.value; });
            var teamRole = $('taskTeamRole').value;
            if (teamRole) {
                state.team.forEach(function (member) {
                    if (isActive(member.record) && String(member.record.position || member.record.role || '') === teamRole) {
                        if (checked.indexOf(member.uid) === -1) checked.push(member.uid);
                    }
                });
            }
            if (!checked.length) { msg('Choose at least one team member or a team role.', false); return; }

            var button = $('createTaskBtn');
            button.disabled = true;
            try {
                await api.createTask(window.SeedwelPortal.db, {
                    title: title,
                    description: description,
                    category: $('taskCategory').value,
                    priority: $('taskPriority').value,
                    dueDate: $('taskDue').value,
                    teamRole: teamRole,
                    teamName: teamRole || '',
                    staff: checked.map(function (uid) {
                        return { uid: uid, name: displayName(uid), role: roleLabelFor(uid) };
                    }),
                    client: null,
                    creator: { uid: ctx.account.uid, name: ctx.account.fullName || ctx.account.email, email: ctx.account.email }
                });
                $('createTaskForm').reset();
                $('taskDue').min = new Date().toISOString().slice(0, 10);
                await load();
                renderAll();
                msg('Task created and assigned to ' + checked.length + ' team member(s).', true);
            } catch (error) {
                console.error(error);
                msg(error && error.message ? error.message : 'Could not create the task.', false);
            } finally {
                button.disabled = false;
            }
        });

        await load();
        renderAll();
    });
})();
