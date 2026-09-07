'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { execute, queryAll, queryOne, uniqueSlug } from '@/lib/db';
import { assertPermission, AuthorizationError, requireUser } from '@/lib/auth/guards';
import type { SessionUser } from '@/lib/auth/session';
import { logAudit, logChanges } from '@/lib/audit';
import { notify, notifyMany, notifyPermission } from '@/lib/notifications';
import { recordDocument, storeUpload, UploadError } from '@/lib/uploads';
import { reference, toBool, toLines } from '@/lib/utils';
import { stringValue, zodToErrors, type ActionState } from '@/lib/forms';

function failure(error: unknown): ActionState {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  const zod = error as { issues?: Array<{ path: PropertyKey[]; message: string }> };
  if (zod?.issues?.length) {
    const errors: Record<string, string> = {};
    for (const issue of zod.issues) errors[String(issue.path[0] ?? 'form')] = issue.message;
    return { ok: false, message: 'Please check the highlighted fields.', errors };
  }
  console.error('[workplace action]', error);
  return { ok: false, message: 'Something went wrong. Please try again.' };
}

/** True when the user may act on this task as a reviewer rather than an assignee. */
function canReview(user: SessionUser): boolean {
  return user.permissions.includes('tasks.approve') || user.permissions.includes('system.super');
}

function isAssignee(user: SessionUser, taskId: number): boolean {
  return !!queryOne('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?', [taskId, user.id]);
}

/* -------------------------------------------------------------------- tasks */

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, 'Give the task a title').max(160),
  description: z.string().trim().max(6000).optional(),
  instructions: z.string().trim().max(6000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().trim().optional(),
  start_date: z.string().trim().optional(),
  project_id: z.string().optional(),
  department_id: z.string().optional(),
  assignees: z.string().optional(),
  checklist: z.string().optional(),
});

export async function saveTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('tasks.create');
    const raw: Record<string, string> = {};
    for (const key of ['id','title','description','instructions','priority','due_date','start_date','project_id','department_id','checklist']) {
      raw[key] = stringValue(form, key);
    }
    // Assignee list can arrive as a multi-select or a comma separated field.
    raw.assignees = form.getAll('assignees').map(String).join(',');

    const parsed = taskSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };

    const d = parsed.data;
    const assignees = (d.assignees || '')
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    const values = {
      title: d.title,
      description: d.description || '',
      instructions: d.instructions || '',
      priority: d.priority,
      due_date: d.due_date ? d.due_date.slice(0, 10) : null,
      start_date: d.start_date ? d.start_date.slice(0, 10) : null,
      project_id: d.project_id ? Number(d.project_id) : null,
      department_id: d.department_id ? Number(d.department_id) : null,
    };

    let taskId: number;
    if (d.id) {
      taskId = Number(d.id);
      const before = queryOne<Record<string, unknown>>('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (!before) return { ok: false, message: 'That task no longer exists.' };
      const mayEdit = canReview(user) || Number(before.created_by) === user.id || isAssignee(user, taskId);
      if (!mayEdit) throw new AuthorizationError('You do not have permission to edit this task.');
      execute(
        `UPDATE tasks SET title = ?, description = ?, instructions = ?, priority = ?, due_date = ?, start_date = ?,
          project_id = ?, department_id = ?, updated_at = datetime(\'now\') WHERE id = ?`,
        [values.title, values.description, values.instructions, values.priority, values.due_date, values.start_date, values.project_id, values.department_id, taskId],
      );
      await logChanges(user, 'task.updated', { type: 'task', id: taskId, label: values.title }, before, values, Object.keys(values));
    } else {
      const info = execute(
        `INSERT INTO tasks (reference, title, description, instructions, status, priority, created_by, department_id,
          project_id, start_date, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))`,
        [
          reference('TSK'),
          values.title,
          values.description,
          values.instructions,
          values.priority,
          user.id,
          values.department_id,
          values.project_id,
          values.start_date,
          values.due_date,
        ],
      );
      taskId = Number(info.lastInsertRowid);
      await logAudit({ actorId: user.id, actorName: user.fullName, action: 'task.created', entityType: 'task', entityId: taskId, entityLabel: values.title });
    }

    if (user.permissions.includes('tasks.assign') || user.permissions.includes('system.super')) {
      execute('DELETE FROM task_assignees WHERE task_id = ?', [taskId]);
      for (const uid of assignees) {
        execute('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)', [taskId, uid]);
      }
      notifyMany(assignees, {
        type: 'task_assigned',
        title: d.id ? 'Task updated' : 'New task assigned',
        body: values.title,
        href: `/dashboard/tasks/${taskId}`,
        actorId: user.id,
      });
    }

    const checklist = (d.checklist || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (checklist.length) {
      execute('DELETE FROM task_checklist WHERE task_id = ?', [taskId]);
      checklist.forEach((label, i) => {
        execute('INSERT INTO task_checklist (task_id, label, is_done, sort_order) VALUES (?, ?, 0, ?)', [taskId, label, i + 1]);
      });
    }

    // Attachments
    const files = form.getAll('attachments').filter((f): f is File => f instanceof File && f.size > 0);
    for (const file of files) {
      try {
        const stored = await storeUpload(file, 'private', 'tasks');
        execute('INSERT INTO task_attachments (task_id, name, path, size, uploaded_by) VALUES (?, ?, ?, ?, ?)', [
          taskId,
          file.name,
          stored.storedName,
          stored.size,
          user.id,
        ]);
        recordDocument({
          name: file.name,
          category: 'project_file',
          storedName: stored.storedName,
          mime: file.type,
          size: stored.size,
          ownerId: user.id,
          uploaderId: user.id,
          relatedType: 'task',
          relatedId: taskId,
          visibility: 'role',
          allowedRoles: 'super_admin,administrator,director,manager,virtual_assistant',
        });
      } catch (error) {
        if (error instanceof UploadError) return { ok: false, message: error.message };
        throw error;
      }
    }

    revalidatePath('/dashboard/tasks');
    revalidatePath(`/dashboard/tasks/${taskId}`);
    revalidatePath('/dashboard/my-day');
    revalidatePath('/dashboard/team');
    return { ok: true, message: d.id ? 'Task updated.' : 'Task created and assigned.' };
  } catch (error) {
    return failure(error);
  }
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pending', 'on_it', 'in_progress', 'submitted', 'approved', 'changes_required', 'resubmitted', 'blocked', 'cancelled', 'overdue']),
  note: z.string().max(2000).optional(),
});

