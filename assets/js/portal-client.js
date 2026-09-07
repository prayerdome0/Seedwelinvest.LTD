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
        tasks: [],
        requests: []
    };
    var filter = { search: '', status: '' };

    function msg(text, ok) {
        var el = $('pageMessage');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'msg ' + (text ? (ok ? 'success' : 'error') : '');
        el.style.display = text ? 'block' : 'none';
    }

    function formMsg(id, text, ok) {
        var el = $(id);
        if (!el) return;
        el.textContent = text || '';
        el.className = 'form-msg ' + (text ? (ok ? 'success' : 'error') : '');
    }

    async function load() {
        var uid = state.account.uid;
        var snapshots = await Promise.all([
            window.SeedwelPortal.db.ref('clientTasks/' + uid).once('value'),
            window.SeedwelPortal.db.ref('clientRequests/' + uid).once('value')
        ]);
        var tasksMap = snapshots[0].val() || {};
        state.tasks = Object.keys(tasksMap).map(function (taskId) {
            return { taskId: taskId, task: tasksMap[taskId] || {} };
        }).sort(function (a, b) {
            return Number((b.task.createdAt || 0)) - Number((a.task.createdAt || 0));
        });

        var requestsMap = snapshots[1].val() || {};
        state.requests = Object.keys(requestsMap).map(function (requestId) {
            return { requestId: requestId, request: requestsMap[requestId] || {} };
        }).sort(function (a, b) {
            return Number((b.request.submittedAt || 0)) - Number((a.request.submittedAt || 0));
        });
    }

    function liveRequestStatus(row) {
        var status = String(row.request.status || 'new');
        // Prefer the live record when the database allows this client to read it.
        return status;
    }

    function requestStatusLabel(status) {
        var labels = {
            new: 'New',
            reviewing: 'Reviewing',
            assigned: 'Assigned',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        return labels[String(status || 'new').toLowerCase()] || String(status || 'New');
    }

    function requestStatusClass(status) {
        var value = String(status || 'new').toLowerCase();
        return 'wf-pill ' + (value === 'completed' ? 'approved' : value === 'cancelled' ? 'changes_required' : value === 'new' ? 'pending' : 'in_progress');
    }

    async function renderMetrics() {
        var requests = state.requests.length;
        var open = state.tasks.filter(function (row) { return !wf.isCompleted(row.task.status); }).length;
        var approved = state.tasks.filter(function (row) { return wf.isCompleted(row.task.status); }).length;
        var overdue = state.tasks.filter(function (row) { return api.isOverdue(row.task); }).length;
        $('metricRequests').textContent = String(requests);
        $('metricOpen').textContent = String(open);
        $('metricApproved').textContent = String(approved);
        $('metricOverdue').textContent = String(overdue);
    }

    function renderRequests() {
        var list = $('requestList');
        list.textContent = '';
        if (!state.requests.length) {
            list.innerHTML = '<div class="empty-state">No service requests yet.<br><small>Use the form above to request a service from Seedwel Investment LTD.</small></div>';
            return;
        }
        state.requests.forEach(function (row) {
            var request = row.request || {};
            var status = liveRequestStatus(row);
            var card = document.createElement('article');
            card.className = 'task-card';
            card.innerHTML = '<div class="task-card-head"><strong>' + esc(request.serviceLabel || request.service || 'Service request') + '</strong>'
                + '<span class="' + requestStatusClass(status) + '">' + esc(requestStatusLabel(status)) + '</span></div>'
                + '<div class="task-meta"><span><i class="fa-regular fa-calendar"></i> ' + esc(utils.formatDateTime(request.submittedAt)) + '</span>'
                + (request.businessName ? '<span><i class="fa-solid fa-building"></i> ' + esc(request.businessName) + '</span>' : '')
                + '</div>'
                + '<p class="task-copy">' + esc(request.details || '') + '</p>'
                + '<div class="notice-copy"><i class="fa-solid fa-circle-info"></i> Your request is tracked by the Seedwel team. Updates appear here.</div>';
            list.appendChild(card);
        });
    }

    function pill(status) {
        var meta = wf.meta(status);
        return '<span class="wf-pill ' + esc(meta.className) + '"><i class="fas ' + esc(meta.icon) + '"></i> ' + esc(meta.label) + '</span>';
    }

    function filteredTasks() {
        var rows = state.tasks.slice();
        var search = filter.search.toLowerCase();
        if (search) {
            rows = rows.filter(function (row) {
                return String((row.task.title || '') + ' ' + (row.task.description || '')).toLowerCase().indexOf(search) !== -1;
            });
        }
        if (filter.status) {
            rows = rows.filter(function (row) {
                var status = String(row.task.status || 'pending').toLowerCase();
                return status === filter.status || (filter.status === 'approved' && status === 'completed');
            });
        }
        return rows;
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
            item.innerHTML = '<strong>' + esc(entry.actorName || entry.actor || 'Seedwel') + '</strong> · ' + esc(entry.action)
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
            item.innerHTML = '<span class="who">' + esc(comment.byName || comment.by || 'Seedwel') + '</span>'
                + '<span class="when">' + esc(utils.formatDateTime(comment.at)) + '</span>'
                + esc(comment.text);
            holder.appendChild(item);
        });

        var form = document.createElement('div');
        form.className = 'approve-tools';
        var textarea = document.createElement('textarea');
        textarea.maxLength = 2000;
        textarea.placeholder = 'Ask a question or leave feedback for the Seedwel team…';
        var send = document.createElement('button');
        send.type = 'button';
        send.className = 'wf-btn';
        send.innerHTML = '<i class="fa-solid fa-comment"></i> Add comment';
        send.addEventListener('click', async function () {
            var text = textarea.value.trim();
            if (!text) return;
            send.disabled = true;
            try {
                await api.comment(window.SeedwelPortal.db, 'clientTasks/' + state.account.uid, row.taskId, {
                    by: state.account.email,
                    byName: state.account.fullName || state.account.email,
                    kind: 'client',
                    text: text
                });
                await load();
                renderAll();
                msg('Your comment was added.', true);
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

    function taskCard(row) {
        var task = row.task || {};
        var card = document.createElement('article');
        card.className = 'task-card';
        card.innerHTML = '<div class="task-card-head"><strong>' + esc(task.title || 'Untitled work') + '</strong>' + pill(task.status) + '</div>'
            + '<div class="task-meta">'
            + '<span><i class="fa-solid fa-flag"></i> ' + esc(String(task.priority || 'medium').replace(/^\w/, function (c) { return c.toUpperCase(); })) + '</span>'
            + (task.dueDate ? '<span><i class="fa-regular fa-calendar"></i> Due ' + esc(task.dueDate) + (api.isOverdue(task) ? ' · overdue' : '') + '</span>' : '')
            + (task.category ? '<span><i class="fa-solid fa-tag"></i> ' + esc(task.category) + '</span>' : '')
            + (task.assignedByName ? '<span><i class="fa-solid fa-user-check"></i> ' + esc(task.assignedByName) + '</span>' : '')
            + '</div>'
            + (task.description ? '<p class="task-copy">' + esc(task.description) + '</p>' : '');
        if (task.status === 'changes_required' && task.reviewNote) {
            var warn = document.createElement('div');
            warn.className = 'review-box warn';
            warn.innerHTML = '<strong><i class="fa-solid fa-pen-to-square"></i> Seedwel feedback</strong>' + esc(task.reviewNote);
            card.appendChild(warn);
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

    function renderTasks() {
        var list = $('taskList');
        list.textContent = '';
        var rows = filteredTasks();
        if (!rows.length) {
            list.innerHTML = '<div class="empty-state">No work assigned to you yet.<br><small>When the Seedwel team assigns deliverables to your account they will appear here.</small></div>';
            return;
        }
        rows.forEach(function (row) { list.appendChild(taskCard(row)); });
    }

    function renderActivity() {
        var feed = $('activityFeed');
        feed.textContent = '';
        var events = [];
        state.tasks.forEach(function (row) {
            var task = row.task || {};
            Object.keys(task.history || {}).forEach(function (key) {
                var entry = task.history[key] || {};
                events.push(Object.assign({}, entry, { taskTitle: task.title || 'Untitled work' }));
            });
        });
        events.sort(function (a, b) { return Number(b.at || 0) - Number(a.at || 0); });
        if (!events.length) {
            feed.innerHTML = '<div class="empty-state">No updates yet. Activity will appear here as work progresses.</div>';
            return;
        }
        events.slice(0, 30).forEach(function (event) {
            var item = document.createElement('div');
            item.className = 'timeline-item ' + (event.action === 'Task approved' ? 'approved' : event.action === 'Changes required' ? 'changes_required' : '');
            item.innerHTML = '<strong>' + esc(event.actorName || event.actor || 'Seedwel') + '</strong> · ' + esc(event.action)
                + ' — ' + esc(event.taskTitle)
                + (event.note ? ' <span>(' + esc(event.note) + ')</span>' : '')
                + '<time>' + esc(utils.formatDateTime(event.at)) + '</time>';
            feed.appendChild(item);
        });
    }

    function renderAll() {
        renderMetrics();
        renderRequests();
        renderTasks();
        renderActivity();
    }

    portal.gate(['client'], async function (ctx) {
        state.account = ctx.account;
        portal.bindShell(ctx.account, 'overview');
        $('welcomeName').textContent = ctx.account.fullName || ctx.account.email || 'Client';
        $('pfPhone').value = ctx.account.phone || '';
        $('pfCompany').value = ctx.account.company || ctx.account.organisation || '';

        $('taskSearch').addEventListener('input', function (event) {
            filter.search = event.target.value;
            renderTasks();
        });
        $('taskStatusFilter').addEventListener('change', function (event) {
            filter.status = event.target.value;
            renderTasks();
        });

        $('profileForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            try {
                await window.SeedwelPortal.db.ref('users/' + ctx.account.uid).update({
                    phone: $('pfPhone').value.trim().slice(0, 40),
                    company: $('pfCompany').value.trim().slice(0, 120),
                    notes: $('pfNotes').value.trim().slice(0, 500),
                    updatedAt: window.firebase.database.ServerValue.TIMESTAMP
                });
                formMsg('profileMsg', 'Profile updated.', true);
            } catch (error) {
                console.error(error);
                formMsg('profileMsg', 'Could not save your profile right now.', false);
            }
        });

        $('requestForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            var details = $('reqDetails').value.trim();
            if (details.length < 10) {
                formMsg('requestMsg', 'Please describe what you need (at least 10 characters).', false);
                return;
            }
            var button = $('requestBtn');
            button.disabled = true;
            var service = $('reqService').value;
            var labels = {
                'website-package': 'Website + Logo + Business Cards Package',
                'web-development': 'Website Development',
                'logo-branding': 'Logo & Branding',
                'business-materials': 'Business Materials',
                'graphics-social': 'Graphics & Social Media',
                'education': 'Education / Tuition',
                'other': 'Something Else'
            };
            var payload = {
                fullName: String(ctx.account.fullName || ctx.account.email || '').slice(0, 120),
                email: String(ctx.account.email || '').slice(0, 160).toLowerCase(),
                phone: ($('pfPhone').value.trim() || ctx.account.phone || '').slice(0, 40),
                businessName: ($('pfCompany').value.trim() || ctx.account.company || '').slice(0, 120),
                service: service,
                serviceLabel: (labels[service] || service).slice(0, 120),
                details: details.slice(0, 3000),
                consent: true,
                status: 'new',
                source: '/portal/client',
                submittedAt: window.firebase.database.ServerValue.TIMESTAMP
            };
            try {
                var ref = await window.SeedwelPortal.db.ref('serviceRequests').push(payload);
                await window.SeedwelPortal.db.ref('clientRequests/' + ctx.account.uid + '/' + ref.key).set(Object.assign({}, payload, { requestId: ref.key }));
                try {
                    await window.SeedwelPortal.db.ref('adminNotifications').push({
                        title: 'New client workspace request',
                        body: (payload.fullName || 'Client') + ' requested: ' + payload.serviceLabel,
                        type: 'request',
                        read: false,
                        link: 'requests',
                        targetId: ref.key || '',
                        createdAt: window.firebase.database.ServerValue.TIMESTAMP
                    });
                } catch (_) { /* best-effort */ }
                $('reqDetails').value = '';
                await load();
                renderAll();
                formMsg('requestMsg', 'Your request was sent to the Seedwel team.', true);
            } catch (error) {
                console.error(error);
                formMsg('requestMsg', error && error.message ? error.message : 'Could not send the request. Please try again.', false);
            } finally {
                button.disabled = false;
            }
        });

        await load();
        renderAll();
    });
})();
