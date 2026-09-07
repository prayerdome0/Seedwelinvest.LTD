'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { execute, queryAll, queryOne, uniqueSlug } from '@/lib/db';
import { assertPermission, AuthorizationError } from '@/lib/auth/guards';
import { logAudit, logChanges } from '@/lib/audit';
import { notify } from '@/lib/notifications';
import { deletePublicUpload, recordDocument, storeUpload, UploadError } from '@/lib/uploads';
import { issueToken } from './auth';
import { hashPassword, randomToken } from '@/lib/auth/password';
import { sendMail, siteUrl } from '@/lib/mailer';
import { PERMISSION_KEYS, ROLE_DEFINITIONS } from '@/lib/rbac';
import { toBool, toLines, todayIsoDate } from '@/lib/utils';
import { stringValue, zodToErrors, type ActionState } from '@/lib/forms';

function failure(error: unknown): ActionState {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  const zod = error as { issues?: Array<{ path: PropertyKey[]; message: string }> };
  if (zod?.issues?.length) {
    const errors: Record<string, string> = {};
    for (const issue of zod.issues) errors[String(issue.path[0] ?? 'form')] = issue.message;
    return { ok: false, message: 'Please check the highlighted fields.', errors };
  }
  console.error('[admin action]', error);
  return { ok: false, message: 'Something went wrong. Please try again.' };
}

/* -------------------------------------------------------------------- users */

const userSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().trim().min(1, 'Enter a first name').max(80),
  last_name: z.string().trim().min(1, 'Enter a last name').max(80),
  email: z.string().trim().email('Enter a valid email address').max(160),
  phone: z.string().trim().max(40).optional(),
  role_key: z.string().min(2),
  department_id: z.string().optional(),
  manager_id: z.string().optional(),
  job_title: z.string().trim().max(120).optional(),
  employment_type: z.string().trim().max(40).optional(),
  location: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'invited', 'disabled']),
  bio: z.string().trim().max(2000).optional(),
  send_invite: z.string().optional(),
});

const USER_FIELDS = ['first_name','last_name','email','phone','role_key','department_id','manager_id','job_title','employment_type','location','status','bio'];

export async function saveUserAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('users.update');
    const parsed = userSchema.safeParse(Object.fromEntries(USER_FIELDS.map((k) => [k, stringValue(form, k)])));
    if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };
    const d = parsed.data;

    // Only a super administrator may create or modify a super administrator.
    const superAdmin = user.permissions.includes('system.super');
    if (d.role_key === 'super_admin' && !superAdmin) {
      throw new AuthorizationError('Only a super administrator can assign the Super Admin role.');
    }

    const email = d.email.toLowerCase();
    const values = {
      first_name: d.first_name,
      last_name: d.last_name,
      email,
      phone: d.phone || '',
      role_key: d.role_key,
      department_id: d.department_id ? Number(d.department_id) : null,
      manager_id: d.manager_id ? Number(d.manager_id) : null,
      job_title: d.job_title || '',
      employment_type: d.employment_type || '',
      location: d.location || '',
      status: d.status,
      bio: d.bio || '',
    };

    if (d.id) {
      const id = Number(d.id);
      const before = queryOne<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [id]);
      if (!before) return { ok: false, message: 'That user no longer exists.' };
      if (String(before.role_key) === 'super_admin' && !superAdmin) {
        throw new AuthorizationError('Only a super administrator can modify another super administrator.');
      }
      execute(
        `UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, role_key = ?, department_id = ?,
          manager_id = ?, job_title = ?, employment_type = ?, location = ?, status = ?, bio = ?, updated_at = datetime(\'now\')
         WHERE id = ?`,
        [values.first_name, values.last_name, values.email, values.phone, values.role_key, values.department_id, values.manager_id, values.job_title, values.employment_type, values.location, values.status, values.bio, id],
      );
      await logChanges(user, 'user.updated', { type: 'user', id, label: `${values.first_name} ${values.last_name}` }, before, values, USER_FIELDS);
      revalidatePath('/dashboard/users');
      revalidatePath(`/dashboard/users/${id}`);
      return { ok: true, message: 'User updated.' };
    }

    const existing = queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return { ok: false, message: 'An account already exists for that email address.', errors: { email: 'Already registered' } };

    const info = execute(
      `INSERT INTO users (uuid, email, password_hash, first_name, last_name, phone, role_key, department_id, manager_id,
        job_title, employment_type, location, status, bio, country, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Zambia', datetime(\'now\'), datetime(\'now\'))`,
      [`usr_${randomToken(8)}`, email, hashPassword(randomToken(24)), values.first_name, values.last_name, values.phone, values.role_key, values.department_id, values.manager_id, values.job_title, values.employment_type, values.location, values.status, values.bio],
    );
    const newId = Number(info.lastInsertRowid);
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'user.created',
      entityType: 'user',
      entityId: newId,
      entityLabel: `${values.first_name} ${values.last_name}`,
      newValue: values.role_key,
    });

    if (toBool(d.send_invite)) {
      const token = await issueToken('invitation', newId, email, {});
      await sendMail({
        to: email,
        subject: 'Your Seedwel Workplace account',
        body: `Hello ${values.first_name},\n\nAn account has been created for you on Seedwel Workplace. Open this link to set your password:\n${siteUrl()}/invite/${token}`,
      });
      execute("UPDATE users SET status = 'invited' WHERE id = ?", [newId]);
    }

    revalidatePath('/dashboard/users');
    return { ok: true, message: 'User created.' };
  } catch (error) {
    return failure(error);
  }
}

