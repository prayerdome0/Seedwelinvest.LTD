'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { execute, queryOne, uniqueSlug } from '@/lib/db';
import { clientIp } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { notifyPermission, notify } from '@/lib/notifications';
import { sendMail } from '@/lib/mailer';
import { storeUpload, recordDocument, UploadError } from '@/lib/uploads';
import { reference, slugify, toBool } from '@/lib/utils';
import { stringValue, zodToErrors, type ActionState } from '@/lib/forms';

const email = z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address');
const phone = z.string().trim().min(6, 'Enter a contact number').max(40);
const required = (label: string) => z.string().trim().min(1, `Enter ${label}`);

function guard(key: string, limit = 5, windowMs = 10 * 60 * 1000): ActionState | null {
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    const minutes = Math.max(1, Math.ceil(result.retryAfter / 60));
    return { ok: false, message: `Too many submissions from this connection. Please try again in about ${minutes} minute(s).` };
  }
  return null;
}

function fail(message: string, errors?: Record<string, string>, values?: Record<string, string>): ActionState {
  return { ok: false, message, errors, values };
}

/* ------------------------------------------------------------ contact form */

const contactSchema = z.object({
  name: required('your name').max(120),
  email,
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10, 'Tell us a little more — at least 10 characters').max(4000),
  consent: z.string().optional(),
});

export async function submitContact(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const limited = guard(`contact:${ip}`, 5);
  if (limited) return limited;

  const parsed = contactSchema.safeParse({
    name: stringValue(form, 'name'),
    email: stringValue(form, 'email'),
    phone: stringValue(form, 'phone'),
    subject: stringValue(form, 'subject'),
    message: stringValue(form, 'message'),
    consent: stringValue(form, 'consent'),
  });
  const values = Object.fromEntries(
    ['name', 'email', 'phone', 'subject', 'message'].map((k) => [k, stringValue(form, k)]),
  );
  if (!parsed.success) return fail('Please check the highlighted fields.', zodToErrors(parsed.error), values);
  if (!toBool(parsed.data.consent)) {
    return fail('Please confirm that we may use your details to reply.', { consent: 'Confirmation is required' }, values);
  }

  const ref = reference('MSG');
  execute(
    `INSERT INTO service_requests (reference, service_id, name, company, email, phone, budget, deadline, description,
      status, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, '', NULL, ?, 'new', datetime('now'), datetime('now'))`,
    [
      ref,
      parsed.data.name,
      parsed.data.subject || 'Website enquiry',
      parsed.data.email,
      parsed.data.phone || '',
      `Subject: ${parsed.data.subject || 'General enquiry'}\n\n${parsed.data.message}`,
    ],
  );

  notifyPermission('service_requests.manage', {
    type: 'service_request',
    title: 'New website enquiry',
    body: `${parsed.data.name} — ${parsed.data.subject || 'General enquiry'}`,
    href: '/dashboard/service-requests',
  });

  await sendMail({
    to: parsed.data.email,
    subject: `We received your message (${ref})`,
    body: `Dear ${parsed.data.name},\n\nThank you for contacting Seedwel Investment Limited. A member of our team will respond within one working day.\n\nYour reference is ${ref}.\n\nKind regards,\nSeedwel Investment Limited`,
  });

  revalidatePath('/dashboard/service-requests');
  return { ok: true, message: 'Thank you — your message has been sent. We will reply within one working day.', reference: ref };
}

/* ---------------------------------------------------- request a service form */

const serviceRequestSchema = z.object({
  name: required('your name').max(120),
  company: z.string().trim().max(160).optional(),
  email,
  phone: phone,
  service_id: z.string().trim().min(1, 'Choose the service you need'),
  budget: z.string().trim().max(80).optional(),
  deadline: z.string().trim().max(40).optional(),
  description: z.string().trim().min(15, 'Please describe what you need — at least 15 characters').max(6000),
  consent: z.string().optional(),
});