export async function setTaskStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const parsed = statusSchema.safeParse({
      id: stringValue(form, 'id'),
      status: stringValue(form, 'status') as never,
      note: stringValue(form, 'note'),
    });
    if (!parsed.success) return { ok: false, message: 'Invalid request.' };

    const taskId = Number(parsed.data.id);
    const task = queryOne<{ id: number; title: string; status: string; created_by: number }>(
      'SELECT id, title, status, created_by FROM tasks WHERE id = ?',
      [taskId],
    );
    if (!task) return { ok: false, message: 'That task no longer exists.' };

    const assignee = isAssignee(user, taskId);
    const reviewer = canReview(user);
    const owner = Number(task.created_by) === user.id;
    const next = parsed.data.status;

    const workerTransitions = ['on_it', 'in_progress', 'submitted', 'resubmitted', 'blocked'];
    const reviewerTransitions = ['approved', 'changes_required', 'cancelled', 'pending'];

    if (workerTransitions.includes(next)) {
      if (!assignee && !reviewer && !owner) throw new AuthorizationError('You can only change the status of tasks assigned to you.');
    } else if (reviewerTransitions.includes(next)) {
      if (!reviewer && !owner) throw new AuthorizationError('You do not have permission to review this task.');
    } else if (!reviewer && !owner) {
      throw new AuthorizationError('You do not have permission to change this task.');
    }

    const updates: string[] = ["status = ?", "updated_at = datetime(\'now\')"];
    const params: unknown[] = [next];
    if (next === 'approved') {
      updates.push("approved_at = datetime(\'now\')", 'approved_by = ?', "completed_at = COALESCE(completed_at, datetime(\'now\'))");
      params.push(user.id);
    }
    if (next === 'cancelled' || next === 'pending') {
      updates.push('approved_at = NULL', 'approved_by = NULL');
    }
    params.push(taskId);
    execute(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);

    execute(
      `INSERT INTO task_comments (task_id, user_id, body, kind, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))`,
      [
        taskId,
        user.id,
        parsed.data.note || `Status changed from ${task.status.replace(/_/g, ' ')} to ${next.replace(/_/g, ' ')}.`,
        next === 'changes_required' ? 'change_request' : next === 'approved' ? 'approval' : 'system',
      ],
    );

    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'task.status_changed',
      entityType: 'task',
      entityId: taskId,
      entityLabel: task.title,
      field: 'status',
      previousValue: task.status,
      newValue: next,
    });

    // Notify the other side of the workflow
    const assignees = queryAll<{ user_id: number }>('SELECT user_id FROM task_assignees WHERE task_id = ?', [taskId]).map((r) => r.user_id);
    if (next === 'approved' || next === 'changes_required' || next === 'submitted' || next === 'resubmitted') {
      if (next === 'submitted' || next === 'resubmitted') {
        notifyPermission('tasks.approve', {
          type: next === 'submitted' ? 'task_submitted' : 'task_submitted',
          title: next === 'submitted' ? 'Work submitted for review' : 'Work resubmitted',
          body: `${user.fullName}: ${task.title}`,
          href: `/dashboard/tasks/${taskId}`,
          actorId: user.id,
        }, user.id);
      } else {
        notifyMany(assignees, {
          type: next === 'approved' ? 'work_approved' : 'changes_requested',
          title: next === 'approved' ? 'Work approved' : 'Changes requested',
          body: `${user.fullName}: ${task.title}`,
          href: `/dashboard/tasks/${taskId}`,
          actorId: user.id,
        }, );
      }
    }

    revalidatePath('/dashboard/tasks');
    revalidatePath(`/dashboard/tasks/${taskId}`);
    revalidatePath('/dashboard/my-day');
    revalidatePath('/dashboard/team');
    return { ok: true, message: 'Task updated.' };
  } catch (error) {
    return failure(error);
  }
}

