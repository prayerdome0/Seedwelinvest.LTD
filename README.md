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
| `/` | Home — hero, What We Do (4 areas), the website + graphics package, How We Build It (5 steps), education, live portfolio, story teaser |
| `/about` | Our Story and What We're Building (today / growing / education initiative) |
| `/services` | Digital & business services with the package concept |
| `/education` | Seedwel Education Initiative — Early Learning (ages 3–5, free) and Tuition (Mathematics, Computer Studies) |
| `/projects` | Live public portfolio (managed from the admin dashboard) |
| `/apply` | Careers — **Virtual Assistant** and **Cold Caller** only, with responsibilities, compensation summary and the honest application→dashboard process |
| `/contact` | Contact form (saved to Firebase) |
| `/request` | **Request a Service** form — creates a service request in the admin workflow |
| `/support` | Help centre and FAQ |
| `/privacy` / `/cookie-policy` / `/terms` | Legal |
| `/login` | Member login page for approved/registered accounts |
| `/register` | One-time invitation registration page with applicant details pre-filled |
| `/dashboard` | Private member dashboard (member ID, **My Documents**, tasks, notifications, profile, security) |
| `/admin/dashboard` | Modular admin: overview metrics and activity |
| `/admin/applications` (+ `application.html`) | Recruitment inbox and application detail |
| `/admin/members` (+ `member.html`) | Approved members and registration state |
| `/admin/documents` | **Worker document library** — upload → select role → publish |
| `/admin` | Legacy all-in-one operations workspace (requests, jobs, tasks, portfolio/media, messages, verification, reports, audit, settings) |
| `/verify` | Public Seedwel worker verification page (opened by scanning a worker's QR code) |
| `404.html` | Friendly not-found page with the main navigation and helpful links |
| `offline.html` | Self-contained offline fallback served by the service worker |

## Design system

- `assets/css/site.css` is the shared design system for all public pages: consistent header/footer, one button style, clean cards, subtle shadows and gentle scroll reveals.
- `assets/js/site.js` provides the shared behaviour: mobile navigation, reveal-on-scroll (once per element, reduced-motion aware), the professional footer on every page, the floating WhatsApp button and the privacy/cookie consent banner.
- **Animations: many small, controlled ones.** Staggered hero entrance, scroll reveals with delays, card lift on hover, image zoom on hover, animated FAQ accordions, nav underline transitions and step cards that respond to hover. All are disabled under `prefers-reduced-motion`. Deliberately avoided: spinning logos, floating objects, neon glows, particle backgrounds and text flying across the screen.
- `assets/images/` contains purpose-made imagery per section (see `MEDIA_LIBRARY.md` for the plan to grow this into a 100–200 asset Cloudinary library while loading only ~30–50 optimized images on the site).

## Spam protection on public forms

The three public forms (`/contact`, `/request`, `/apply`) are protected by
`assets/js/form-guard.js` — no third-party CAPTCHA, no tracking, nothing sent
to any extra service. Four layers run before anything reaches Firebase:

1. **Honeypot** — an off-screen `website_url` field, removed from the tab order and hidden from assistive technology. Real people never fill it; a filled value is rejected with a deliberately generic message so bots learn nothing. The field is never written to the database.
2. **Timing** — submissions faster than a human could plausibly fill the form (4s, or 8s on the application form) are refused.
3. **Rate limiting** — a per-browser budget in `localStorage` over a one-hour rolling window (5 submissions; 3 for applications). When exhausted, the visitor is pointed to WhatsApp instead of being left stuck.
4. **Content heuristics** — link flooding (more than 3 links), long runs of a repeated character, and all-caps shouting are rejected with a helpful message.

Each form has its own independent budget, so hitting the limit on one never
blocks another. `tests/form-guard.test.js` covers all four layers.

## Performance & progressive enhancement

- **Responsive images.** Every photo is served as WebP at 1280px and 768px through a `<picture>` element, with the original JPEG as the universal fallback and correct intrinsic `width`/`height` to eliminate layout shift. This cut the image payload from ~4 MB of JPEG to ~1.6 MB (desktop) / ~772 KB (mobile). Regenerate the derivatives with `npm run build:images`; re-wrap any newly added `<img>` tags with `node tools/optimize-images.js`.
- **Service worker** (`sw.js`) — network-first for pages, cache-first for static assets, and a friendly `/offline.html` when the connection drops. It deliberately **never** caches the private portal (`/admin`, `/dashboard`, `/login`, `/register`, `/verify`, `/member`, `/api`), non-GET requests, or Firebase/Cloudinary traffic, so no personal or authenticated data is written to disk.
- **Installable PWA** — real 192/512 PNG icons plus maskable variants generated from the Seedwel logo, an Apple touch icon, and app shortcuts to Request a Service, Contact and Careers.
- **Accessibility** — a "Skip to main content" link on every public page, and `<main id="main">` as its target.

## Security headers

`vercel.json` sets a **Content-Security-Policy** whose allowlist is derived
from what the site actually loads (Firebase from `gstatic.com`, Font Awesome
from `cdnjs`, Google Fonts, the logo from `i.ibb.co`, Cloudinary media and the
Realtime Database over `https`/`wss`). It also sets **HSTS**
(`max-age=63072000; includeSubDomains; preload`), `Cross-Origin-Opener-Policy`,
and an extended `Permissions-Policy`.

`'unsafe-inline'` remains in `script-src` because several pages carry inline
initialisation scripts; removing it would require moving every inline block to
an external file or adding per-request nonces.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

- the full test suite on Node 20 and 22
- JSON validation of `vercel.json`, `site.webmanifest`, `package.json`, `firebase.json` and `database.rules.json`
- XML validation of `sitemap.xml`
- `tools/check-structured-data.js` — every JSON-LD block parses and declares `@context`/`@type`
- `tools/check-links.js` — every internal href/src/srcset resolves to a real file, honouring the `vercel.json` rewrites

Run the validators locally with `npm run validate` (they are also part of `npm test`).

## Privacy & cookie consent

- A bottom consent banner appears on a visitor's first visit with a genuine choice: **Accept All**, **Manage Preferences** (per-category toggles) or **Reject Non-Essential**. Rejecting keeps the site fully functional.
- The choice is stored locally (`seedwel.consent.v1`), can be changed at any time via **Cookie settings** in the footer, and is exposed to scripts as `window.SeedwelConsent`.
- `/privacy` explains in plain language what is collected (service requests, contact forms, job applications and CVs), why, which third parties are involved (Firebase, Cloudinary, Vercel), retention and user rights. `/cookie-policy` lists the exact storage items used.

## Service requests (public → admin workflow)

- Visitors submit the **Request a Service** form (`/request`, pre-selectable via `?service=website-package`, `?service=web-development`, etc.). Requests are pushed to `serviceRequests` in the Firebase Realtime Database; Database Rules allow public *creation only* (with status `new`) and administrator-only reads/updates.
- The legacy admin workspace (`/admin` → **Requests**) manages each request through the pipeline **New → Reviewing → Assigned → In Progress → Completed** (plus Cancelled), with assignee names, optional notes, search, status filters, email reply and an audit-log entry for every status change.

## Hiring portal (two roles, one honest process)

- **One login entry point** (`/login`): the account role is stored in Firebase (server-side rules), never chosen in the browser. After sign-in, admins are routed to the admin dashboard, approved workers to their dashboard, and applicants to their status screen.
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

- Applicants submit public applications via `/apply` (with private CV upload to Cloudinary). After admin approval, the system creates a one-time registration invitation; the applicant then creates their own password and activates their member account.
- `/dashboard` is protected by Firebase Authentication. Pending accounts see an "Application under review" screen; only **active** workers see the dashboard (role, commission rate, stats, My Documents, and assigned tasks). Workers can move tasks **Pending → In Progress → Completed** and leave progress notes, and submit daily reports.
- The legacy admin workspace has a **Workers** panel: approve, reject, suspend, or activate workers, plus an **Assign a task** form that writes to `/tasks/{workerUid}/{taskId}`.

## Media

See **`MEDIA_LIBRARY.md`** for the Cloudinary folder strategy, the 100–200 asset library plan by category, and the rules that keep imagery human (real Seedwel photos first, no identifiable children without permission, no fake official/government branding, optimized delivery).

## Tests

```bash
npm install
npm test
```

Covers HTML/JS syntax, the CV Cloudinary signature/download API, the worker-document API (role visibility, admin-only uploads, managed folders), the service-request form, the public-form spam guard (honeypot, timing, rate limiting, content heuristics) and the shared site script (footer, consent banner, reveals). `npm test` also runs the structured-data and internal-link validators.

## Development notes

- Static site + Vercel serverless functions in `api/`. No build step.
- `vercel.json` holds the rewrites (`/admin/*`, `/member/dashboard`, `/register`), the CSP/HSTS security headers and long-lived caching for `assets/images` and `assets/icons`.
- `tools/` holds maintenance scripts: `build-images.sh` (WebP derivatives), `optimize-images.js` (wrap `<img>` in responsive `<picture>`), `check-structured-data.js` and `check-links.js`.
- `database.rules.json` and `storage.rules` must be deployed with the Firebase CLI after changes (see `FIREBASE_SETUP.md`).