export async function submitServiceRequest(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const limited = guard(`service-request:${ip}`, 6);
  if (limited) return limited;

  const parsed = serviceRequestSchema.safeParse({
    name: stringValue(form, 'name'),
    company: stringValue(form, 'company'),
    email: stringValue(form, 'email'),
    phone: stringValue(form, 'phone'),
    service_id: stringValue(form, 'service_id'),
    budget: stringValue(form, 'budget'),
    deadline: stringValue(form, 'deadline'),
    description: stringValue(form, 'description'),
    consent: stringValue(form, 'consent'),
  });
  const values = Object.fromEntries(
    ['name', 'company', 'email', 'phone', 'service_id', 'budget', 'deadline', 'description'].map((k) => [
      k,
      stringValue(form, k),
    ]),
  );
  if (!parsed.success) return fail('Please check the highlighted fields.', zodToErrors(parsed.error), values);
  if (!toBool(parsed.data.consent)) {
    return fail('Please confirm before submitting.', { consent: 'Confirmation is required' }, values);
  }

  const service = queryOne<{ id: number; name: string }>('SELECT id, name FROM services WHERE id = ?', [
    Number(parsed.data.service_id),
  ]);
  if (!service) return fail('That service is no longer available. Please choose another.', undefined, values);

  let attachmentPath: string | null = null;
  const file = form.get('attachment');
  if (file instanceof File && file.size > 0) {
    try {
      const stored = await storeUpload(file, 'private', 'service-requests');
      attachmentPath = stored.storedName;
    } catch (error) {
      return fail(error instanceof UploadError ? error.message : 'The attachment could not be uploaded.', undefined, values);
    }
  }

  const ref = reference('REQ');
  execute(
    `INSERT INTO service_requests (reference, service_id, name, company, email, phone, budget, deadline, description,
      attachment_path, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))`,
    [
      ref,
      service.id,
      parsed.data.name,
      parsed.data.company || '',
      parsed.data.email,
      parsed.data.phone,
      parsed.data.budget || '',
      parsed.data.deadline ? parsed.data.deadline.slice(0, 10) : null,
      parsed.data.description,
      attachmentPath,
    ],
  );

  notifyPermission('service_requests.manage', {
    type: 'service_request',
    title: 'New service request',
    body: `${parsed.data.name} requested ${service.name}`,
    href: '/dashboard/service-requests',
  });

  await sendMail({
    to: parsed.data.email,
    subject: `Service request received (${ref})`,
    body: `Dear ${parsed.data.name},\n\nThank you for your request for ${service.name}. Our team will review it and come back to you with a scope, a price and a delivery date within one to two working days.\n\nYour reference is ${ref}.\n\nKind regards,\nSeedwel Investment Limited`,
  });

  revalidatePath('/dashboard/service-requests');
  return { ok: true, message: `Request received. Your reference is ${ref} — we will respond within two working days.`, reference: ref };
}

/* ------------------------------------------------------------ job application */

const applicationSchema = z.object({
  job_id: z.string().trim().min(1, 'Select the role you are applying for'),
  first_name: required('your first name').max(80),
  last_name: required('your last name').max(80),
  email,
  phone: phone,
  country: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  education: z.string().trim().max(400).optional(),
  experience: z.string().trim().max(60).optional(),
  skills: z.string().trim().max(1000).optional(),
  cover_letter: z.string().trim().min(20, 'Please write a short cover letter (at least 20 characters)').max(6000),
  portfolio_url: z.string().trim().url('Enter a valid URL').max(300).optional().or(z.literal('')),
  additional_info: z.string().trim().max(2000).optional(),
  consent: z.string().optional(),
});