export async function setUserStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('users.disable');
    const id = Number(stringValue(form, 'id'));
    const status = stringValue(form, 'status');
    if (!['active', 'invited', 'disabled'].includes(status)) return { ok: false, message: 'Invalid status.' };
    if (id === user.id) return { ok: false, message: 'You cannot change the status of your own account.' };

    const before = queryOne<{ status: string; first_name: string; last_name: string; role_key: string; email: string }>(
      'SELECT status, first_name, last_name, role_key, email FROM users WHERE id = ?',
      [id],
    );
    if (!before) return { ok: false, message: 'That user no longer exists.' };
    if (before.role_key === 'super_admin' && !user.permissions.includes('system.super')) {
      throw new AuthorizationError('Only a super administrator can change another super administrator.');
    }

    execute("UPDATE users SET status = ?, updated_at = datetime(\'now\') WHERE id = ?", [status, id]);
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'user.status_changed',
      entityType: 'user',
      entityId: id,
      entityLabel: `${before.first_name} ${before.last_name}`,
      field: 'status',
      previousValue: before.status,
      newValue: status,
    });
    revalidatePath('/dashboard/users');
    return { ok: true, message: `${before.first_name} ${before.last_name} is now ${status}.` };
  } catch (error) {
    return failure(error);
  }
}

export async function resetUserPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('users.reset_password');
    const id = Number(stringValue(form, 'id'));
    const target = queryOne<{ id: number; email: string; first_name: string }>('SELECT id, email, first_name FROM users WHERE id = ?', [id]);
    if (!target) return { ok: false, message: 'That user no longer exists.' };

    const token = await issueToken('reset_password', target.id, target.email, {});
    await sendMail({
      to: target.email,
      subject: 'Set a new password',
      body: `Hello ${target.first_name},\n\nAn administrator has started a password reset for your Seedwel Workplace account. Open this link within 2 hours to choose a new password:\n${siteUrl()}/reset-password?token=${token}`,
    });
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: id,
      entityLabel: target.email,
    });
    notify({ userId: id, type: 'system', title: 'Password reset requested', body: 'An administrator started a password reset for your account.', href: '/dashboard' });
    revalidatePath('/dashboard/users');
    return { ok: true, message: `A reset link has been sent to ${target.email}.` };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteUserAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('users.delete');
    const id = Number(stringValue(form, 'id'));
    if (id === user.id) return { ok: false, message: 'You cannot delete your own account.' };
    const target = queryOne<{ first_name: string; last_name: string; role_key: string }>(
      'SELECT first_name, last_name, role_key FROM users WHERE id = ?',
      [id],
    );
    if (!target) return { ok: false, message: 'That user no longer exists.' };
    if (target.role_key === 'super_admin' && !user.permissions.includes('system.super')) {
      throw new AuthorizationError('Only a super administrator can delete another super administrator.');
    }
    execute('DELETE FROM users WHERE id = ?', [id]);
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'user.deleted',
      entityType: 'user',
      entityId: id,
      entityLabel: `${target.first_name} ${target.last_name}`,
    });
    revalidatePath('/dashboard/users');
    return { ok: true, message: 'User deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ----------------------------------------------------- roles and departments */

export async function saveRolePermissionsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('roles.manage');
    const roleKey = stringValue(form, 'role_key');
    const definition = ROLE_DEFINITIONS.find((r) => r.key === roleKey);
    if (!definition) return { ok: false, message: 'Unknown role.' };

    const selected = new Set(form.getAll('permissions').map((v) => String(v)).filter((p) => PERMISSION_KEYS.includes(p as never)));
    const before = queryAll<{ permission: string }>('SELECT permission FROM role_permissions WHERE role_key = ?', [roleKey]).map((r) => r.permission);

    execute('DELETE FROM role_permissions WHERE role_key = ?', [roleKey]);
    for (const permission of selected) {
      execute('INSERT INTO role_permissions (role_key, permission) VALUES (?, ?)', [roleKey, permission]);
    }

    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'role.permissions_updated',
      entityType: 'role',
      entityLabel: definition.name,
      field: 'permissions',
      previousValue: `${before.length} permissions`,
      newValue: `${selected.size} permissions`,
    });

    revalidatePath('/dashboard/roles');
    return { ok: true, message: `${definition.name} permissions updated.` };
  } catch (error) {
    return failure(error);
  }
}

