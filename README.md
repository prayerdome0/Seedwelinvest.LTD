# Seedwel Investment Limited

A production-grade corporate website for **Seedwel Investment Limited** (Lusaka, Zambia) plus
**Seedwel Workplace**, the private management platform that runs the company behind it.

> **Building Businesses. Creating Opportunities. Driving Growth.**

The public site tells customers, partners and job seekers who Seedwel is and how to work with
them. Seedwel Workplace is where the work actually happens: tasks, projects, clients,
recruitment, documents, messaging, reporting and a full content management system — all
controlled by the company's own administrators without touching code.

---

## Contents

| Section | What it covers |
| --- | --- |
| [Quick start](#quick-start) | Install, run, build |
| [Demo accounts](#demo-accounts) | Sign in and explore each role |
| [The public website](#the-public-website) | Pages and how content is managed |
| [Seedwel Workplace](#seedwel-workplace) | Every module, by role |
| [Recruitment pipeline](#recruitment-pipeline) | Applications → interviews → invitation → onboarding |
| [Roles & permissions](#roles--permissions) | 12 roles, database-driven permissions |
| [Security](#security) | Authentication, authorisation, files, audit |
| [Content management](#content-management) | What an administrator can change |
| [Architecture](#architecture) | Stack, folders, data model |
| [Performance & accessibility](#performance--accessibility) | Budgets and what was done |
| [Deployment](#deployment) | Production notes and SQLite limits |

---

## Quick start

Requires **Node.js 20.9+** and npm.

```bash
npm install
cp .env.example .env      # then edit AUTH_SECRET and the admin bootstrap values
npm run dev               # http://localhost:3000
```

On first run the application creates `data/seedwel.db`, applies the schema and seeds
demonstration content (people, tasks, vacancies, applications, projects, documents,
announcements and every website content block).

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3000, bound to `0.0.0.0` |
| `npm run build` | Production build (also runs type checking) |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm run db:reset` | Delete and re-seed the database |
| `npm run db:seed` | Re-run the seeder |

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin used for SEO, sitemap and emails |
| `AUTH_SECRET` | Signs session cookies; **must** be changed in production |
| `DATABASE_PATH` | SQLite file location (default `./data/seedwel.db`, resolved against the state directory) |
| `PRIVATE_UPLOAD_DIR` | Where access-controlled files are stored (outside `public/`) |
| `SEEDWEL_STATE_DIR` | Overrides the writable state root (default: the project directory, or `/tmp/seedwel` when it is read-only) |
| `MAIL_DRIVER` | `outbox` (stored in the database) or `console` |
| `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL` | Sender identity |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, … | Bootstrap super administrator created at seed time |

---

## Demo accounts

The seed creates one account per role so every screen can be explored.
**Password for all seeded accounts: `Seedwel@2026`.**
The bootstrap administrator uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

| Email | Role | Lands on |
| --- | --- | --- |
| `admin@seedwel.example` (see `.env`) | Super Admin | `/dashboard` |
| `zacheus.simbaya@seedwelinvest.example` | Director | `/dashboard` |
| `brian.chanda@seedwelinvest.example` | Manager | `/dashboard` |
| `mutinta.banda@seedwelinvest.example` | HR | `/dashboard/recruitment` |
| `grace.mwale@seedwelinvest.example` | Virtual Assistant | `/dashboard/my-day` |
| `loveness.phiri@seedwelinvest.example` | Cold Caller | `/dashboard/my-day` |
| `chipo.sakala@seedwelinvest.example` | Business Development | `/dashboard/service-requests` |
| `thandiwe.mbewe@seedwelinvest.example` | General Staff | `/dashboard/my-day` |
| `client@example.com` | Client | `/dashboard/my-work` |
| `musonda.peter@example.com` | Applicant | `/dashboard/my-applications` |

A **demonstration data** banner is shown in the workplace while the
`demo_content` setting is `1`. Turn it off in **Settings → Platform** before going live.

---

## The public website

Every page is server-rendered, statically generated where possible and revalidated every
30 seconds, so administrator edits appear within seconds.

| Route | Content |
| --- | --- |
| `/` | Hero, who we are, six divisions, featured services, why us, five-step process, statistics, opportunities, open vacancies, projects, testimonials, leadership, education, call to action |
| `/about` | Who we are, our story, mission, vision, values and the leadership team |
| `/what-we-do` | One section per division with services and imagery |
| `/services`, `/services/[slug]` | Service catalogue and full service pages with benefits, process, deliverables and indicative pricing |
| `/projects`, `/projects/[slug]` | Portfolio and case studies |
| `/opportunities`, `/opportunities/[slug]` | Partnerships, projects and investment information, with safeguards |
| `/careers`, `/careers/[slug]`, `/careers/[slug]/apply` | Open vacancies and the online application form |
| `/education` | Skills programmes with outcomes, level, duration and mode |
| `/contact` | Contact details and enquiry form |
| `/request-a-service` | Service request form with optional attachment |
| `/legal/*` | Privacy Policy, Terms & Conditions, Cookie Policy, Application Privacy Notice, Website Disclaimer |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/invite/[token]` | Accounts |

Also served: `/sitemap.xml`, `/robots.txt`, a JSON‑LD `Organization` block on the contact
page, `JobPosting` structured data on vacancies and `Service` structured data on service pages.

**Nothing about the company is hard-coded in the templates.** Contact details, disclaimers,
registration notes, social links and page copy all come from the database
(`settings` table and `content_blocks` table) and are edited in **Workplace → Website**.

### Investment opportunities — how regulated content is handled

The platform never assumes an opportunity is a regulated investment product:

* the **Investment product (regulated)** category is a separate choice, never inferred;
* every opportunity page carries the site-wide investment disclaimer, and regulated items are
  badged and can carry their own notice;
* the disclaimer text tells visitors to verify companies with **PACRA** and licensed market
  participants with the **Securities and Exchange Commission of Zambia**;
* regulated content is only published after legal and licensing review — the CMS guides the
  administrator to that decision rather than making it for them.

---

## Seedwel Workplace

Everything lives under `/dashboard`. The sidebar is built from the permissions stored in the
database, so a person only sees what they are allowed to use.

### Work
* **My Day** — today's tasks, overdue work, work in progress, upcoming deadlines, priority
  tasks, completed work and announcements.
* **Tasks** — create, assign, filter and track every task. Each task carries a description,
  instructions, a checklist, attachments, comments, submissions and a full status history.
* **Team Today** — per-person workload (open, in progress, submitted, late), submitted work
  waiting for review, late work and unassigned tasks.
* **Projects** — delivery projects with progress, milestones, team, files, linked tasks and a
  conversation that supports internal-only notes clients never see.

### Task workflow

```
Pending → I'm On It → In Progress → Submitted → Approved
                          ↑              │
                          └── Changes Required ← Resubmitted
      any state → Blocked (with a reason) → back to In Progress
```

Staff work on their own assignments; reviewers approve or request changes. Every transition is
written to the task history and the audit log, and notifies the other side.

### People
* **People** — directory with role, department, manager, job title, employment type, location,
  status, workload and account actions (reset password, resend invitation, disable, delete).
* **Roles & permissions** — tick-box permission matrix for every role, with "restore defaults".
* **Departments** — create departments and appoint a head.

### Recruitment
* **Recruitment** — pipeline with 11 stages (`new → under_review → shortlisted → interview →
  approved → invitation_sent → registration → onboarding → accepted / rejected / archived`),
  filters by vacancy and stage, CV access and a stage history per candidate.
* **Job openings** — add, edit, publish, unpublish, close, reopen, archive and delete vacancies.
  **Nothing is hard-coded**: the careers page updates automatically, and only `published`
  vacancies accept applications.
* **Application detail** — full application, CV download, ratings, internal notes, interview
  scheduling, stage changes and a "send invitation" action that creates the account and emails a
  secure registration link.

### Delivery
* **Clients** — client book with owner, status, linked projects and requests.
* **Service requests** — 8 statuses from `new` to `completed`, assignment, an audit trail and
  one-click conversion into a project.

### Communicate
* **Messages** — internal conversations with unread counts.
* **Announcements** — publish to staff, clients, applicants or everyone; each publish notifies
  the audience.
* **Documents** — access-controlled file store with categories, visibility, role sharing and a
  sensitive flag.
* **Notifications** — in-app feed for assignments, submissions, approvals, changes requested,
  applications, announcements and messages.

### Website
* **Website content** — every editable block on every public page, including repeatable items
  (divisions, values, process steps, statistics) edited as structured JSON.
* **Services, Leadership, Testimonials & FAQs, Education, Opportunities, Media library.**
* **Settings** — company identity, profile, legal notices, social links and platform switches,
  plus the email outbox and your own password.

### System
* **Reports** — live KPIs: people, on-time completion, late work, workload by department, most
  completed work, delivery and recruitment conversion.
* **Audit log** — who did what, to which record, from which IP, with before/after values.

---

## Roles & permissions

Twelve roles ship with the platform: **Super Admin, Administrator, Director, Manager, HR,
Virtual Assistant, Business Development, Marketing, Cold Caller, General Staff, Client,
Applicant**.

* Permissions are stored in the database (`role_permissions`) and configurable in
  **Roles & permissions** without a code change.
* A **Virtual Assistant** can create and assign tasks, monitor the team, manage service requests
  and documents — but never sees user administration, role configuration or system settings.
* Only a Super Admin can create, modify or delete another Super Admin.
* The browser never decides what you may do: every page and every server action re-checks
  permissions against the database.

---

## Security

| Concern | Implementation |
| --- | --- |
| Passwords | `scrypt` hashing with a random salt, constant-time comparison, a weak-password blocklist and a strength meter |
| Sessions | Random 32-byte session tokens stored hashed; the cookie holds the token only (`httpOnly`, `sameSite=lax`, `secure` in production) |
| Login protection | Per-IP and per-account throttling with a lockout window; login attempts are logged |
| Authorisation | Server-side guards (`requireUser`, `requirePermission`, `assertPermission`) in every page and action; unauthorised access redirects or returns 403 — never just a hidden button |
| Object access | Task, project, conversation and document access is checked per record; changing an ID in the URL does not grant access |
| File downloads | Private files live outside `public/` and are streamed by `/api/documents/[id]` and `/api/files/[name]` after an ownership / role / membership check; path traversal is rejected |
| Uploads | MIME allow-list, size limits (8 MB images, 15 MB documents), randomised file names, images re-encoded with sharp |
| Password reset | Single-use, time-limited tokens (2 hours), stored hashed, which revoke existing sessions |
| Email verification & invitations | Single-use hashed tokens with expiry; invitations create the account and let the person choose their own password |
| Input validation | Zod schemas on every action, with field-level errors returned to the form |
| Auditability | Every significant action is written to `audit_logs` with actor, entity, field, previous and new value |
| Transport | Security headers, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` on private downloads |

---

## Content management

An administrator can change, with no developer:

* home page, About, What We Do, Services, Careers, Opportunities, Education, Projects and footer copy;
* images (uploaded, resized and compressed automatically);
* services — create, edit, publish, unpublish, feature, reorder, delete;
* vacancies — the full recruitment lifecycle;
* opportunities, education programmes, leadership profiles, testimonials, FAQs and announcements;
* company identity, contact details, legal notices and social links;
* role permissions, departments and people.

Public pages revalidate within 30 seconds; content edits also call `revalidatePath` for an
immediate refresh.

---

## Architecture

```
src/
  app/
    (site)/            Public website (shared header/footer layout)
    (workplace)/       Seedwel Workplace: /dashboard/* (shared shell, permission-filtered nav)
    actions/           Server actions: public forms, auth, recruitment, workplace, admin
    api/               Route handlers: logout, settings, authorised downloads
    layout.tsx         Root layout, SEO defaults, self-hosted variable font
  components/
    ui/                Design system: buttons, badges, fields, sections, reveal, icons
    site/              Header, footer, cards for the public site
    auth/              Auth shell and forms
    dashboard/         Workplace shell, tables, and every editor form
    forms/             Public forms (contact, service request, application, talent pool)
  lib/
    db/                SQLite connection, schema, idempotent seeder
    auth/              Sessions, password hashing, guards
    data/site.ts       Cached read layer for the public site (CMS)
    rbac.ts            Roles, permissions, status vocabularies
    nav.ts             Navigation definitions and permission filtering
    uploads.ts         Validated uploads and access-controlled reads
    mailer.ts          Outbox / console mail drivers
    audit.ts, notifications.ts, rate-limit.ts, settings.ts, utils.ts
```

**Stack:** Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript,
Tailwind CSS 3, SQLite via `better-sqlite3`, Zod, sharp, lucide-react. No UI framework, no
client-side data fetching library — the server does the work and ships HTML.

---

## Performance & accessibility

* Every page is server-rendered; the shared JS bundle is about 103 kB and most pages add 0.2–4 kB.
* Static generation with 30-second revalidation for public pages; Workplace pages render on demand.
* Self-hosted variable font (no blocking request to Google Fonts) with `display: swap`.
* All shipped imagery is resized and re-encoded; below-the-fold images load lazily with explicit
  `width`/`height` to prevent layout shift, and `next/image` serves them through the optimiser.
* Responsive from 320 px upward: single-column layouts, scrollable tables wrapped in
  `overflow-x-auto` containers, and no layout that relies on horizontal page scrolling.
* Semantic landmarks, skip-to-content link, labelled form controls with inline errors, visible
  focus states, ARIA on menus and notifications, and `prefers-reduced-motion` support.

Regenerate the optimised image set at any time:

```bash
npx tsx scripts/optimize-images.ts
```

---

## Deployment

```bash
npm ci
cp .env.example .env   # set AUTH_SECRET (openssl rand -hex 48) and real company details
npm run build
npm start
```

Notes for production:

1. **Set `AUTH_SECRET`** and a strong administrator password before the first seed.
2. **SQLite needs a writable disk.** The app detects read-only project directories (Vercel,
   AWS Lambda, Netlify) at start-up and relocates the database to `/tmp/seedwel` so it boots
   instead of failing with `EROFS`. That keeps a serverless deployment *running*, but `/tmp` is
   ephemeral, so anything written there disappears when the instance is recycled. Use a host
   with persistent storage — a VPS, Docker host, Fly.io/Railway volume or Render disk — for a
   real installation. For genuinely stateless/serverless hosting, move to Postgres or Turso:
   the data access is concentrated in `src/lib/db`, and the in-process rate limiter in
   `src/lib/rate-limit.ts` should be swapped for Redis (call sites stay the same).
   Uploads written to `public/uploads` are static assets and are **read-only on serverless
   platforms**; the admin media uploader reports a clear error there instead of crashing.
3. **Back up** `data/seedwel.db` and the private upload directory — that is your content.
4. **Email**: the default `outbox` driver stores messages in the database and shows them in
   Settings → Email outbox. Point `MAIL_DRIVER` at a real provider for delivery.
5. **Legal text**: the policies and disclaimers are a solid starting point. Have a Zambian
   legal practitioner review them, and review regulated investment content with the SEC before
   publishing.
6. **Replace the demonstration data** in each section (or run `npm run db:reset` and re-enter
   real content), then switch off the demonstration banner.
