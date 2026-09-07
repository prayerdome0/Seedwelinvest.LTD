(function () {
    'use strict';

    var utils = window.SeedwelRecruitment;
    var portal = window.SeedwelPortal;
    var wf = window.SeedwelWorkflow;
    var api = window.SeedwelTasks;
    var shared = window.SeedwelAdminShared;
    var $ = shared.$;
    var esc = portal.esc;

    var state = {
        usersByUid: {},
        workersByUid: {},
        data: null,
        rows: [],
        assignable: []
    };
    var filter = { search: '', status: '', assignee: '' };

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

    function isActive(record) {
        return String(record && record.status || '').toLowerCase() === 'active';
    }

    function buildAssignable() {
        var list = [];
        Object.keys(state.usersByUid).forEach(function (uid) {
            var record = state.usersByUid[uid] || {};
            var role = String(record.role || 'staff').toLowerCase();
            if (role === 'admin') return;
            if (!isActive(record)) return;
            list.push({
                uid: uid,
                name: record.fullName || record.name || record.email || 'Member',
                role: role,
                kind: role === 'client' ? 'client' : 'staff',
                position: record.position || record.role || ''
            });
        });
        Object.keys(state.workersByUid).forEach(function (uid) {
            if (state.usersByUid[uid]) return;
            var record = state.workersByUid[uid] || {};
            if (!isActive(record)) return;
            var role = /virtual\s*assistant/i.test(String(record.position || record.role || '')) ? 'manager' : 'staff';
            list.push({
                uid: uid,
                name: record.fullName || record.email || 'Member',
                role: role,
                kind: 'staff',
                position: record.position || record.role || ''
            });
        });
        list.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
        return list;
    }

    async function load() {
        var snapshots = await Promise.all([
            shared.db.ref('users').once('value'),
            shared.db.ref('workers').once('value')
        ]);
        state.usersByUid = snapshots[0].val() || {};
        state.workersByUid = snapshots[1].val() || {};
        state.data = await api.loadTaskData(shared.db);
        state.rows = api.taskRows(state.data);
        state.assignable = buildAssignable();
    }

    function renderMetrics() {
        var open = state.rows.filter(function (row) { return !wf.isCompleted(row.task.status); });
        var review = state.rows.filter(function (row) { return wf.isReviewStatus(row.task.status); });
        var overdue = state.rows.filter(function (row) { return api.isOverdue(row.task); });
        $('metricMembers').textContent = String(state.assignable.length);
        $('metricOpen').textContent = String(open.length);
        $('metricReview').textContent = String(review.length);
        $('metricOverdue').textContent = String(overdue.length);
    }

    function renderAssigneePicker() {
        var holder = $('assigneePick');
        holder.textContent = '';
        var positionSelect = $('taskTeamRole');
        positionSelect.textContent = '';
        var defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '— Individual only —';
        positionSelect.appendChild(defaultOption);

        if (!state.assignable.length) {
            holder.innerHTML = '<div class="empty-state" style="flex:1;">No active staff or client accounts to assign to yet.<br><small>Create accounts from Users &amp; Roles first.</small></div>';
            return;
        }
        var positions = [];
        state.assignable.forEach(function (member) {
            if (member.position && positions.indexOf(member.position) === -1) positions.push(member.position);
            var label = document.createElement('label');
            label.className = 'checkbox-row';
            label.style.padding = '10px 12px';
            label.style.border = '1px solid #e2e8f0';
            label.style.borderRadius = '14px';
            label.style.background = '#fff';
            label.innerHTML = '<input type="checkbox" name="assignee" value="' + esc(member.uid) + '" />'
                + '<span><strong>' + esc(member.name) + '</strong> · ' + esc(portal.roleLabel(member.role)) + '</span>';
            holder.appendChild(label);
        });
        positions.forEach(function (position) {
            var option = document.createElement('option');
            option.value = position;
            option.textContent = 'All: ' + position + 's (' + state.assignable.filter(function (m) { return m.position === position; }).length + ')';
            positionSelect.appendChild(option);
        });

        var filterSelect = $('assigneeFilter');
        filterSelect.textContent = '';
        var allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All assignees';
        filterSelect.appendChild(allOption);
        state.assignable.forEach(function (member) {
            var option = document.createElement('option');
            option.value = member.uid;
            option.textContent = member.name + ' · ' + portal.roleLabel(member.role);
            filterSelect.appendChild(option);
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

    function renderHistory(holder, task) {
        var history = [];
        Object.keys(task.history || {}).forEach(function (key) {
            history.push(Object.assign({}, task.history[key], { id: key }));
        });
        history.sort(function (a, b) { return Number(a.at || 0) - Number(b.at || 0); });
        if (!history.length) {
            holder.innerHTML = '<div class="empty-state">No history yet.</div>';
            return;
        }
        history.slice(-8).forEach(function (entry) {
            var item = document.createElement('div');
            item.className = 'timeline-item ' + (entry.action === 'Task approved' ? 'approved' : entry.action === 'Changes required' ? 'changes_required' : '');
            item.innerHTML = '<strong>' + esc(entry.actorName || entry.actor || 'System') + '</strong> · ' + esc(entry.action)
                + (entry.note ? ' — ' + esc(entry.note) : '')
                + '<time>' + esc(utils.formatDateTime(entry.at)) + '</time>';
            holder.appendChild(item);
        });
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
            item.className = 'comment-item ' + esc(comment.kind || 'manager');
            item.innerHTML = '<span class="who">' + esc(comment.byName || comment.by || 'Team') + '</span>'
                + '<span class="when">' + esc(utils.formatDateTime(comment.at)) + '</span>'
                + esc(comment.text);
            holder.appendChild(item);
        });

        var form = document.createElement('div');
        form.className = 'approve-tools';
        var textarea = document.createElement('textarea');
        textarea.maxLength = 2000;
        textarea.placeholder = 'Leave a comment for ' + (row.kind === 'client' ? 'the client' : esc(displayName(row.uid))) + '…';
        var send = document.createElement('button');
        send.type = 'button';
        send.className = 'wf-btn';
        send.innerHTML = '<i class="fa-solid fa-comment"></i> Add comment';
        send.addEventListener('click', async function () {
            var text = textarea.value.trim();
            if (!text) return;
            send.disabled = true;
            try {
                await api.comment(shared.db, row.kind === 'client' ? 'clientTasks/' + row.uid : 'tasks/' + row.uid, row.taskId, {
                    by: state.actorEmail,
                    byName: state.actorName,
                    kind: 'manager',
                    text: text
                });
                await portal.notify(row.uid, 'New comment on ' + (task.title || 'your task'), text, row.kind === 'client' ? 'portal/client#tasks' : 'dashboard#tasks', 'task');
                await load();
                renderAll();
                shared.setMessage('pageMessage', 'Comment added.', 'success');
            } catch (error) {
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not add the comment.', 'error');
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

    function taskCard(row, alwaysReview) {
        var task = row.task || {};
        var card = document.createElement('article');
        card.className = 'task-card';
        card.dataset.uid = row.uid;
        card.dataset.taskId = row.taskId;
        card.dataset.kind = row.kind;

        var head = document.createElement('div');
        head.className = 'task-card-head';
        head.innerHTML = '<strong>' + esc(task.title || 'Untitled task') + '</strong>' + pill(task.status);
        card.appendChild(head);

        var metaRow = document.createElement('div');
        metaRow.className = 'task-meta';
        metaRow.innerHTML = '<span><i class="fa-solid fa-user"></i> ' + esc(row.kind === 'client' ? (task.assignedToName || displayName(row.uid)) + ' · Client / Business' : displayName(row.uid) + ' · ' + esc(roleLabelFor(row.uid))) + '</span>'
            + '<span><i class="fa-solid fa-flag"></i> ' + esc(String(task.priority || 'medium').replace(/^\w/, function (c) { return c.toUpperCase(); })) + '</span>'
            + dueMark(task)
            + (task.category ? '<span><i class="fa-solid fa-tag"></i> ' + esc(task.category) + '</span>' : '')
            + (task.teamRole ? '<span><i class="fa-solid fa-users"></i> ' + esc(task.teamRole) + ' team</span>' : '')
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
            warn.innerHTML = '<strong><i class="fa-solid fa-pen-to-square"></i> Feedback</strong>' + esc(task.reviewNote);
            card.appendChild(warn);
        } else if (wf.isCompleted(task.status) && task.reviewNote) {
            var ok = document.createElement('div');
            ok.className = 'review-box';
            ok.innerHTML = '<strong><i class="fa-solid fa-circle-check"></i> Approval note</strong>' + esc(task.reviewNote);
            card.appendChild(ok);
        }

        var actions = wf.managerActions(task.status);
        if (actions.length) {
            var actionRow = document.createElement('div');
            actionRow.className = 'task-actions';
            actions.forEach(function (action) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'wf-btn ' + action.cls;
                btn.innerHTML = '<i class="fas ' + action.icon + '"></i> ' + esc(action.label);
                btn.addEventListener('click', function () {
                    runReview(row, action.to, null);
                });
                actionRow.appendChild(btn);
            });
            card.appendChild(actionRow);
        }

        if (wf.isReviewStatus(task.status) || alwaysReview) {
            var tools = document.createElement('div');
            tools.className = 'approve-tools';
            var note = document.createElement('textarea');
            note.maxLength = 1000;
            note.placeholder = 'Optional note for the assignee…';
            tools.appendChild(note);
            var rowBtns = document.createElement('div');
            rowBtns.className = 'row';
            var approveBtn = document.createElement('button');
            approveBtn.type = 'button';
            approveBtn.className = 'wf-btn success';
            approveBtn.innerHTML = '<i class="fas fa-circle-check"></i> Approve';
            approveBtn.addEventListener('click', function () { runReview(row, 'approved', note.value); });
            var rejectBtn = document.createElement('button');
            rejectBtn.type = 'button';
            rejectBtn.className = 'wf-btn danger';
            rejectBtn.innerHTML = '<i class="fas fa-pen-to-square"></i> Request changes';
            rejectBtn.addEventListener('click', function () {
                if (!note.value.trim()) {
                    note.focus();
                    note.placeholder = 'Please explain what needs to change first.';
                    return;
                }
                runReview(row, 'changes_required', note.value);
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
        renderHistory(timeline, task);
        card.appendChild(timeline);
        return card;
    }

    async function runReview(row, status, note) {
        var task = row.task || {};
        var path = row.kind === 'client' ? 'clientTasks/' + row.uid : 'tasks/' + row.uid;
        try {
            await api.updateStatus(shared.db, path, row.taskId, {
                status: status,
                note: String(note || '').trim(),
                actor: { uid: state.actorUid, name: state.actorName, email: state.actorEmail }
            });
            var title = status === 'approved' ? 'Task approved' : status === 'changes_required' ? 'Changes requested' : 'Task reopened';
            await portal.notify(row.uid, title + ': ' + (task.title || 'task'), String(note || '').trim() || 'Please check your tasks.', row.kind === 'client' ? 'portal/client#tasks' : 'dashboard#tasks', 'task');
            await load();
            renderAll();
            shared.setMessage('pageMessage', title + ' — saved.', 'success');
        } catch (error) {
            console.error(error);
            shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not update the task.', 'error');
        }
    }

    function filteredRows() {
        var rows = state.rows.slice();
        var search = filter.search.toLowerCase();
        if (search) {
            rows = rows.filter(function (row) {
                var task = row.task || {};
                var haystack = [task.title, task.description, task.assignedToName, task.clientName, displayName(row.uid), task.category, task.teamRole].join(' ').toLowerCase();
                return haystack.indexOf(search) !== -1;
            });
        }
        if (filter.assignee) rows = rows.filter(function (row) { return row.uid === filter.assignee; });
        if (filter.status === 'overdue') {
            rows = rows.filter(function (row) { return api.isOverdue(row.task); });
        } else if (filter.status) {
            rows = rows.filter(function (row) {
                var status = String(row.task.status || 'pending').toLowerCase();
                return status === filter.status || (filter.status === 'approved' && status === 'completed');
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
            list.innerHTML = '<div class="empty-state">No tasks match this view.<br><small>Create one above, or change the filters.</small></div>';
            return;
        }
        rows.forEach(function (row) {
            list.appendChild(taskCard(row, wf.isReviewStatus(row.task.status)));
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
                    person: row.kind === 'client' ? (task.assignedToName || displayName(row.uid)) : displayName(row.uid)
                }));
            });
        });
        events.sort(function (a, b) { return Number(b.at || 0) - Number(a.at || 0); });
        if (!events.length) {
            feed.innerHTML = '<div class="empty-state">No task activity yet.</div>';
            return;
        }
        events.slice(0, 40).forEach(function (event) {
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
        renderAssigneePicker();
        renderTasks();
        renderActivity();
    }

    shared.withAdminPage(async function (ctx) {
        state.actorUid = ctx.user.uid;
        state.actorName = 'Administrator';
        state.actorEmail = ctx.user.email || window.SeedwelFirebase.adminEmail;

        $('taskDue').min = new Date().toISOString().slice(0, 10);
        $('taskSearch').addEventListener('input', function (event) {
            filter.search = event.target.value;
            renderTasks();
        });
        $('taskStatusFilter').addEventListener('change', function (event) {
            filter.status = event.target.value;
            renderTasks();
        });
        $('assigneeFilter').addEventListener('change', function (event) {
            filter.assignee = event.target.value;
            renderTasks();
        });

        $('createTaskForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            var title = $('taskTitle').value.trim();
            var description = $('taskDescription').value.trim();
            if (title.length < 2) { shared.setMessage('pageMessage', 'Give the task a title (at least 2 characters).', 'error'); return; }
            if (description.length < 2) { shared.setMessage('pageMessage', 'Describe what needs to be done.', 'error'); return; }

            var checked = Array.prototype.slice.call(document.querySelectorAll('#assigneePick input[name="assignee"]:checked'))
                .map(function (input) { return input.value; });
            var teamRole = $('taskTeamRole').value;
            if (teamRole) {
                state.assignable.forEach(function (member) {
                    if (member.position === teamRole && checked.indexOf(member.uid) === -1) checked.push(member.uid);
                });
            }
            if (!checked.length) {
                shared.setMessage('pageMessage', 'Choose at least one assignee, or a team role.', 'error');
                return;
            }

            var button = $('createTaskBtn');
            button.disabled = true;
            try {
                var staff = checked.map(function (uid) {
                    var member = state.assignable.filter(function (m) { return m.uid === uid; })[0];
                    return { uid: uid, name: member ? member.name : displayName(uid), role: member ? member.role : 'staff' };
                });
                var clients = staff.filter(function (entry) {
                    return state.assignable.some(function (m) { return m.uid === entry.uid && m.kind === 'client'; });
                });
                var teamMembers = staff.filter(function (entry) {
                    return !state.assignable.some(function (m) { return m.uid === entry.uid && m.kind === 'client'; });
                });
                if (!teamMembers.length && !clients.length) {
                    shared.setMessage('pageMessage', 'Choose at least one assignee.', 'error');
                    button.disabled = false;
                    return;
                }
                var base = {
                    title: title,
                    description: description,
                    category: $('taskCategory').value,
                    priority: $('taskPriority').value,
                    dueDate: $('taskDue').value,
                    teamRole: teamRole,
                    teamName: teamRole || '',
                    creator: { uid: state.actorUid, name: state.actorName, email: state.actorEmail }
                };
                if (clients.length) {
                    for (var i = 0; i < clients.length; i += 1) {
                        await api.createTask(shared.db, Object.assign({}, base, {
                            staff: teamMembers,
                            client: { uid: clients[i].uid, name: clients[i].name }
                        }));
                    }
                } else {
                    await api.createTask(shared.db, Object.assign({}, base, { staff: teamMembers, client: null }));
                }
                $('createTaskForm').reset();
                $('taskDue').min = new Date().toISOString().slice(0, 10);
                await load();
                renderAll();
                shared.setMessage('pageMessage', 'Task created and assigned.', 'success');
            } catch (error) {
                console.error(error);
                shared.setMessage('pageMessage', error && error.message ? error.message : 'Could not create the task.', 'error');
            } finally {
                button.disabled = false;
            }
        });

        await load();
        renderAll();
    });
})();