export async function submitApplication(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const limited = guard(`application:${ip}`, 6);
  if (limited) return limited;

  const parsed = applicationSchema.safeParse({
    job_id: stringValue(form, 'job_id'),
    first_name: stringValue(form, 'first_name'),
    last_name: stringValue(form, 'last_name'),
    email: stringValue(form, 'email'),
    phone: stringValue(form, 'phone'),
    country: stringValue(form, 'country'),
    location: stringValue(form, 'location'),
    education: stringValue(form, 'education'),
    experience: stringValue(form, 'experience'),
    skills: stringValue(form, 'skills'),
    cover_letter: stringValue(form, 'cover_letter'),
    portfolio_url: stringValue(form, 'portfolio_url'),
    additional_info: stringValue(form, 'additional_info'),
    consent: stringValue(form, 'consent'),
  });

  const fieldNames = [
    'job_id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'country',
    'location',
    'education',
    'experience',
    'skills',
    'cover_letter',
    'portfolio_url',
    'additional_info',
  ];
  const values = Object.fromEntries(fieldNames.map((k) => [k, stringValue(form, k)]));

  if (!parsed.success) return fail('Please check the highlighted fields.', zodToErrors(parsed.error), values);
  if (!toBool(parsed.data.consent)) {
    return fail('Please confirm that we may process your application.', { consent: 'Confirmation is required' }, values);
  }

  const job = queryOne<{ id: number; title: string; status: string }>('SELECT id, title, status FROM jobs WHERE id = ?', [
    Number(parsed.data.job_id),
  ]);
  if (!job || job.status !== 'published') {
    return fail('This vacancy is no longer accepting applications.', undefined, values);
  }

  const cv = form.get('cv');
  let cvStored: string | null = null;
  if (cv instanceof File && cv.size > 0) {
    try {
      const stored = await storeUpload(cv, 'private', 'applications');
      cvStored = stored.storedName;
    } catch (error) {
      return fail(error instanceof UploadError ? error.message : 'Your CV could not be uploaded.', undefined, values);
    }
  }

  const ref = reference('APP');
  const info = execute(
    `INSERT INTO applications (reference, job_id, first_name, last_name, email, phone, country, location, education,
      experience, skills, cover_letter, portfolio_url, cv_path, additional_info, consent, status, source,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'new', 'website', datetime('now'), datetime('now'))`,
    [
      ref,
      job.id,
      parsed.data.first_name,
      parsed.data.last_name,
      parsed.data.email,
      parsed.data.phone,
      parsed.data.country || 'Zambia',
      parsed.data.location || '',
      parsed.data.education || '',
      parsed.data.experience || '',
      parsed.data.skills || '',
      parsed.data.cover_letter,
      parsed.data.portfolio_url || '',
      cvStored,
      parsed.data.additional_info || '',
    ],
  );
  const applicationId = Number(info.lastInsertRowid);

  if (cvStored && cv instanceof File) {
    recordDocument({
      name: `${parsed.data.first_name} ${parsed.data.last_name} — CV`,
      category: 'application',
      storedName: cvStored,
      mime: cv.type || 'application/octet-stream',
      size: cv.size,
      ownerId: null,
      uploaderId: 0,
      relatedType: 'application',
      relatedId: applicationId,
      visibility: 'role',
      allowedRoles: 'hr,administrator,super_admin,director',
      isSensitive: true,
    });
  }

  execute(
    `INSERT INTO application_events (application_id, from_status, to_status, note, actor_name, created_at)
     VALUES (?, '', 'new', ?, 'Website', datetime('now'))`,
    [applicationId, 'Application submitted through the website.'],
  );
  execute('UPDATE jobs SET applicant_count = (SELECT COUNT(*) FROM applications WHERE job_id = jobs.id) WHERE id = ?', [job.id]);

  notifyPermission('applications.manage', {
    type: 'application_new',
    title: 'New application received',
    body: `${parsed.data.first_name} ${parsed.data.last_name} applied for ${job.title}`,
    href: `/dashboard/recruitment/applications/${applicationId}`,
  });

  await sendMail({
    to: parsed.data.email,
    subject: `Application received (${ref})`,
    body: `Dear ${parsed.data.first_name},\n\nThank you for applying for the ${job.title} position at Seedwel Investment Limited. Our recruitment team reviews every application and will contact you if you are shortlisted.\n\nYour reference is ${ref}.\n\nKind regards,\nSeedwel Recruitment Team`,
  });

  revalidatePath('/dashboard/recruitment');
  revalidatePath('/careers');
  return { ok: true, message: `Application received. Your reference is ${ref}. We will contact you if you are shortlisted.`, reference: ref };
}

/* ------------------------------------------------------- opportunity interest */

const interestSchema = z.object({
  opportunity_id: z.string().trim().min(1),
  name: required('your name').max(120),
  email,
  phone: z.string().trim().max(40).optional(),
  organisation: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10, 'Please tell us a little more').max(4000),
  consent: z.string().optional(),
});

