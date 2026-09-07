/**
 * Seedwel Workplace — task operations shared by the admin and manager portals.
 *
 * Task model:
 *  - /tasks/{assigneeUid}/{taskId}   the working copy each staff member sees
 *  - /clientTasks/{clientUid}/{taskId} the copy a client/business sees
 *  - /taskMeta/{taskId}             the shared task description
 *
 * Statuses follow SeedwelWorkflow (Pending -> Accepted -> In Progress ->
 * Submitted -> Approved, with the Changes Required / Resubmitted loop).
 */
(function (global) {
    'use strict';

    var utils = global.SeedwelRecruitment;
    var workflow = global.SeedwelWorkflow;
    var portal = global.SeedwelPortal;

    function now() { return global.firebase.database.ServerValue.TIMESTAMP; }

    function safe(value, max) { return utils.safeText(value, max || 0); }

    function priorityFor(value) {
        var v = safe(value, 20).toLowerCase();
        return ['low', 'medium', 'high', 'urgent'].indexOf(v) !== -1 ? v : 'medium';
    }

    /**
     * Create a task and fan it out to every assignee.
     * input: {
     *   title, description, category, priority, dueDate, teamRole, teamName,
     *   staff: [{ uid, name, role }],   // staff/manager assignees
     *   client: { uid, name } | null,   // optional client assignee
     *   creator: { uid, name, email }
     * }
     */
    async function createTask(db, input) {
        var title = safe(input.title, 200);
        if (title.length < 2) throw new Error('Give the task a title of at least 2 characters.');
        var description = safe(input.description, 3000);
        var staff = Array.isArray(input.staff) ? input.staff.filter(function (entry) { return entry && entry.uid; }) : [];
        var client = input.client && input.client.uid ? input.client : null;
        if (!staff.length && !client) throw new Error('Choose at least one person, team or client for this task.');

        var taskId = 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        var creator = input.creator || {};
        var createdAt = now();

        var base = {
            taskId: taskId,
            title: title,
            description: description,
            category: safe(input.category, 80),
            priority: priorityFor(input.priority),
            dueDate: safe(input.dueDate, 40),
            teamName: safe(input.teamName, 120),
            teamRole: safe(input.teamRole, 120),
            clientId: client ? client.uid : '',
            clientName: client ? safe(client.name, 120) : '',
            status: 'pending',
            createdBy: safe(creator.uid, 128),
            createdByName: safe(creator.name, 120),
            assignedBy: safe(creator.email, 160),
            assignedByName: safe(creator.name, 120),
            assignedAt: createdAt,
            createdAt: createdAt,
            updatedAt: createdAt
        };
        var history = {
            h0: {
                at: createdAt,
                actor: safe(creator.email, 160),
                actorName: safe(creator.name, 120),
                action: 'Task created',
                note: staff.length ? 'Assigned to ' + staff.length + ' team member(s).' + (client ? ' Client linked.' : '') : 'Assigned to client.'
            }
        };

        var writes = [];
        writes.push(db.ref('taskMeta/' + taskId).set(Object.assign({}, base, {
            assigneeCount: staff.length + (client ? 1 : 0),
            assigneeUids: staff.reduce(function (map, entry) { map[entry.uid] = entry.name; return map; }, {}),
            clientUid: client ? client.uid : ''
        })));

        staff.forEach(function (entry) {
            writes.push(db.ref('tasks/' + entry.uid + '/' + taskId).set(Object.assign({}, base, {
                assignedToName: safe(entry.name, 120),
                assignedToRole: safe(entry.role, 80),
                history: history
            })));
        });
        if (client) {
            writes.push(db.ref('clientTasks/' + client.uid + '/' + taskId).set(Object.assign({}, base, {
                assignedToName: safe(client.name, 120),
                assignedToRole: 'Client / Business',
                history: history
            })));
        }
        await Promise.all(writes);

        await portal.audit('Task created', title, safe(input.teamName || staff.map(function (s) { return s.name; }).join(', '), 200) + (client ? ' · ' + client.name : ''), creator);
        staff.forEach(function (entry) {
            portal.notify(entry.uid, 'New task assigned', title, 'dashboard#tasks', 'task');
        });
        if (client) {
            portal.notify(client.uid, 'New work assigned', title, 'portal/client#tasks', 'task');
        }
        return taskId;
    }

    /**
     * Move one task copy to a new status (staff or manager action) and append
     * an audit history entry.
     */
    async function updateStatus(db, recordPath, taskId, options) {
        var status = workflow.normalize(options.status);
        var actor = options.actor || {};
        var updates = {
            status: status,
            updatedAt: now()
        };
        if (status === 'submitted') updates.submittedAt = now();
        if (status === 'approved') {
            updates.approvedAt = now();
            updates.reviewedBy = safe(actor.uid || actor.email, 160);
            updates.reviewedByName = safe(actor.name, 120);
            updates.reviewedAt = now();
            updates.reviewNote = safe(options.note, 1000);
        }
        if (status === 'changes_required') {
            updates.reviewedBy = safe(actor.uid || actor.email, 160);
            updates.reviewedByName = safe(actor.name, 120);
            updates.reviewedAt = now();
            updates.reviewNote = safe(options.note, 1000);
        }
        await db.ref(recordPath + '/' + taskId).update(updates);
        await db.ref(recordPath + '/' + taskId + '/history').push({
            at: now(),
            actor: safe(actor.email || actor.uid, 160),
            actorName: safe(actor.name, 120),
            action: workflow.milestone(status),
            note: safe(options.note, 1000)
        });
    }

    /** Append a comment to a task copy. */
    async function comment(db, recordPath, taskId, comment) {
        await db.ref(recordPath + '/' + taskId + '/comments').push({
            at: now(),
            by: safe(comment.by || '', 160),
            byName: safe(comment.byName, 120),
            kind: safe(comment.kind || 'staff', 20),
            text: safe(comment.text, 2000)
        });
        await db.ref(recordPath + '/' + taskId).update({ updatedAt: now() });
    }

    async function loadTaskData(db) {
        var snapshots = await Promise.all([
            db.ref('tasks').once('value'),
            db.ref('taskMeta').once('value'),
            db.ref('clientTasks').once('value')
        ]);
        return {
            tasksByUid: snapshots[0].val() || {},
            metas: snapshots[1].val() || {},
            clientTasksByUid: snapshots[2].val() || {}
        };
    }

    /** Flatten staff task copies into rows. */
    function taskRows(data) {
        var rows = [];
        Object.keys(data.tasksByUid || {}).forEach(function (uid) {
            Object.keys(data.tasksByUid[uid] || {}).forEach(function (taskId) {
                var task = data.tasksByUid[uid][taskId] || {};
                rows.push({
                    kind: 'staff',
                    uid: uid,
                    taskId: taskId,
                    task: task,
                    meta: (data.metas && data.metas[taskId]) || task
                });
            });
        });
        Object.keys(data.clientTasksByUid || {}).forEach(function (uid) {
            Object.keys(data.clientTasksByUid[uid] || {}).forEach(function (taskId) {
                var task = data.clientTasksByUid[uid][taskId] || {};
                rows.push({
                    kind: 'client',
                    uid: uid,
                    taskId: taskId,
                    task: task,
                    meta: (data.metas && data.metas[taskId]) || task
                });
            });
        });
        return rows;
    }

    /** Staff task copies for one user. */
    function rowsForUser(data, uid) {
        var rows = [];
        Object.keys((data.tasksByUid || {})[uid] || {}).forEach(function (taskId) {
            var task = data.tasksByUid[uid][taskId] || {};
            rows.push({ uid: uid, taskId: taskId, task: task, meta: (data.metas && data.metas[taskId]) || task });
        });
        return rows;
    }

    function isOverdue(task) {
        var due = String(task.dueDate || '');
        if (!due || workflow.isCompleted(task.status || 'pending')) return false;
        return due < new Date().toISOString().slice(0, 10);
    }

    global.SeedwelTasks = Object.freeze({
        createTask: createTask,
        updateStatus: updateStatus,
        comment: comment,
        loadTaskData: loadTaskData,
        taskRows: taskRows,
        rowsForUser: rowsForUser,
        isOverdue: isOverdue,
        priorityFor: priorityFor
    });
})(window);