const submissionSchema = z.object({
  task_id: z.string().min(1),
  notes: z.string().trim().min(3, 'Add a short note about what you are submitting').max(3000),
});

export async function submitWorkAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const parsed = submissionSchema.safeParse({ task_id: stringValue(form, 'task_id'), notes: stringValue(form, 'notes') });
    if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };

    const taskId = Number(parsed.data.task_id);
    const task = queryOne<{ id: number; title: string; status: string }>('SELECT id, title, status FROM tasks WHERE id = ?', [taskId]);
    if (!task) return { ok: false, message: 'That task no longer exists.' };
    if (!isAssignee(user, taskId)) throw new AuthorizationError('Only the person assigned to a task can submit work for it.');

    let filePath: string | null = null;
    const file = form.get('file');
    if (file instanceof File && file.size > 0) {
      const stored = await storeUpload(file, 'private', 'submissions');
      filePath = stored.storedName;
      recordDocument({
        name: file.name,
        category: 'project_file',
        storedName: stored.storedName,
        mime: file.type,
        size: stored.size,
        ownerId: user.id,
        uploaderId: user.id,
        relatedType: 'task',
        relatedId: taskId,
        visibility: 'role',
        allowedRoles: 'super_admin,administrator,director,manager,virtual_assistant',
      });
    }

    const nextStatus = task.status === 'changes_required' ? 'resubmitted' : 'submitted';
    execute(
      `INSERT INTO task_submissions (task_id, user_id, notes, file_path, status, created_at) VALUES (?, ?, ?, ?, 'pending', datetime(\'now\'))`,
      [taskId, user.id, parsed.data.notes, filePath],
    );
    execute("UPDATE tasks SET status = ?, updated_at = datetime(\'now\') WHERE id = ?", [nextStatus, taskId]);
    execute(
      `INSERT INTO task_comments (task_id, user_id, body, kind, created_at) VALUES (?, ?, ?, 'system', datetime(\'now\'))`,
      [taskId, user.id, `Submitted work: ${parsed.data.notes}`],
    );

    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'task.submitted',
      entityType: 'task',
      entityId: taskId,
      entityLabel: task.title,
      previousValue: task.status,
      newValue: nextStatus,
    });

    notifyPermission('tasks.approve', {
      type: 'task_submitted',
      title: nextStatus === 'submitted' ? 'Work submitted for review' : 'Work resubmitted',
      body: `${user.fullName} submitted "${task.title}"`,
      href: `/dashboard/tasks/${taskId}`,
      actorId: user.id,
    }, user.id);

    revalidatePath(`/dashboard/tasks/${taskId}`);
    revalidatePath('/dashboard/tasks');
    revalidatePath('/dashboard/my-day');
    revalidatePath('/dashboard/team');
    return { ok: true, message: 'Your work has been submitted for review.' };
  } catch (error) {
    return failure(error);
  }
}

const reviewSchema = z.object({
  submission_id: z.string().min(1),
  decision: z.enum(['approve', 'request_changes']),
  notes: z.string().max(3000).optional(),
});

