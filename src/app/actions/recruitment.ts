'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { execute, queryOne, uniqueSlug } from '@/lib/db';
import { assertPermission, AuthorizationError } from '@/lib/auth/guards';
import { logAudit, logChanges } from '@/lib/audit';
import { notify, notifyPermission } from '@/lib/notifications';
import { sendMail, siteUrl } from '@/lib/mailer';
import { issueToken } from './auth';
import { hashPassword, randomToken } from '@/lib/auth/password';
import { stringValue, zodToErrors, type ActionState } from '@/lib/forms';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/lib/rbac';
import { toBool, toLines } from '@/lib/utils';

async function actor(permission: string) {
  return assertPermission(permission);
}

function failure(error: unknown): ActionState {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  const zod = error as { issues?: Array<{ path: PropertyKey[]; message: string }> };
  if (zod?.issues?.length) {
    const errors: Record<string, string> = {};
    for (const issue of zod.issues) errors[String(issue.path[0] ?? 'form')] = issue.message;
    return { ok: false, message: 'Please check the highlighted fields.', errors };
  }
  console.error('[recruitment action]', error);
  return { ok: false, message: 'Something went wrong. Please try again.' };
}

/* --------------------------------------------------------------------- jobs */

const jobSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, 'Enter a job title').max(120),
  department: z.string().trim().max(80).optional(),
  employment_type: z.string().trim().min(2).max(40),
  location: z.string().trim().min(2, 'Enter a location').max(120),
  remote_status: z.string().trim().max(40),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  salary_currency: z.string().trim().max(8).optional(),
  salary_visible: z.string().optional(),
  positions: z.string().optional(),
  summary: z.string().trim().min(20, 'Write a short summary (at least 20 characters)').max(400),
  description: z.string().trim().min(40, 'Describe the role in full (at least 40 characters)').max(8000),
  responsibilities: z.string().trim().max(4000).optional(),
  requirements: z.string().trim().max(4000).optional(),
  skills: z.string().trim().max(1000).optional(),
  deadline: z.string().trim().optional(),
  status: z.enum(['draft', 'published', 'closed', 'archived']),
  is_featured: z.string().optional(),
});

const JOB_FIELDS = [
  'title',
  'department',
  'employment_type',
  'location',
  'remote_status',
  'salary_min',
  'salary_max',
  'salary_currency',
  'salary_visible',
  'positions',
  'summary',
  'description',
  'responsibilities',
  'requirements',
  'skills',
  'deadline',
  'status',
  'is_featured',
] as const;

export async function saveJobAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('jobs.manage');
    const parsed = jobSchema.safeParse(Object.fromEntries(JOB_FIELDS.map((k) => [k, stringValue(form, k)])));
    if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };

    const data = parsed.data;
    const id = data.id ? Number(data.id) : null;
    const values = {
      title: data.title,
      department: data.department || '',
      employment_type: data.employment_type,
      location: data.location,
      remote_status: data.remote_status,
      salary_min: data.salary_min ? Number(data.salary_min) : null,
      salary_max: data.salary_max ? Number(data.salary_max) : null,
      salary_currency: data.salary_currency || 'ZMW',
      salary_visible: toBool(data.salary_visible) ? 1 : 0,
      positions: data.positions ? Number(data.positions) : 1,
      summary: data.summary,
      description: data.description,
      responsibilities: data.responsibilities || '',
      requirements: data.requirements || '',
      skills: data.skills || '',
      deadline: data.deadline ? data.deadline.slice(0, 10) : null,
      status: data.status,
      is_featured: toBool(data.is_featured) ? 1 : 0,
    };

    if (id) {
      const before = queryOne<Record<string, unknown>>('SELECT * FROM jobs WHERE id = ?', [id]);
      if (!before) return { ok: false, message: 'That vacancy no longer exists.' };
      execute(
        `UPDATE jobs SET title = ?, department = ?, employment_type = ?, location = ?, remote_status = ?,
          salary_min = ?, salary_max = ?, salary_currency = ?, salary_visible = ?, positions = ?, summary = ?,
          description = ?, responsibilities = ?, requirements = ?, skills = ?, deadline = ?, status = ?,
          is_featured = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          values.title,
          values.department,
          values.employment_type,
          values.location,
          values.remote_status,
          values.salary_min,
          values.salary_max,
          values.salary_currency,
          values.salary_visible,
          values.positions,
          values.summary,
          values.description,
          values.responsibilities,
          values.requirements,
          values.skills,
          values.deadline,
          values.status,
          values.is_featured,
          id,
        ],
      );
      await logChanges(user, 'job.updated', { type: 'job', id, label: values.title }, before, values, JOB_FIELDS as unknown as string[]);
      revalidatePath('/careers');
      revalidatePath(`/careers/${before.slug}`);
      revalidatePath('/dashboard/recruitment/jobs');
      return { ok: true, message: `"${values.title}" has been updated.` };
    }

    const slug = uniqueSlug('jobs', values.title);
    const info = execute(
      `INSERT INTO jobs (slug, title, department, employment_type, location, remote_status, salary_min, salary_max,
        salary_currency, salary_visible, positions, summary, description, responsibilities, requirements, skills,
        deadline, status, is_featured, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        slug,
        values.title,
        values.department,
        values.employment_type,
        values.location,
        values.remote_status,
        values.salary_min,
        values.salary_max,
        values.salary_currency,
        values.salary_visible,
        values.positions,
        values.summary,
        values.description,
        values.responsibilities,
        values.requirements,
        values.skills,
        values.deadline,
        values.status,
        values.is_featured,
        user.id,
      ],
    );
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'job.created',
      entityType: 'job',
      entityId: Number(info.lastInsertRowid),
      entityLabel: values.title,
      newValue: values.status,
    });

    revalidatePath('/careers');
    revalidatePath('/dashboard/recruitment/jobs');
    return { ok: true, message: `"${values.title}" has been ${values.status === 'published' ? 'published' : 'saved'}.` };
  } catch (error) {
    return failure(error);
  }
}

const jobStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['draft', 'published', 'closed', 'archived']),
});

export async function setJobStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('jobs.manage');
    const parsed = jobStatusSchema.safeParse({ id: stringValue(form, 'id'), status: stringValue(form, 'status') });
    if (!parsed.success) return { ok: false, message: 'Invalid request.' };

    const id = Number(parsed.data.id);
    const before = queryOne<{ status: string; title: string }>('SELECT status, title FROM jobs WHERE id = ?', [id]);
    if (!before) return { ok: false, message: 'That vacancy no longer exists.' };

    execute("UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?", [parsed.data.status, id]);
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'job.status_changed',
      entityType: 'job',
      entityId: id,
      entityLabel: before.title,
      field: 'status',
      previousValue: before.status,
      newValue: parsed.data.status,
    });

    revalidatePath('/careers');
    revalidatePath('/dashboard/recruitment/jobs');
    return { ok: true, message: `"${before.title}" is now ${parsed.data.status}.` };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteJobAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('jobs.manage');
    const id = Number(stringValue(form, 'id'));
    const before = queryOne<{ title: string }>('SELECT title FROM jobs WHERE id = ?', [id]);
    if (!before) return { ok: false, message: 'That vacancy no longer exists.' };
    execute('DELETE FROM jobs WHERE id = ?', [id]);
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'job.deleted',
      entityType: 'job',
      entityId: id,
      entityLabel: before.title,
    });
    revalidatePath('/careers');
    revalidatePath('/dashboard/recruitment/jobs');
    return { ok: true, message: `"${before.title}" has been deleted.` };
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------- applications */

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(APPLICATION_STATUSES),
  note: z.string().max(1000).optional(),
});

