# Seedwel Investment LTD

The public website for **Seedwel Investment LTD** — a growing organisation working across **digital solutions, online work opportunities, business support and education initiatives** — plus a Firebase-backed Seedwel Operations & Workforce Management System with private applicant, worker and administration experiences.

## What the website says about Seedwel

> Seedwel Investment LTD combines digital services, online work opportunities,
> business support and education initiatives to create practical opportunities
> for individuals and businesses.

- **Digital & Business Services** — website development, logo & brand design, business cards & business materials, graphics & social media design, customized digital solutions. The headline idea is the **package**: website + logo + business card + graphics + other digital materials, built as one consistent solution.
- **Online Work & Recruitment** — two active remote roles only: **Virtual Assistant** and **Cold Caller**, presented honestly as **$600/month + 10% commission on eligible sales** (exact terms confirmed in the role description/work agreement — never promised loosely on the site).
- **Education** — **Seedwel Early Learning** (a free early-learning initiative for ages 3–5, presented as developing) and **Seedwel Tuition** in Mathematics and Computer Studies.
- **What We're Building** — the About page shows honestly what exists today (digital services), what is growing (VA and cold-calling teams) and the education initiative, instead of pretending to be a large corporation.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home — hero, What We Do (4 areas), the website + graphics package, How We Build It (5 steps), education, live portfolio, story teaser |
| `about.html` | Our Story and What We're Building (today / growing / education initiative) |
| `services.html` | Digital & business services with the package concept |
| `education.html` | Seedwel Education Initiative — Early Learning (ages 3–5, free) and Tuition (Mathematics, Computer Studies) |
| `projects.html` | Live public portfolio (managed from the admin dashboard) |
| `apply.html` | Careers — **Virtual Assistant** and **Cold Caller** only, with responsibilities, compensation summary and the honest application→dashboard process |
| `contact.html` | Contact form (saved to Firebase) |
| `request.html` | **Request a Service** form — creates a service request in the admin workflow |
| `support.html` | Help centre and FAQ |
| `privacy.html` / `cookie-policy.html` / `terms.html` | Legal |
| `login.html` | Member login page for approved/registered accounts |
| `register.html` | One-time invitation registration page with applicant details pre-filled |
| `dashboard.html` | Private member dashboard (member ID, **My Documents**, tasks, notifications, profile, security) |
| `admin/dashboard.html` | Modular admin: overview metrics and activity |
| `admin/applications.html` (+ `application.html`) | Recruitment inbox and application detail |
| `admin/members.html` (+ `member.html`) | Approved members and registration state |
| `admin/documents.html` | **Worker document library** — upload → select role → publish |
| `admin.html` | Legacy all-in-one operations workspace (requests, jobs, tasks, portfolio/media, messages, verification, reports, audit, settings) |
| `verify.html` | Public Seedwel worker verification page (opened by scanning a worker's QR code) |

## Design system

- `assets/css/site.css` is the shared design system for all public pages: consistent header/footer, one button style, clean cards, subtle shadows and gentle scroll reveals.
- `assets/js/site.js` provides the shared behaviour: mobile navigation, reveal-on-scroll (once per element, reduced-motion aware), the professional footer on every page, the floating WhatsApp button and the privacy/cookie consent banner.
- **Animations: many small, controlled ones.** Staggered hero entrance, scroll reveals with delays, card lift on hover, image zoom on hover, animated FAQ accordions, nav underline transitions and step cards that respond to hover. All are disabled under `prefers-reduced-motion`. Deliberately avoided: spinning logos, floating objects, neon glows, particle backgrounds and text flying across the screen.
- `assets/images/` contains purpose-made imagery per section (see `MEDIA_LIBRARY.md` for the plan to grow this into a 100–200 asset Cloudinary library while loading only ~30–50 optimized images on the site).

## Privacy & cookie consent

- A bottom consent banner appears on a visitor's first visit with a genuine choice: **Accept All**, **Manage Preferences** (per-category toggles) or **Reject Non-Essential**. Rejecting keeps the site fully functional.
- The choice is stored locally (`seedwel.consent.v1`), can be changed at any time via **Cookie settings** in the footer, and is exposed to scripts as `window.SeedwelConsent`.
- `privacy.html` explains in plain language what is collected (service requests, contact forms, job applications and CVs), why, which third parties are involved (Firebase, Cloudinary, Vercel), retention and user rights. `cookie-policy.html` lists the exact storage items used.

## Service requests (public → admin workflow)

- Visitors submit the **Request a Service** form (`request.html`, pre-selectable via `?service=website-package`, `?service=web-development`, etc.). Requests are pushed to `serviceRequests` in the Firebase Realtime Database; Database Rules allow public *creation only* (with status `new`) and administrator-only reads/updates.
- The legacy admin workspace (`admin.html` → **Requests**) manages each request through the pipeline **New → Reviewing → Assigned → In Progress → Completed** (plus Cancelled), with assignee names, optional notes, search, status filters, email reply and an audit-log entry for every status change.

## Hiring portal (two roles, one honest process)

- **One login entry point** (`login.html`): the account role is stored in Firebase (server-side rules), never chosen in the browser. After sign-in, admins are routed to the admin dashboard, approved workers to their dashboard, and applicants to their status screen.
- **Only two positions are advertised**: Virtual Assistant and Cold Caller. Compensation is presented as **$600/month + 10% commission on eligible sales**, with a note that the exact terms (including which sales are eligible) are defined in the job description and work agreement. Additional openings may still be posted from the admin **Jobs** view and then appear on the careers page.
- **Application workflow**: Application → Review → Shortlisted → Approved → **Registration Invitation** → Registration → Dashboard. No password is ever generated for a worker; after approval the applicant receives a secure one-time registration link and creates their own password. Every admin status change is added to the audit trail with its actor and timestamp.
- **Automatic Worker IDs** (`SWL-YYYY-000001`): issued transactionally on approval from a monotonic counter; unique, permanent, never reused, and impossible for applicants to set themselves (blocked by Database Rules).
- **QR verification**: each approved worker gets a secure random verification token. The QR opens `verify.html?t=…`, which checks the token live against `/verifications` and shows VERIFIED WORKER or VERIFICATION FAILED with limited verification data.
- **Important rule shown throughout**: creating an account does **not** guarantee employment or a job award.

## Worker document library (role-based)

Each worker has a **My Documents** section in their dashboard. The admin controls exactly what each role sees:

1. **Upload** (`/admin/documents`) — the file is signed server-side and stored in Cloudinary as an `authenticated` (non-public) asset under `seedwel/worker-documents/<role>/…`.
2. **Select role** — e.g. `VA_Onboarding_Guide.pdf` → *Virtual Assistants*; `Cold_Caller_Call_Script.pdf` → *Cold Callers*.
3. **Publish** — the document appears in the dashboards of the selected roles only.

Access control is enforced twice: the Database Rules only let a worker read `documents/{id}` and their own `documentsByRole/<role>` index, and the download API (`/api/cloudinary-document`) re-reads the record with the worker's own ID token before issuing a short-lived signed Cloudinary URL. CVs work the same way through `/api/cloudinary-download` (admin-only). See `FIREBASE_SETUP.md` for the rules to deploy.

## Team portal

- Applicants submit public applications via `apply.html` (with private CV upload to Cloudinary). After admin approval, the system creates a one-time registration invitation; the applicant then creates their own password and activates their member account.
- `dashboard.html` is protected by Firebase Authentication. Pending accounts see an "Application under review" screen; only **active** workers see the dashboard (role, commission rate, stats, My Documents, and assigned tasks). Workers can move tasks **Pending → In Progress → Completed** and leave progress notes, and submit daily reports.
- The legacy admin workspace has a **Workers** panel: approve, reject, suspend, or activate workers, plus an **Assign a task** form that writes to `/tasks/{workerUid}/{taskId}`.

## Media

See **`MEDIA_LIBRARY.md`** for the Cloudinary folder strategy, the 100–200 asset library plan by category, and the rules that keep imagery human (real Seedwel photos first, no identifiable children without permission, no fake official/government branding, optimized delivery).

## Tests

```bash
npm install
npm test
```

Covers HTML/JS syntax, the CV Cloudinary signature/download API, the worker-document API (role visibility, admin-only uploads, managed folders), the service-request form and the shared site script (footer, consent banner, reveals).

## Development notes

- Static site + Vercel serverless functions in `api/`. No build step.
- `vercel.json` holds the rewrites (`/admin/*`, `/member/dashboard`, `/register`) and security headers.
- `database.rules.json` and `storage.rules` must be deployed with the Firebase CLI after changes (see `FIREBASE_SETUP.md`).