export async function submitOpportunityInterest(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const limited = guard(`interest:${ip}`, 6);
  if (limited) return limited;

  const parsed = interestSchema.safeParse({
    opportunity_id: stringValue(form, 'opportunity_id'),
    name: stringValue(form, 'name'),
    email: stringValue(form, 'email'),
    phone: stringValue(form, 'phone'),
    organisation: stringValue(form, 'organisation'),
    message: stringValue(form, 'message'),
    consent: stringValue(form, 'consent'),
  });
  const values = Object.fromEntries(
    ['name', 'email', 'phone', 'organisation', 'message', 'opportunity_id'].map((k) => [k, stringValue(form, k)]),
  );
  if (!parsed.success) return fail('Please check the highlighted fields.', zodToErrors(parsed.error), values);
  if (!toBool(parsed.data.consent)) {
    return fail('Please confirm before submitting.', { consent: 'Confirmation is required' }, values);
  }

  const opportunity = queryOne<{ id: number; title: string }>('SELECT id, title FROM opportunities WHERE id = ?', [
    Number(parsed.data.opportunity_id),
  ]);
  if (!opportunity) return fail('That opportunity is no longer listed.', undefined, values);

  execute(
    `INSERT INTO opportunity_interests (opportunity_id, name, email, phone, organisation, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'new', datetime('now'))`,
    [
      opportunity.id,
      parsed.data.name,
      parsed.data.email,
      parsed.data.phone || '',
      parsed.data.organisation || '',
      parsed.data.message,
    ],
  );

  notifyPermission('opportunities.manage', {
    type: 'system',
    title: 'New expression of interest',
    body: `${parsed.data.name} expressed interest in ${opportunity.title}`,
    href: '/dashboard/opportunities',
  });

  await sendMail({
    to: parsed.data.email,
    subject: 'Thank you for your interest',
    body: `Dear ${parsed.data.name},\n\nThank you for expressing interest in "${opportunity.title}". Our team will review your message and respond within two working days.\n\nKind regards,\nSeedwel Investment Limited`,
  });

  revalidatePath('/dashboard/opportunities');
  return { ok: true, message: 'Thank you — your expression of interest has been sent.' };
}

/* ------------------------------------------------------------- newsletter-ish */

export async function submitCvTalentPool(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const limited = guard(`talent:${ip}`, 4);
  if (limited) return limited;

  const parsed = z
    .object({
      name: required('your name').max(120),
      email,
      phone: phone,
      skills: z.string().trim().max(600).optional(),
      notes: z.string().trim().max(2000).optional(),
      consent: z.string().optional(),
    })
    .safeParse({
      name: stringValue(form, 'name'),
      email: stringValue(form, 'email'),
      phone: stringValue(form, 'phone'),
      skills: stringValue(form, 'skills'),
      notes: stringValue(form, 'notes'),
      consent: stringValue(form, 'consent'),
    });

  const values = Object.fromEntries(['name', 'email', 'phone', 'skills', 'notes'].map((k) => [k, stringValue(form, k)]));
  if (!parsed.success) return fail('Please check the highlighted fields.', zodToErrors(parsed.error), values);
  if (!toBool(parsed.data.consent)) {
    return fail('Please confirm before submitting.', { consent: 'Confirmation is required' }, values);
  }

  const cv = form.get('cv');
  let cvStored: string | null = null;
  if (cv instanceof File && cv.size > 0) {
    try {
      const stored = await storeUpload(cv, 'private', 'applications');
      cvStored = stored.storedName;
    } catch (error) {
      return fail(error instanceof UploadError ? error.message : 'Your CV could not be uploaded.', undefined, values);
    }
  }

  // Stored as an application against no vacancy so the talent pool is searchable.
  const ref = reference('TAL');
  const [first, ...rest] = parsed.data.name.split(' ');
  const info = execute(
    `INSERT INTO applications (reference, job_id, first_name, last_name, email, phone, country, skills,
      additional_info, cv_path, consent, status, source, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, 'Zambia', ?, ?, ?, 1, 'new', 'talent-pool', datetime('now'), datetime('now'))`,
    [ref, first || parsed.data.name, rest.join(' ') || '', parsed.data.email, parsed.data.phone, parsed.data.skills || '', parsed.data.notes || '', cvStored],
  );
  if (cvStored && cv instanceof File) {
    recordDocument({
      name: `${parsed.data.name} — CV (talent pool)`,
      category: 'cv',
      storedName: cvStored,
      mime: cv.type || 'application/octet-stream',
      size: cv.size,
      ownerId: null,
      uploaderId: 0,
      relatedType: 'application',
      relatedId: Number(info.lastInsertRowid),
      visibility: 'role',
      allowedRoles: 'hr,administrator,super_admin',
      isSensitive: true,
    });
  }

  notifyPermission('applications.manage', {
    type: 'application_new',
    title: 'Talent pool submission',
    body: `${parsed.data.name} joined the talent pool`,
    href: '/dashboard/recruitment',
  });

  return { ok: true, message: 'Thank you — your details have been added to our talent pool.' };
}

export { slugify, uniqueSlug, notify };