export async function reviewSubmissionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('tasks.approve');
    const parsed = reviewSchema.safeParse({
      submission_id: stringValue(form, 'submission_id'),
      decision: stringValue(form, 'decision') as 'approve' | 'request_changes',
      notes: stringValue(form, 'notes'),
    });
    if (!parsed.success) return { ok: false, message: 'Invalid request.' };

    const submissionId = Number(parsed.data.submission_id);
    const submission = queryOne<{ id: number; task_id: number; user_id: number }>(
      'SELECT id, task_id, user_id FROM task_submissions WHERE id = ?',
      [submissionId],
    );
    if (!submission) return { ok: false, message: 'That submission no longer exists.' };
    const task = queryOne<{ title: string }>('SELECT title FROM tasks WHERE id = ?', [submission.task_id]);
    const decision = parsed.data.decision;

    if (decision === 'approve' && !parsed.data.notes?.trim() && false) {
      /* approvals do not require a note */
    }

    execute(
      "UPDATE task_submissions SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?",
      [decision === 'approve' ? 'approved' : 'changes_required', parsed.data.notes || '', user.id, submissionId],
    );

    const nextStatus = decision === 'approve' ? 'approved' : 'changes_required';
    execute(
      `UPDATE tasks SET status = ?, updated_at = datetime(\'now\') ${
        decision === 'approve'
          ? ", approved_at = datetime(\'now\'), approved_by = ?, completed_at = COALESCE(completed_at, datetime(\'now\'))"
          : ', approved_at = NULL, approved_by = NULL'
      } WHERE id = ?`,
      decision === 'approve' ? [nextStatus, user.id, submission.task_id] : [nextStatus, submission.task_id],
    );

    execute(
      `INSERT INTO task_comments (task_id, user_id, body, kind, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))`,
      [
        submission.task_id,
        user.id,
        parsed.data.notes || (decision === 'approve' ? 'Work approved.' : 'Changes requested.'),
        decision === 'approve' ? 'approval' : 'change_request',
      ],
    );

    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: decision === 'approve' ? 'task.approved' : 'task.changes_requested',
      entityType: 'task',
      entityId: submission.task_id,
      entityLabel: task?.title || '',
    });

    notify({
      userId: submission.user_id,
      type: decision === 'approve' ? 'work_approved' : 'changes_requested',
      title: decision === 'approve' ? 'Work approved' : 'Changes requested',
      body: `${user.fullName}: ${task?.title}`,
      href: `/dashboard/tasks/${submission.task_id}`,
      actorId: user.id,
    });

    revalidatePath(`/dashboard/tasks/${submission.task_id}`);
    revalidatePath('/dashboard/tasks');
    revalidatePath('/dashboard/team');
    return { ok: true, message: decision === 'approve' ? 'Work approved.' : 'Changes requested.' };
  } catch (error) {
    return failure(error);
  }
}

export async function addTaskCommentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const taskId = Number(stringValue(form, 'task_id'));
    const body = stringValue(form, 'body');
    if (!taskId || !body) return { ok: false, message: 'Write a message first.', errors: { body: 'Required' } };

    const task = queryOne<{ id: number; created_by: number }>('SELECT id, created_by FROM tasks WHERE id = ?', [taskId]);
    if (!task) return { ok: false, message: 'That task no longer exists.' };
    const allowed =
      isAssignee(user, taskId) ||
      canReview(user) ||
      Number(task.created_by) === user.id ||
      user.permissions.includes('tasks.view_any');
    if (!allowed) throw new AuthorizationError('You do not have permission to comment on this task.');

    execute('INSERT INTO task_comments (task_id, user_id, body, kind, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))', [
      taskId,
      user.id,
      body,
      stringValue(form, 'kind') === 'change_request' && canReview(user) ? 'change_request' : 'comment',
    ]);

    const assignees = queryAll<{ user_id: number }>('SELECT user_id FROM task_assignees WHERE task_id = ?', [taskId]).map((r) => r.user_id);
    notifyMany([...assignees, Number(task.created_by)], {
      type: 'message',
      title: 'New comment on a task',
      body: `${user.fullName}: ${body.slice(0, 120)}`,
      href: `/dashboard/tasks/${taskId}`,
      actorId: user.id,
    });

    revalidatePath(`/dashboard/tasks/${taskId}`);
    return { ok: true, message: 'Comment added.' };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleChecklistAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const itemId = Number(stringValue(form, 'item_id'));
    const done = toBool(stringValue(form, 'done'));
    const item = queryOne<{ id: number; task_id: number }>('SELECT id, task_id FROM task_checklist WHERE id = ?', [itemId]);
    if (!item) return { ok: false, message: 'That item no longer exists.' };
    if (!isAssignee(user, item.task_id) && !canReview(user)) {
      throw new AuthorizationError('You do not have permission to update this checklist.');
    }
    execute("UPDATE task_checklist SET is_done = ?, done_by = ?, done_at = datetime(\'now\') WHERE id = ?", [done ? 1 : 0, user.id, itemId]);
    revalidatePath(`/dashboard/tasks/${item.task_id}`);
    revalidatePath('/dashboard/my-day');
    return { ok: true, message: 'Checklist updated.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('tasks.delete');
    const id = Number(stringValue(form, 'id'));
    const task = queryOne<{ title: string }>('SELECT title FROM tasks WHERE id = ?', [id]);
    if (!task) return { ok: false, message: 'That task no longer exists.' };
    execute('DELETE FROM tasks WHERE id = ?', [id]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'task.deleted', entityType: 'task', entityId: id, entityLabel: task.title });
    revalidatePath('/dashboard/tasks');
    return { ok: true, message: 'Task deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ----------------------------------------------------------------- projects */

const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, 'Name the project').max(160),
  client_id: z.string().optional(),
  client_label: z.string().trim().max(160).optional(),
  summary: z.string().trim().max(400).optional(),
  description: z.string().trim().max(6000).optional(),
  status: z.enum(['planning', 'active', 'review', 'completed', 'on_hold', 'cancelled']),
  progress: z.string().optional(),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
  services: z.string().max(1000).optional(),
  technologies: z.string().max(400).optional(),
  results: z.string().max(2000).optional(),
  link: z.string().max(300).optional(),
  is_published: z.string().optional(),
  is_featured: z.string().optional(),
  members: z.string().optional(),
});