export async function updateApplicationStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('applications.manage');
    const parsed = statusSchema.safeParse({
      id: stringValue(form, 'id'),
      status: stringValue(form, 'status') as (typeof APPLICATION_STATUSES)[number],
      note: stringValue(form, 'note'),
    });
    if (!parsed.success) return { ok: false, message: 'Invalid request.' };

    const id = Number(parsed.data.id);
    const before = queryOne<{ status: string; first_name: string; last_name: string; user_id: number | null; job_id: number | null }>(
      'SELECT status, first_name, last_name, user_id, job_id FROM applications WHERE id = ?',
      [id],
    );
    if (!before) return { ok: false, message: 'That application no longer exists.' };

    execute("UPDATE applications SET status = ?, reviewed_by = ?, updated_at = datetime('now') WHERE id = ?", [
      parsed.data.status,
      user.id,
      id,
    ]);
    execute(
      `INSERT INTO application_events (application_id, from_status, to_status, note, actor_id, actor_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        before.status,
        parsed.data.status,
        parsed.data.note || '',
        user.id,
        user.fullName,
      ],
    );
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'application.status_changed',
      entityType: 'application',
      entityId: id,
      entityLabel: `${before.first_name} ${before.last_name}`,
      field: 'status',
      previousValue: before.status,
      newValue: parsed.data.status,
    });

    if (before.user_id) {
      notify({
        userId: before.user_id,
        type: 'application_status',
        title: 'Application update',
        body: `Your application is now marked as ${APPLICATION_STATUS_LABELS[parsed.data.status]}.`,
        href: '/dashboard/my-applications',
      });
    }

    revalidatePath('/dashboard/recruitment');
    revalidatePath(`/dashboard/recruitment/applications/${id}`);
    return {
      ok: true,
      message: `${before.first_name} ${before.last_name} moved to ${APPLICATION_STATUS_LABELS[parsed.data.status]}.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function addApplicationNoteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('applications.manage');
    const id = Number(stringValue(form, 'id'));
    const note = stringValue(form, 'note');
    const rating = stringValue(form, 'rating');
    if (!id || !note) return { ok: false, message: 'Write a note first.' };

    execute("UPDATE applications SET notes = ?, rating = ?, updated_at = datetime('now') WHERE id = ?", [
      note,
      rating ? Number(rating) : 0,
      id,
    ]);
    execute(
      `INSERT INTO application_events (application_id, from_status, to_status, note, actor_id, actor_name, created_at)
       VALUES (?, '', '', ?, ?, ?, datetime('now'))`,
      [id, note, user.id, user.fullName],
    );
    revalidatePath(`/dashboard/recruitment/applications/${id}`);
    return { ok: true, message: 'Note saved.' };
  } catch (error) {
    return failure(error);
  }
}