export async function resetRolePermissionsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('roles.manage');
    const roleKey = stringValue(form, 'role_key');
    const definition = ROLE_DEFINITIONS.find((r) => r.key === roleKey);
    if (!definition) return { ok: false, message: 'Unknown role.' };
    execute('DELETE FROM role_permissions WHERE role_key = ?', [roleKey]);
    for (const permission of definition.permissions) {
      execute('INSERT INTO role_permissions (role_key, permission) VALUES (?, ?)', [roleKey, permission]);
    }
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'role.permissions_reset',
      entityType: 'role',
      entityLabel: definition.name,
    });
    revalidatePath('/dashboard/roles');
    return { ok: true, message: `${definition.name} permissions restored to defaults.` };
  } catch (error) {
    return failure(error);
  }
}

export async function saveDepartmentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('departments.manage');
    const name = stringValue(form, 'name');
    const description = stringValue(form, 'description');
    const head = stringValue(form, 'head_user_id');
    const id = stringValue(form, 'id');
    if (name.length < 2) return { ok: false, message: 'Enter a department name.', errors: { name: 'Required' } };

    if (id) {
      execute('UPDATE departments SET name = ?, description = ?, head_user_id = ? WHERE id = ?', [
        name,
        description,
        head ? Number(head) : null,
        Number(id),
      ]);
    } else {
      execute('INSERT INTO departments (name, description, head_user_id) VALUES (?, ?, ?)', [name, description, head ? Number(head) : null]);
    }
    await logAudit({
      actorId: user.id,
      actorName: user.fullName,
      action: id ? 'department.updated' : 'department.created',
      entityType: 'department',
      entityId: id ? Number(id) : null,
      entityLabel: name,
    });
    revalidatePath('/dashboard/departments');
    revalidatePath('/dashboard/users');
    return { ok: true, message: 'Department saved.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteDepartmentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('departments.manage');
    const id = Number(stringValue(form, 'id'));
    const dept = queryOne<{ name: string }>('SELECT name FROM departments WHERE id = ?', [id]);
    if (!dept) return { ok: false, message: 'That department no longer exists.' };
    execute('DELETE FROM departments WHERE id = ?', [id]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'department.deleted', entityType: 'department', entityId: id, entityLabel: dept.name });
    revalidatePath('/dashboard/departments');
    return { ok: true, message: 'Department deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ----------------------------------------------------------------- settings */

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('settings.manage');
    const keys = form.getAll('key').map(String);
    const patch: Record<string, string> = {};
    keys.forEach((key, i) => {
      patch[key] = String(form.getAll('value')[i] ?? '');
    });

    const { updateSettings } = await import('@/lib/settings');
    updateSettings(patch, { id: user.id, fullName: user.fullName });

    revalidatePath('/', 'layout');
    revalidatePath('/dashboard/settings');
    revalidatePath('/contact');
    return { ok: true, message: 'Settings saved.' };
  } catch (error) {
    return failure(error);
  }
}

/* ----------------------------------------------------------------- services */

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, 'Name the service').max(120),
  division: z.enum(['digital', 'branding', 'business', 'talent', 'education', 'opportunities']),
  icon: z.string().trim().max(40).optional(),
  summary: z.string().trim().min(20, 'Write a short summary').max(400),
  description: z.string().trim().max(8000).optional(),
  benefits: z.string().max(4000).optional(),
  process: z.string().max(4000).optional(),
  deliverables: z.string().max(2000).optional(),
  starting_price: z.string().trim().max(60).optional(),
  is_published: z.string().optional(),
  is_featured: z.string().optional(),
  sort_order: z.string().optional(),
});