export async function saveProjectAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('projects.manage');
    const raw: Record<string, string> = {};
    for (const key of ['id','name','client_id','client_label','summary','description','status','progress','start_date','deadline','services','technologies','results','link','is_published','is_featured']) {
      raw[key] = stringValue(form, key);
    }
    raw.members = form.getAll('members').map(String).join(',');

    const parsed = projectSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };

    const d = parsed.data;
    const values = {
      name: d.name,
      client_id: d.client_id ? Number(d.client_id) : null,
      client_label: d.client_label || '',
      summary: d.summary || '',
      description: d.description || '',
      status: d.status,
      progress: d.progress ? Math.max(0, Math.min(100, Number(d.progress))) : 0,
      start_date: d.start_date ? d.start_date.slice(0, 10) : null,
      deadline: d.deadline ? d.deadline.slice(0, 10) : null,
      services: toLines(d.services),
      technologies: d.technologies || '',
      results: toLines(d.results),
      link: d.link || '',
      is_published: toBool(d.is_published) ? 1 : 0,
      is_featured: toBool(d.is_featured) ? 1 : 0,
    };

    let projectId: number;
    if (d.id) {
      projectId = Number(d.id);
      const before = queryOne<Record<string, unknown>>('SELECT * FROM projects WHERE id = ?', [projectId]);
      if (!before) return { ok: false, message: 'That project no longer exists.' };
      execute(
        `UPDATE projects SET name = ?, client_id = ?, client_label = ?, summary = ?, description = ?, status = ?,
          progress = ?, start_date = ?, deadline = ?, services = ?, technologies = ?, results = ?, link = ?,
          is_published = ?, is_featured = ?, updated_at = datetime(\'now\') WHERE id = ?`,
        [values.name, values.client_id, values.client_label, values.summary, values.description, values.status, values.progress, values.start_date, values.deadline, values.services, values.technologies, values.results, values.link, values.is_published, values.is_featured, projectId],
      );
      await logChanges(user, 'project.updated', { type: 'project', id: projectId, label: values.name }, before, values, Object.keys(values));
    } else {
      const info = execute(
        `INSERT INTO projects (slug, name, client_id, client_label, summary, description, status, progress, start_date,
          deadline, services, technologies, results, link, is_published, is_featured, owner_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))`,
        [uniqueSlug('projects', values.name), values.name, values.client_id, values.client_label, values.summary, values.description, values.status, values.progress, values.start_date, values.deadline, values.services, values.technologies, values.results, values.link, values.is_published, values.is_featured, user.id],
      );
      projectId = Number(info.lastInsertRowid);
      await logAudit({ actorId: user.id, actorName: user.fullName, action: 'project.created', entityType: 'project', entityId: projectId, entityLabel: values.name });
    }

    const members = (d.members || '').split(',').map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0);
    execute('DELETE FROM project_members WHERE project_id = ?', [projectId]);
    for (const uid of members) execute('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [projectId, uid, 'member']);
    notifyMany(members, { type: 'system', title: 'Added to a project', body: values.name, href: `/dashboard/projects/${projectId}` });

    revalidatePath('/dashboard/projects');
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath('/projects');
    return { ok: true, message: d.id ? 'Project updated.' : 'Project created.' };
  } catch (error) {
    return failure(error);
  }
}

