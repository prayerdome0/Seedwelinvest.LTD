# Seedwel Investment LTD

Static public website and a Firebase-backed Seedwel Operations & Workforce Management System with private applicant, worker and administration experiences.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home |
| `about.html` | About the company |
| `services.html` | Services (ZRA / NAPSA / PACRA assistance, technology, marketing) |
| `projects.html` | Live public portfolio (managed from the admin dashboard) |
| `apply.html` | Careers / job applications |
| `contact.html` | Contact form (saved to Firebase) |
| `request.html` | **Request a Service** form — creates a service request in the admin workflow |
| `support.html` | Help centre and FAQ |
| `privacy.html` / `cookie-policy.html` / `terms.html` | Legal |
| `login.html` | Member login page for approved/registered accounts |
| `register.html` | One-time invitation registration page with applicant details pre-filled |
| `dashboard.html` | Private member dashboard (member ID, tasks, notifications, profile, security) |
| `admin/*.html` | New modular admin pages for login, dashboard, applications and members |
| `admin.html` | Legacy all-in-one admin workspace kept during the transition |
| `verify.html` | Public Seedwel worker verification page (opened by scanning a worker's QR code) |

## Design system

- `assets/css/site.css` is the shared design system for all public pages: consistent header/footer, one button style, clean cards, subtle shadows and gentle scroll reveals.
- `assets/js/site.js` provides the shared behaviour: mobile navigation, reveal-on-scroll (once per element, reduced-motion aware), the professional footer on every page, the floating WhatsApp button and the privacy/cookie consent banner.
- `assets/images/` contains purpose-made photography for each service (ZRA, NAPSA, PACRA, web development, AI automation, digital marketing, design and support) plus the home/about images.

## Privacy & cookie consent

- A bottom consent banner appears on a visitor's first visit with a genuine choice: **Accept All**, **Manage Preferences** (per-category toggles) or **Reject Non-Essential**. Rejecting keeps the site fully functional.
- The choice is stored locally (`seedwel.consent.v1`), can be changed at any time via **Cookie settings** in the footer, and is exposed to scripts as `window.SeedwelConsent`.
- `privacy.html` explains in plain language what is collected (service requests, contact forms, job applications and CVs), why, which third parties are involved (Firebase, Cloudinary, Vercel), retention and user rights. `cookie-policy.html` lists the exact storage items used.

## Service requests (public → admin workflow)

- Visitors submit the **Request a Service** form (`request.html`, pre-selectable via `?service=zra`, `?service=web-development`, etc.). Requests are pushed to `serviceRequests` in the Firebase Realtime Database; Database Rules allow public *creation only* (with status `new`) and administrator-only reads/updates.
- The admin dashboard (`admin.html` → **Requests**) manages each request through the pipeline **New → Reviewing → Assigned → In Progress → Completed** (plus Cancelled), with assignee names, optional notes, search, status filters, email reply and an audit-log entry for every status change.

## Government services clarification

ZRA, NAPSA, PACRA and Workers' Compensation services are presented as **private assistance with the relevant process**. The website states clearly that Seedwel Investment LTD is not these agencies and is not affiliated with them — official registrations are issued by the institutions themselves. Keep this wording when editing service pages.

## Hiring portal

- **One login entry point** (`login.html`): the account role is stored in Firebase (server-side rules), never chosen in the browser. After sign-in, admins are routed to `admin.html`, approved workers to their dashboard, and applicants to their status screen.
- **Application workflow**: Registered → Application Started → Submitted → Reviewing → Shortlisted → Interview → Approved → Worker ID Generated → Active Worker → Job Assigned → Completed. Every admin status change is added to the audit trail with its actor and timestamp.
- **Automatic Worker IDs** (`SWL-YYYY-000001`): issued transactionally on approval from a monotonic counter; unique, permanent, never reused, and impossible for applicants to set themselves (blocked by Database Rules).
- **QR verification**: each approved worker gets a secure random verification token. The QR opens `verify.html?t=…`, which checks the token live against `/verifications` and shows VERIFIED WORKER or VERIFICATION FAILED with limited verification data.
- **Cloudinary Worker ID photos**: active workers can upload or replace their ID profile photo in the dashboard. It appears on the private ID card and the token-based public verification record.
- **Operations admin**: mobile-friendly sidebar navigation, service-request pipeline, global applicant/worker/Worker ID search, approval and suspension controls, detailed jobs, private documents, database-driven reports/CSV export, live operations charts, administrator-tracked worker daily reports, notifications, verification monitoring and an append-only audit log.
- **Important rule shown throughout**: creating an account does **not** guarantee employment or a job award.

## Team portal (Phase 2 + Phase 3)

- Applicants submit public applications via `apply.html`. After admin approval, the system creates a one-time registration invitation; the applicant then creates their own password and activates their member account.
- `dashboard.html` is protected by Firebase Authentication. Pending accounts see an "Application under review" screen; only **active** workers see the dashboard (role, commission rate, stats, and assigned tasks). Workers can move tasks **Pending → In Progress → Completed** and leave progress notes.
- `admin.html` has a **Team workers** panel: approve, reject, suspend, or activate workers (sets `/workers/{uid}/status`), plus an **Assign a task** form that writes to `/tasks/{workerUid}/{taskId}`.
- Task records live under `/tasks/{workerUid}/{taskId}`; a worker can read and update **only their own** tasks, while the administrator manages all workers and tasks.

## Uploads and portfolio administration

- **All new uploads use the existing connected Cloudinary product environment**: portfolio images, authenticated/private CVs and Worker ID profile photos are organised in its `portfolio` asset folder. Serverless functions create signed requests; no API secret or unsigned upload preset is exposed in browser code.
- Open `admin.html` to manage published portfolio projects with up to six photos each, protected image uploads, public portfolio details, share links, **service requests**, **contact inbox** and **job applications**.
- Careers submissions always reach the private admin inbox. If the CV provider is unavailable, the application is saved with a follow-up flag instead of being discarded.
- Open `projects.html` for the live, shareable portfolio (shows only entries published by the administrator).
- See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) before production use. Confirm the Vercel Cloudinary integration provides `CLOUDINARY_URL`, then deploy the included Firebase Database/Storage Rules (including the new `serviceRequests` node).

## Tests

```bash
npm test
```

Runs the Node test suite in `tests/` (Cloudinary CV upload helper and HTML/JS sanity checks).