export async function saveServiceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('services.manage');
    const parsed = serviceSchema.safeParse(
      Object.fromEntries(['id','name','division','icon','summary','description','benefits','process','deliverables','starting_price','is_published','is_featured','sort_order'].map((k) => [k, stringValue(form, k)])),
    );
    if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };
    const d = parsed.data;

    let imagePath = stringValue(form, 'existing_image') || null;
    const image = form.get('image');
    if (image instanceof File && image.size > 0) {
      const stored = await storeUpload(image, 'public', 'services');
      imagePath = stored.path;
      execute('INSERT INTO media (name, path, mime, size, alt, folder, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        stored.name,
        stored.path,
        stored.mime,
        stored.size,
        d.name,
        'Services',
        user.id,
      ]);
    }

    const values = {
      name: d.name,
      division: d.division,
      icon: d.icon || 'Sparkles',
      summary: d.summary,
      description: d.description || '',
      benefits: toLines(d.benefits),
      process: toLines(d.process),
      deliverables: toLines(d.deliverables),
      starting_price: d.starting_price || '',
      is_published: toBool(d.is_published) ? 1 : 0,
      is_featured: toBool(d.is_featured) ? 1 : 0,
      sort_order: d.sort_order ? Number(d.sort_order) : 0,
      image_path: imagePath,
    };

    if (d.id) {
      const id = Number(d.id);
      const before = queryOne<Record<string, unknown>>('SELECT * FROM services WHERE id = ?', [id]);
      if (!before) return { ok: false, message: 'That service no longer exists.' };
      execute(
        `UPDATE services SET name = ?, division = ?, icon = ?, summary = ?, description = ?, benefits = ?, process = ?,
          deliverables = ?, starting_price = ?, is_published = ?, is_featured = ?, sort_order = ?, image_path = ?,
          updated_at = datetime(\'now\') WHERE id = ?`,
        [values.name, values.division, values.icon, values.summary, values.description, values.benefits, values.process, values.deliverables, values.starting_price, values.is_published, values.is_featured, values.sort_order, values.image_path, id],
      );
      await logChanges(user, 'service.updated', { type: 'service', id, label: values.name }, before, values, ['name', 'summary', 'starting_price', 'is_published']);
    } else {
      const info = execute(
        `INSERT INTO services (slug, name, division, icon, summary, description, benefits, process, deliverables,
          image_path, starting_price, is_featured, is_published, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))`,
        [uniqueSlug('services', values.name), values.name, values.division, values.icon, values.summary, values.description, values.benefits, values.process, values.deliverables, values.image_path, values.starting_price, values.is_featured, values.is_published, values.sort_order],
      );
      await logAudit({ actorId: user.id, actorName: user.fullName, action: 'service.created', entityType: 'service', entityId: Number(info.lastInsertRowid), entityLabel: values.name });
    }

    revalidatePath('/services', 'layout');
    revalidatePath('/dashboard/services');
    return { ok: true, message: 'Service saved.' };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    return failure(error);
  }
}

export async function deleteServiceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('services.manage');
    const id = Number(stringValue(form, 'id'));
    const service = queryOne<{ name: string }>('SELECT name FROM services WHERE id = ?', [id]);
    if (!service) return { ok: false, message: 'That service no longer exists.' };
    execute('DELETE FROM services WHERE id = ?', [id]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'service.deleted', entityType: 'service', entityId: id, entityLabel: service.name });
    revalidatePath('/services', 'layout');
    revalidatePath('/dashboard/services');
    return { ok: true, message: 'Service deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ------------------------------------------------------------ opportunities */

const opportunitySchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, 'Give the opportunity a title').max(160),
  category: z.enum(['business_opportunity', 'partnership', 'project', 'investment_information', 'investment_product']),
  summary: z.string().trim().min(20, 'Write a short summary').max(400),
  description: z.string().trim().max(8000).optional(),
  location: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(80).optional(),
  status: z.enum(['draft', 'published', 'unpublished', 'closed', 'archived']),
  requirements: z.string().max(4000).optional(),
  investment_range: z.string().trim().max(120).optional(),
  closing_date: z.string().optional(),
  contact_name: z.string().trim().max(120).optional(),
  contact_email: z.string().trim().max(160).optional(),
  contact_phone: z.string().trim().max(40).optional(),
  is_regulated: z.string().optional(),
  disclaimer: z.string().max(1200).optional(),
  is_featured: z.string().optional(),
});