export async function scheduleInterviewAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('applications.manage');
    const id = Number(stringValue(form, 'id'));
    const scheduledAt = stringValue(form, 'scheduled_at');
    const mode = stringValue(form, 'mode') || 'Online';
    const location = stringValue(form, 'location');
    const notes = stringValue(form, 'notes');
    if (!id || !scheduledAt) return { ok: false, message: 'Choose a date and time.' };

    execute(
      `INSERT INTO interviews (application_id, scheduled_at, mode, location, notes, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [id, scheduledAt.replace('T', ' ').slice(0, 16), mode, location, notes],
    );
    execute(
      "UPDATE applications SET status = CASE WHEN status IN ('new','under_review') THEN 'interview' ELSE status END, updated_at = datetime('now') WHERE id = ?",
      [id],
    );
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'interview.scheduled',
      entityType: 'application',
      entityId: id,
      entityLabel: `Interview ${scheduledAt}`,
    });
    revalidatePath(`/dashboard/recruitment/applications/${id}`);
    return { ok: true, message: 'Interview scheduled.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteApplicationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('applications.manage');
    const id = Number(stringValue(form, 'id'));
    const before = queryOne<{ first_name: string; last_name: string }>('SELECT first_name, last_name FROM applications WHERE id = ?', [id]);
    if (!before) return { ok: false, message: 'That application no longer exists.' };
    execute('DELETE FROM applications WHERE id = ?', [id]);
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'application.deleted',
      entityType: 'application',
      entityId: id,
      entityLabel: `${before.first_name} ${before.last_name}`,
    });
    revalidatePath('/dashboard/recruitment');
    return { ok: true, message: 'Application deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ------------------------------------------------------------- invitations */

const inviteSchema = z.object({
  application_id: z.string().min(1),
  role_key: z.string().min(2),
  job_title: z.string().trim().max(120).optional(),
  department_id: z.string().optional(),
  manager_id: z.string().optional(),
});

export async function inviteCandidateAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('onboarding.manage');
    const parsed = inviteSchema.safeParse({
      application_id: stringValue(form, 'application_id'),
      role_key: stringValue(form, 'role_key'),
      job_title: stringValue(form, 'job_title'),
      department_id: stringValue(form, 'department_id'),
      manager_id: stringValue(form, 'manager_id'),
    });
    if (!parsed.success) return { ok: false, message: 'Please complete the invitation details.' };

    const id = Number(parsed.data.application_id);
    const application = queryOne<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      job_id: number | null;
      user_id: number | null;
      location: string;
    }>('SELECT id, first_name, last_name, email, phone, job_id, user_id, location FROM applications WHERE id = ?', [id]);
    if (!application) return { ok: false, message: 'That application no longer exists.' };

    const job = application.job_id
      ? queryOne<{ title: string }>('SELECT title FROM jobs WHERE id = ?', [application.job_id])
      : null;

    let userId = application.user_id;
    if (userId) {
      execute(
        "UPDATE users SET role_key = ?, job_title = ?, department_id = ?, manager_id = ?, status = 'invited', updated_at = datetime('now') WHERE id = ?",
        [
          parsed.data.role_key,
          parsed.data.job_title || job?.title || '',
          parsed.data.department_id ? Number(parsed.data.department_id) : null,
          parsed.data.manager_id ? Number(parsed.data.manager_id) : null,
          userId,
        ],
      );
    } else {
      const existing = queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [application.email.toLowerCase()]);
      if (existing) {
        userId = existing.id;
        execute(
          "UPDATE users SET role_key = ?, job_title = ?, department_id = ?, manager_id = ?, updated_at = datetime('now') WHERE id = ?",
          [
            parsed.data.role_key,
            parsed.data.job_title || job?.title || '',
            parsed.data.department_id ? Number(parsed.data.department_id) : null,
            parsed.data.manager_id ? Number(parsed.data.manager_id) : null,
            userId,
          ],
        );
      } else {
        const info = execute(
          `INSERT INTO users (uuid, email, first_name, last_name, phone, role_key, job_title, department_id, manager_id,
            location, status, country, password_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'invited', 'Zambia', ?, datetime('now'), datetime('now'))`,
          [
            `usr_${randomToken(8)}`,
            application.email.toLowerCase(),
            application.first_name,
            application.last_name,
            application.phone,
            parsed.data.role_key,
            parsed.data.job_title || job?.title || '',
            parsed.data.department_id ? Number(parsed.data.department_id) : null,
            parsed.data.manager_id ? Number(parsed.data.manager_id) : null,
            application.location || '',
            hashPassword(randomToken(24)),
          ],
        );
        userId = Number(info.lastInsertRowid);
      }
      execute('UPDATE applications SET user_id = ? WHERE id = ?', [userId, id]);
    }

    const token = await issueToken('invitation', userId, application.email, { application_id: id });
    const link = `${siteUrl()}/invite/${token}`;

    await sendMail({
      to: application.email,
      subject: 'Invitation to join Seedwel Workplace',
      body: `Dear ${application.first_name},\n\nWe are pleased to invite you to join Seedwel Investment Limited${
        job?.title ? ` as ${job.title}` : ''
      }.\n\nOpen this link to set your password and complete your registration:\n${link}\n\nThis invitation is personal to you. If you were not expecting it, please ignore this message.`,
    });

    execute(
      `UPDATE applications SET status = 'invitation_sent', updated_at = datetime('now') WHERE id = ?`,
      [id],
    );
    execute(
      `INSERT INTO application_events (application_id, from_status, to_status, note, actor_id, actor_name, created_at)
       VALUES (?, ?, 'invitation_sent', ?, ?, ?, datetime('now'))`,
      [id, 'approved', 'Secure invitation sent by email.', user.id, user.fullName],
    );

    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'onboarding.invitation_sent',
      entityType: 'application',
      entityId: id,
      entityLabel: `${application.first_name} ${application.last_name}`,
      newValue: parsed.data.role_key,
    });

    notifyPermission('onboarding.manage', {
      type: 'invitation',
      title: 'Candidate invited',
      body: `${application.first_name} ${application.last_name} was invited to register.`,
      href: `/dashboard/recruitment/applications/${id}`,
    });

    revalidatePath('/dashboard/recruitment');
    revalidatePath(`/dashboard/recruitment/applications/${id}`);
    revalidatePath('/dashboard/users');
    return { ok: true, message: `Invitation sent to ${application.email}.` };
  } catch (error) {
    return failure(error);
  }
}

export async function resendInvitationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await actor('onboarding.manage');
    const id = Number(stringValue(form, 'user_id'));
    const target = queryOne<{ id: number; email: string; first_name: string; status: string }>(
      'SELECT id, email, first_name, status FROM users WHERE id = ?',
      [id],
    );
    if (!target) return { ok: false, message: 'That user no longer exists.' };

    const token = await issueToken('invitation', target.id, target.email, {});
    await sendMail({
      to: target.email,
      subject: 'Your Seedwel Workplace invitation',
      body: `Hello ${target.first_name},\n\nHere is a fresh invitation link:\n${siteUrl()}/invite/${token}`,
    });
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'onboarding.invitation_resent',
      entityType: 'user',
      entityId: target.id,
      entityLabel: target.email,
    });
    revalidatePath('/dashboard/users');
    return { ok: true, message: 'A new invitation link has been sent.' };
  } catch (error) {
    return failure(error);
  }
}

export { toLines };