export async function addProjectMessageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const projectId = Number(stringValue(form, 'project_id'));
    const body = stringValue(form, 'body');
    const isInternal = toBool(stringValue(form, 'is_internal')) ? 1 : 0;
    if (!projectId || !body) return { ok: false, message: 'Write a message first.', errors: { body: 'Required' } };

    const project = queryOne<{ id: number; name: string; client_id: number | null }>('SELECT id, name, client_id FROM projects WHERE id = ?', [projectId]);
    if (!project) return { ok: false, message: 'That project no longer exists.' };

    const member = !!queryOne('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, user.id]);
    const staff = user.permissions.includes('projects.view_any') || user.permissions.includes('projects.manage');
    if (!member && !staff) throw new AuthorizationError('You do not have access to this project.');

    execute('INSERT INTO project_messages (project_id, user_id, body, is_internal, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))', [
      projectId,
      user.id,
      body,
      isInternal,
    ]);

    const recipients = queryAll<{ user_id: number }>('SELECT user_id FROM project_members WHERE project_id = ?', [projectId]).map((r) => r.user_id);
    notifyMany(recipients, {
      type: 'message',
      title: 'New project message',
      body: `${user.fullName}: ${body.slice(0, 100)}`,
      href: `/dashboard/projects/${projectId}`,
      actorId: user.id,
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true, message: 'Message posted.' };
  } catch (error) {
    return failure(error);
  }
}

export async function addProjectTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('projects.manage');
    const projectId = Number(stringValue(form, 'project_id'));
    const title = stringValue(form, 'title');
    const dueDate = stringValue(form, 'due_date');
    const assignedTo = stringValue(form, 'assigned_to');
    if (!projectId || !title) return { ok: false, message: 'Give the milestone a title.', errors: { title: 'Required' } };

    execute('INSERT INTO project_tasks (project_id, title, status, due_date, assigned_to) VALUES (?, ?, ?, ?, ?)', [
      projectId,
      title,
      'pending',
      dueDate ? dueDate.slice(0, 10) : null,
      assignedTo ? Number(assignedTo) : null,
    ]);
    if (assignedTo) {
      notify({ userId: Number(assignedTo), type: 'task_assigned', title: 'New project task', body: title, href: `/dashboard/projects/${projectId}` });
    }
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true, message: 'Milestone added.' };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleProjectTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const id = Number(stringValue(form, 'id'));
    const done = toBool(stringValue(form, 'done'));
    const task = queryOne<{ project_id: number }>('SELECT project_id FROM project_tasks WHERE id = ?', [id]);
    if (!task) return { ok: false, message: 'Not found.' };
    execute("UPDATE project_tasks SET status = ? WHERE id = ?", [done ? 'completed' : 'pending', id]);
    revalidatePath(`/dashboard/projects/${task.project_id}`);
    void user;
    return { ok: true, message: 'Updated.' };
  } catch (error) {
    return failure(error);
  }
}

export async function uploadProjectFileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('projects.manage');
    const projectId = Number(stringValue(form, 'project_id'));
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a file to upload.' };
    const stored = await storeUpload(file, 'private', 'projects');
    execute(
      'INSERT INTO project_files (project_id, name, path, size, is_client_visible, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [projectId, file.name, stored.storedName, stored.size, toBool(stringValue(form, 'client_visible')) ? 1 : 0, user.id],
    );
    recordDocument({
      name: file.name,
      category: 'project_file',
      storedName: stored.storedName,
      mime: file.type,
      size: stored.size,
      ownerId: user.id,
      uploaderId: user.id,
      relatedType: 'project',
      relatedId: projectId,
      visibility: 'role',
      allowedRoles: 'super_admin,administrator,director,manager,virtual_assistant,client',
    });
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true, message: 'File uploaded.' };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    return failure(error);
  }
}

/* --------------------------------------------------------- service requests */

const requestStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['new', 'reviewing', 'assigned', 'in_progress', 'review', 'completed', 'rejected', 'cancelled']),
});

export async function setServiceRequestStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('service_requests.manage');
    const parsed = requestStatusSchema.safeParse({ id: stringValue(form, 'id'), status: stringValue(form, 'status') as never });
    if (!parsed.success) return { ok: false, message: 'Invalid request.' };

    const id = Number(parsed.data.id);
    const before = queryOne<{ status: string; name: string }>('SELECT status, name FROM service_requests WHERE id = ?', [id]);
    if (!before) return { ok: false, message: 'That request no longer exists.' };

    execute("UPDATE service_requests SET status = ?, updated_at = datetime(\'now\') WHERE id = ?", [parsed.data.status, id]);
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'service_request.status_changed',
      entityType: 'service_request',
      entityId: id,
      entityLabel: before.name,
      field: 'status',
      previousValue: before.status,
      newValue: parsed.data.status,
    });
    revalidatePath('/dashboard/service-requests');
    revalidatePath(`/dashboard/service-requests/${id}`);
    return { ok: true, message: 'Request updated.' };
  } catch (error) {
    return failure(error);
  }
}