export async function saveOpportunityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('opportunities.manage');
    const parsed = opportunitySchema.safeParse(
      Object.fromEntries(['id','title','category','summary','description','location','industry','status','requirements','investment_range','closing_date','contact_name','contact_email','contact_phone','is_regulated','disclaimer','is_featured'].map((k) => [k, stringValue(form, k)])),
    );
    if (!parsed.success) return { ok: false, message: 'Please check the highlighted fields.', errors: zodToErrors(parsed.error) };
    const d = parsed.data;

    const values = {
      title: d.title,
      category: d.category,
      summary: d.summary,
      description: d.description || '',
      location: d.location || 'Zambia',
      industry: d.industry || '',
      status: d.status,
      requirements: toLines(d.requirements),
      investment_range: d.investment_range || '',
      closing_date: d.closing_date ? d.closing_date.slice(0, 10) : null,
      contact_name: d.contact_name || '',
      contact_email: d.contact_email || '',
      contact_phone: d.contact_phone || '',
      is_regulated: toBool(d.is_regulated) || d.category === 'investment_product' ? 1 : 0,
      disclaimer: d.disclaimer || '',
      is_featured: toBool(d.is_featured) ? 1 : 0,
    };

    if (d.id) {
      const id = Number(d.id);
      const before = queryOne<Record<string, unknown>>('SELECT * FROM opportunities WHERE id = ?', [id]);
      if (!before) return { ok: false, message: 'That opportunity no longer exists.' };
      execute(
        `UPDATE opportunities SET title = ?, category = ?, summary = ?, description = ?, location = ?, industry = ?,
          status = ?, requirements = ?, investment_range = ?, closing_date = ?, contact_name = ?, contact_email = ?,
          contact_phone = ?, is_regulated = ?, disclaimer = ?, is_featured = ?, updated_at = datetime(\'now\') WHERE id = ?`,
        [values.title, values.category, values.summary, values.description, values.location, values.industry, values.status, values.requirements, values.investment_range, values.closing_date, values.contact_name, values.contact_email, values.contact_phone, values.is_regulated, values.disclaimer, values.is_featured, id],
      );
      await logChanges(user, 'opportunity.updated', { type: 'opportunity', id, label: values.title }, before, values, ['title', 'status', 'category', 'is_regulated']);
    } else {
      const info = execute(
        `INSERT INTO opportunities (slug, title, category, summary, description, location, industry, status, requirements,
          investment_range, closing_date, contact_name, contact_email, contact_phone, is_regulated, disclaimer, is_featured,
          created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))`,
        [uniqueSlug('opportunities', values.title), values.title, values.category, values.summary, values.description, values.location, values.industry, values.status, values.requirements, values.investment_range, values.closing_date, values.contact_name, values.contact_email, values.contact_phone, values.is_regulated, values.disclaimer, values.is_featured, user.id],
      );
      await logAudit({ actorId: user.id, actorName: user.fullName, action: 'opportunity.created', entityType: 'opportunity', entityId: Number(info.lastInsertRowid), entityLabel: values.title });
    }

    revalidatePath('/opportunities', 'layout');
    revalidatePath('/dashboard/opportunities');
    return { ok: true, message: 'Opportunity saved.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteOpportunityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('opportunities.manage');
    const id = Number(stringValue(form, 'id'));
    const item = queryOne<{ title: string }>('SELECT title FROM opportunities WHERE id = ?', [id]);
    if (!item) return { ok: false, message: 'That opportunity no longer exists.' };
    execute('DELETE FROM opportunities WHERE id = ?', [id]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'opportunity.deleted', entityType: 'opportunity', entityId: id, entityLabel: item.title });
    revalidatePath('/opportunities', 'layout');
    revalidatePath('/dashboard/opportunities');
    return { ok: true, message: 'Opportunity deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ------------------------------------------------------------- education */

export async function saveCourseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('education.manage');
    const title = stringValue(form, 'title');
    const id = stringValue(form, 'id');
    if (title.length < 3) return { ok: false, message: 'Give the programme a title.', errors: { title: 'Required' } };

    const payload = {
      title,
      category: stringValue(form, 'category') || 'Digital skills',
      summary: stringValue(form, 'summary'),
      description: stringValue(form, 'description'),
      outcomes: toLines(stringValue(form, 'outcomes')),
      duration: stringValue(form, 'duration'),
      level: stringValue(form, 'level'),
      mode: stringValue(form, 'mode'),
      sort_order: Number(stringValue(form, 'sort_order') || 0),
      is_published: toBool(stringValue(form, 'is_published')) ? 1 : 0,
    };

    if (id) {
      execute(
        `UPDATE courses SET title = ?, category = ?, summary = ?, description = ?, outcomes = ?, duration = ?, level = ?,
          mode = ?, sort_order = ?, is_published = ? WHERE id = ?`,
        [payload.title, payload.category, payload.summary, payload.description, payload.outcomes, payload.duration, payload.level, payload.mode, payload.sort_order, payload.is_published, Number(id)],
      );
    } else {
      execute(
        `INSERT INTO courses (slug, title, category, summary, description, outcomes, duration, level, mode, sort_order, is_published, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))`,
        [uniqueSlug('courses', payload.title), payload.title, payload.category, payload.summary, payload.description, payload.outcomes, payload.duration, payload.level, payload.mode, payload.sort_order, payload.is_published],
      );
    }
    await logAudit({ actorId: user.id, actorName: user.fullName, action: id ? 'course.updated' : 'course.created', entityType: 'course', entityId: id ? Number(id) : null, entityLabel: payload.title });
    revalidatePath('/education');
    revalidatePath('/dashboard/education');
    return { ok: true, message: 'Programme saved.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCourseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('education.manage');
    const id = Number(stringValue(form, 'id'));
    execute('DELETE FROM courses WHERE id = ?', [id]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'course.deleted', entityType: 'course', entityId: id });
    revalidatePath('/education');
    revalidatePath('/dashboard/education');
    return { ok: true, message: 'Programme deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ---------------------------------------------------------- website content */

export async function saveContentBlockAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('content.manage');
    const key = stringValue(form, 'key');
    if (!key) return { ok: false, message: 'Missing content key.' };

    let imagePath = stringValue(form, 'existing_image') || null;
    const image = form.get('image');
    if (image instanceof File && image.size > 0) {
      const stored = await storeUpload(image, 'public', 'content');
      imagePath = stored.path;
      execute('INSERT INTO media (name, path, mime, size, alt, folder, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        stored.name,
        stored.path,
        stored.mime,
        stored.size,
        key,
        'Content',
        user.id,
      ]);
    }

    const extraRaw = stringValue(form, 'extra');
    let extra = '{}';
    if (extraRaw) {
      try {
        extra = JSON.stringify(JSON.parse(extraRaw));
      } catch {
        return { ok: false, message: 'The structured field must contain valid JSON.', errors: { extra: 'Invalid JSON' } };
      }
    }

    const before = queryOne<Record<string, unknown>>('SELECT * FROM content_blocks WHERE key = ?', [key]);
    const values = {
      title: stringValue(form, 'title'),
      subtitle: stringValue(form, 'subtitle'),
      body: stringValue(form, 'body'),
      extra,
      image_path: imagePath,
      updated_by: user.id,
    };

    if (before) {
      execute(
        "UPDATE content_blocks SET title = ?, subtitle = ?, body = ?, extra = ?, image_path = ?, updated_by = ?, updated_at = datetime(\'now\') WHERE key = ?",
        [values.title, values.subtitle, values.body, values.extra, values.image_path, values.updated_by, key],
      );
    } else {
      execute(
        `INSERT INTO content_blocks (key, page, title, subtitle, body, extra, image_path, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))`,
        [key, stringValue(form, 'page') || 'general', values.title, values.subtitle, values.body, values.extra, values.image_path, values.updated_by],
      );
    }

    await logChanges(user, 'content.updated', { type: 'content', id: null, label: key }, before ?? {}, values, ['title', 'subtitle', 'body', 'image_path']);

    revalidatePath('/', 'layout');
    revalidatePath('/dashboard/content');
    return { ok: true, message: 'Content saved. The public site updates within a few seconds.' };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    return failure(error);
  }
}