export async function assignServiceRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('service_requests.manage');
    const id = Number(stringValue(form, 'id'));
    const assignee = stringValue(form, 'assigned_to');
    if (!id) return { ok: false, message: 'Invalid request.' };
    execute(
      "UPDATE service_requests SET assigned_to = ?, status = CASE WHEN status = 'new' THEN 'reviewing' ELSE status END, updated_at = datetime(\'now\') WHERE id = ?",
      [assignee ? Number(assignee) : null, id],
    );
    if (assignee) {
      notify({ userId: Number(assignee), type: 'service_request', title: 'Service request assigned to you', body: `Request #${id}`, href: `/dashboard/service-requests/${id}` });
    }
    revalidatePath('/dashboard/service-requests');
    revalidatePath(`/dashboard/service-requests/${id}`);
    return { ok: true, message: 'Assigned.' };
  } catch (error) {
    return failure(error);
  }
}

export async function convertRequestToProjectAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('projects.manage');
    const id = Number(stringValue(form, 'id'));
    const request = queryOne<{ id: number; name: string; company: string; email: string; service_id: number | null; description: string }>(
      'SELECT id, name, company, email, service_id, description FROM service_requests WHERE id = ?',
      [id],
    );
    if (!request) return { ok: false, message: 'That request no longer exists.' };

    const service = request.service_id ? queryOne<{ name: string }>('SELECT name FROM services WHERE id = ?', [request.service_id]) : null;
    const projectName = `${request.company || request.name} — ${service?.name || 'Project'}`;
    const info = execute(
      `INSERT INTO projects (slug, name, client_label, summary, description, status, progress, start_date, services, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'planning', 0, date(\'now\'), ?, ?, datetime(\'now\'), datetime(\'now\'))`,
      [uniqueSlug('projects', projectName), projectName, request.company || request.name, request.description.slice(0, 300), request.description, service?.name || '', user.id],
    );
    execute("UPDATE service_requests SET project_id = ?, status = 'assigned', updated_at = datetime(\'now\') WHERE id = ?", [
      Number(info.lastInsertRowid),
      id,
    ]);
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'service_request.converted',
      entityType: 'service_request',
      entityId: id,
      entityLabel: projectName,
    });
    revalidatePath('/dashboard/service-requests');
    revalidatePath('/dashboard/projects');
    return { ok: true, message: 'Project created from this request.' };
  } catch (error) {
    return failure(error);
  }
}

/* ------------------------------------------------------------------ clients */

const clientSchema = z.object({
  id: z.string().optional(),
  company_name: z.string().trim().min(2, 'Enter the client name').max(160),
  contact_name: z.string().trim().max(120).optional(),
  email: z.string().trim().email('Enter a valid email').max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional(),
  industry: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  status: z.enum(['active', 'inactive', 'prospect']),
  notes: z.string().trim().max(2000).optional(),
  owner_id: z.string().optional(),
});

export async function saveClientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('clients.manage');
    const parsed = clientSchema.safeParse(
      Object.fromEntries(['id','company_name','contact_name','email','phone','industry','country','status','notes','owner_id'].map((k) => [k, stringValue(form, k)])),
    );
    if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };
    const d = parsed.data;

    if (d.id) {
      const before = queryOne<Record<string, unknown>>('SELECT * FROM clients WHERE id = ?', [Number(d.id)]);
      if (!before) return { ok: false, message: 'That client no longer exists.' };
      execute(
        `UPDATE clients SET company_name = ?, contact_name = ?, email = ?, phone = ?, industry = ?, country = ?, status = ?, notes = ?, owner_id = ? WHERE id = ?`,
        [d.company_name, d.contact_name || '', d.email || '', d.phone || '', d.industry || '', d.country || 'Zambia', d.status, d.notes || '', d.owner_id ? Number(d.owner_id) : null, Number(d.id)],
      );
      await logChanges(user, 'client.updated', { type: 'client', id: Number(d.id), label: d.company_name }, before, d as unknown as Record<string, unknown>, ['company_name', 'email', 'phone', 'status']);
    } else {
      const info = execute(
        `INSERT INTO clients (company_name, contact_name, email, phone, industry, country, status, notes, owner_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))`,
        [d.company_name, d.contact_name || '', d.email || '', d.phone || '', d.industry || '', d.country || 'Zambia', d.status, d.notes || '', d.owner_id ? Number(d.owner_id) : null],
      );
      await logAudit({ actorId: user.id, actorName: user.fullName, action: 'client.created', entityType: 'client', entityId: Number(info.lastInsertRowid), entityLabel: d.company_name });
    }

    revalidatePath('/dashboard/clients');
    return { ok: true, message: 'Client saved.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteClientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('clients.manage');
    const id = Number(stringValue(form, 'id'));
    const client = queryOne<{ company_name: string }>('SELECT company_name FROM clients WHERE id = ?', [id]);
    if (!client) return { ok: false, message: 'That client no longer exists.' };
    execute('DELETE FROM clients WHERE id = ?', [id]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'client.deleted', entityType: 'client', entityId: id, entityLabel: client.company_name });
    revalidatePath('/dashboard/clients');
    return { ok: true, message: 'Client deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ---------------------------------------------------------------- documents */

export async function uploadDocumentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('documents.upload');
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a file to upload.' };

    const category = stringValue(form, 'category') || 'company_document';
    const visibility = stringValue(form, 'visibility') || 'private';
    const stored = await storeUpload(file, 'private', 'documents');

    const id = recordDocument({
      name: stringValue(form, 'name') || file.name,
      description: stringValue(form, 'description'),
      category,
      storedName: stored.storedName,
      mime: file.type,
      size: stored.size,
      ownerId: user.id,
      uploaderId: user.id,
      relatedType: stringValue(form, 'related_type'),
      relatedId: stringValue(form, 'related_id') ? Number(stringValue(form, 'related_id')) : null,
      visibility,
      allowedRoles: stringValue(form, 'allowed_roles'),
      isSensitive: toBool(stringValue(form, 'is_sensitive')),
    });

    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'document.uploaded', entityType: 'document', entityId: id, entityLabel: file.name });
    revalidatePath('/dashboard/documents');
    return { ok: true, message: 'Document uploaded.' };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    return failure(error);
  }
}

export async function deleteDocumentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const id = Number(stringValue(form, 'id'));
    const doc = queryOne<{ owner_id: number | null; name: string }>('SELECT owner_id, name FROM documents WHERE id = ?', [id]);
    if (!doc) return { ok: false, message: 'That document no longer exists.' };
    if (doc.owner_id !== user.id && !user.permissions.includes('documents.delete_any') && !user.permissions.includes('system.super')) {
      throw new AuthorizationError('You can only delete documents you own.');
    }
    execute('DELETE FROM documents WHERE id = ?', [id]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'document.deleted', entityType: 'document', entityId: id, entityLabel: doc.name });
    revalidatePath('/dashboard/documents');
    return { ok: true, message: 'Document deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ----------------------------------------------------------------- messages */

export async function sendMessageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('messages.use');
    const conversationId = Number(stringValue(form, 'conversation_id'));
    const body = stringValue(form, 'body');
    if (!conversationId || !body) return { ok: false, message: 'Write a message first.', errors: { body: 'Required' } };

    const participant = queryOne('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?', [conversationId, user.id]);
    if (!participant) throw new AuthorizationError('You are not part of this conversation.');

    execute('INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, datetime(\'now\'))', [conversationId, user.id, body]);
    execute("UPDATE conversations SET last_message_at = datetime(\'now\') WHERE id = ?", [conversationId]);
    execute("UPDATE conversation_participants SET last_read_at = datetime(\'now\') WHERE conversation_id = ? AND user_id = ?", [conversationId, user.id]);

    const others = queryAll<{ user_id: number }>(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?',
      [conversationId, user.id],
    ).map((r) => r.user_id);
    notifyMany(others, {
      type: 'message',
      title: 'New message',
      body: `${user.fullName}: ${body.slice(0, 100)}`,
      href: `/dashboard/messages/${conversationId}`,
      actorId: user.id,
    });

    revalidatePath('/dashboard/messages');
    revalidatePath(`/dashboard/messages/${conversationId}`);
    return { ok: true, message: 'Message sent.' };
  } catch (error) {
    return failure(error);
  }
}

export async function startConversationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('messages.use');
    const subject = stringValue(form, 'subject') || 'New conversation';
    const participants = (stringValue(form, 'participants') || '')
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    const body = stringValue(form, 'body');
    if (participants.length === 0) return { ok: false, message: 'Choose at least one person.', errors: { participants: 'Required' } };

    const info = execute(
      `INSERT INTO conversations (subject, kind, created_by, last_message_at, created_at) VALUES (?, 'direct', ?, datetime(\'now\'), datetime(\'now\'))`,
      [subject, user.id],
    );
    const conversationId = Number(info.lastInsertRowid);
    execute('INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES (?, ?, datetime(\'now\'))', [conversationId, user.id]);
    for (const uid of participants) {
      execute('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [conversationId, uid]);
    }
    if (body) {
      execute('INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, datetime(\'now\'))', [conversationId, user.id, body]);
      notifyMany(participants, { type: 'message', title: 'New message', body: `${user.fullName}: ${body.slice(0, 100)}`, href: `/dashboard/messages/${conversationId}`, actorId: user.id });
    }
    revalidatePath('/dashboard/messages');
    return { ok: true, message: 'Conversation started.' };
  } catch (error) {
    return failure(error);
  }
}