export async function saveSimpleRecordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const entity = stringValue(form, 'entity');
    const permission =
      entity === 'testimonial' ? 'testimonials.manage' : entity === 'faq' ? 'faqs.manage' : entity === 'leader' ? 'leadership.manage' : 'content.manage';
    const user = await assertPermission(permission);
    const id = stringValue(form, 'id');

    if (entity === 'testimonial') {
      const values = [stringValue(form, 'name'), stringValue(form, 'role'), stringValue(form, 'company'), stringValue(form, 'quote'), Number(stringValue(form, 'rating') || 5), toBool(stringValue(form, 'is_published')) ? 1 : 0];
      if (!values[0]) return { ok: false, message: 'Enter the person’s name.', errors: { name: 'Required' } };
      if (id) {
        execute('UPDATE testimonials SET name = ?, role = ?, company = ?, quote = ?, rating = ?, is_published = ? WHERE id = ?', [...values, Number(id)]);
      } else {
        execute('INSERT INTO testimonials (name, role, company, quote, rating, is_published, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))', values);
      }
      revalidatePath('/', 'layout');
      revalidatePath('/dashboard/content/testimonials');
      return { ok: true, message: 'Testimonial saved.' };
    }

    if (entity === 'faq') {
      const values = [stringValue(form, 'question'), stringValue(form, 'answer'), stringValue(form, 'category') || 'General', toBool(stringValue(form, 'is_published')) ? 1 : 0];
      if (!values[0]) return { ok: false, message: 'Enter a question.', errors: { question: 'Required' } };
      if (id) {
        execute('UPDATE faqs SET question = ?, answer = ?, category = ?, is_published = ? WHERE id = ?', [...values, Number(id)]);
      } else {
        execute('INSERT INTO faqs (question, answer, category, is_published) VALUES (?, ?, ?, ?)', values);
      }
      revalidatePath('/dashboard/content/testimonials');
      return { ok: true, message: 'FAQ saved.' };
    }

    if (entity === 'leader') {
      let imagePath = stringValue(form, 'existing_image') || null;
      const image = form.get('image');
      if (image instanceof File && image.size > 0) {
        const stored = await storeUpload(image, 'public', 'leadership');
        imagePath = stored.path;
      }
      const values = [
        stringValue(form, 'name'),
        stringValue(form, 'title'),
        stringValue(form, 'short_bio'),
        stringValue(form, 'bio'),
        stringValue(form, 'message'),
        toLines(stringValue(form, 'responsibilities')),
        stringValue(form, 'focus'),
        stringValue(form, 'email'),
        stringValue(form, 'linkedin'),
        imagePath,
        toBool(stringValue(form, 'is_published')) ? 1 : 0,
      ];
      if (!values[0]) return { ok: false, message: 'Enter the person’s name.', errors: { name: 'Required' } };
      if (id) {
        execute(
          `UPDATE leadership SET name = ?, title = ?, short_bio = ?, bio = ?, message = ?, responsibilities = ?, focus = ?,
            email = ?, linkedin = ?, image_path = ?, is_published = ?, updated_at = datetime(\'now\') WHERE id = ?`,
          [...values, Number(id)],
        );
      } else {
        execute(
          `INSERT INTO leadership (name, title, short_bio, bio, message, responsibilities, focus, email, linkedin, image_path, is_published)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          values,
        );
      }
      revalidatePath('/about');
      revalidatePath('/', 'layout');
      revalidatePath('/dashboard/leadership');
      return { ok: true, message: 'Leadership profile saved.' };
    }

    return { ok: false, message: 'Unknown record type.' };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    return failure(error);
  }
}

export async function deleteSimpleRecordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const entity = stringValue(form, 'entity');
    const id = Number(stringValue(form, 'id'));
    const permission =
      entity === 'testimonial' ? 'testimonials.manage' : entity === 'faq' ? 'faqs.manage' : entity === 'leader' ? 'leadership.manage' : 'content.manage';
    const user = await assertPermission(permission);

    if (entity === 'testimonial') execute('DELETE FROM testimonials WHERE id = ?', [id]);
    else if (entity === 'faq') execute('DELETE FROM faqs WHERE id = ?', [id]);
    else if (entity === 'leader') execute('DELETE FROM leadership WHERE id = ?', [id]);
    else return { ok: false, message: 'Unknown record type.' };

    await logAudit({ actorId: user.id, actorName: user.fullName, action: `${entity}.deleted`, entityType: entity, entityId: id });
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard/leadership');
    revalidatePath('/dashboard/content/testimonials');
    return { ok: true, message: 'Deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------------------------------------- announcements */

export async function saveAnnouncementAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('announcements.manage');
    const id = stringValue(form, 'id');
    const title = stringValue(form, 'title');
    if (!title) return { ok: false, message: 'Give the announcement a title.', errors: { title: 'Required' } };

    const values = [
      title,
      stringValue(form, 'body'),
      stringValue(form, 'audience') || 'all',
      stringValue(form, 'priority') || 'normal',
      toBool(stringValue(form, 'is_published')) ? 1 : 0,
      user.id,
    ];

    if (id) {
      execute('UPDATE announcements SET title = ?, body = ?, audience = ?, priority = ?, is_published = ? WHERE id = ?', [...values.slice(0, 5), Number(id)]);
    } else {
      execute(
        `INSERT INTO announcements (title, body, audience, priority, is_published, author_id, published_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))`,
        values,
      );
      // Notify the audience
      const audience = String(values[2]);
      const roleFilter = audience === 'staff' ? "role_key NOT IN ('client','applicant')" : audience === 'clients' ? "role_key = 'client'" : audience === 'applicants' ? "role_key = 'applicant'" : '1=1';
      const recipients = queryAll<{ id: number }>(`SELECT id FROM users WHERE status = 'active' AND ${roleFilter}`).map((r) => r.id);
      for (const uid of recipients) {
        notify({ userId: uid, type: 'announcement', title, body: String(values[1]).slice(0, 180), href: '/dashboard/notifications' });
      }
    }

    await logAudit({ actorId: user.id, actorName: user.fullName, action: id ? 'announcement.updated' : 'announcement.published', entityType: 'announcement', entityId: id ? Number(id) : null, entityLabel: title });
    revalidatePath('/dashboard/announcements');
    revalidatePath('/dashboard');
    return { ok: true, message: id ? 'Announcement updated.' : 'Announcement published.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteAnnouncementAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('announcements.manage');
    execute('DELETE FROM announcements WHERE id = ?', [Number(stringValue(form, 'id'))]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'announcement.deleted', entityType: 'announcement', entityId: Number(stringValue(form, 'id')) });
    revalidatePath('/dashboard/announcements');
    return { ok: true, message: 'Announcement deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* --------------------------------------------------------------------- media */

export async function uploadMediaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('media.manage');
    const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return { ok: false, message: 'Choose at least one file.' };
    const folder = stringValue(form, 'folder') || 'general';

    for (const file of files) {
      const stored = await storeUpload(file, 'public', folder.toLowerCase().replace(/[^\w-]/g, '') || 'general');
      execute('INSERT INTO media (name, path, mime, size, width, height, alt, folder, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        file.name,
        stored.path,
        stored.mime,
        stored.size,
        stored.width ?? null,
        stored.height ?? null,
        stringValue(form, 'alt') || file.name,
        folder,
        user.id,
      ]);
    }
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'media.uploaded', entityLabel: `${files.length} file(s)` });
    revalidatePath('/dashboard/media');
    return { ok: true, message: `${files.length} file${files.length === 1 ? '' : 's'} uploaded.` };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    return failure(error);
  }
}

export async function deleteMediaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission('media.manage');
    const id = Number(stringValue(form, 'id'));
    const item = queryOne<{ path: string; name: string }>('SELECT path, name FROM media WHERE id = ?', [id]);
    if (!item) return { ok: false, message: 'That file no longer exists.' };
    await deletePublicUpload(item.path);
    execute('DELETE FROM media WHERE id = ?', [id]);
    await logAudit({ actorId: user.id, actorName: user.fullName, action: 'media.deleted', entityType: 'media', entityId: id, entityLabel: item.name });
    revalidatePath('/dashboard/media');
    return { ok: true, message: 'File deleted.' };
  } catch (error) {
    return failure(error);
  }
}

/* ------------------------------------------------------------- notifications */

export async function markNotificationsReadAction(): Promise<void> {
  const { requireUser } = await import('@/lib/auth/guards');
  const user = await requireUser();
  const { markAllRead } = await import('@/lib/notifications');
  markAllRead(user.id);
  revalidatePath('/dashboard/notifications');
}

export async function uploadAvatarAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { requireUser } = await import('@/lib/auth/guards');
    const user = await requireUser();
    const targetId = Number(stringValue(form, 'user_id') || user.id);
    if (targetId !== user.id && !user.permissions.includes('users.update')) {
      throw new AuthorizationError('You do not have permission to change that profile picture.');
    }
    const file = form.get('avatar');
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose an image.' };
    const stored = await storeUpload(file, 'public', 'avatars');
    execute("UPDATE users SET avatar_path = ?, updated_at = datetime(\'now\') WHERE id = ?", [stored.path, targetId]);
    revalidatePath('/dashboard/users');
    return { ok: true, message: 'Profile picture updated.' };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    return failure(error);
  }
}

export { todayIsoDate, recordDocument };
