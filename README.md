# Seedwel Investment LTD

Static public website and a Firebase-backed Seedwel Operations & Workforce Management System with private applicant, worker and administration experiences.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home |
| `about.html` | About the company |
| `services.html` | Services |
| `projects.html` | Live public portfolio |
| `apply.html` | Careers / job applications |
| `contact.html` | Contact form (saved to Firebase) |
| `support.html` | Help center |
| `privacy.html` / `terms.html` | Legal |
| `login.html` | Single login / create-account page with automatic server-checked role routing |
| `dashboard.html` | Private worker dashboard (Worker ID, QR verification, tasks, notifications, profile, security) |
| `admin.html` | Secure admin (portfolio, messages, applications, workers, jobs, audit log) |
| `verify.html` | Public Seedwel worker verification page (opened by scanning a worker's QR code) |

## Hiring portal

- **One login entry point** (`login.html`): the account role is stored in Firebase (server-side rules), never chosen in the browser. After sign-in, admins are routed to `admin.html`, approved workers to their dashboard, and applicants to their status screen.
- **Application workflow**: Registered → Application Started → Submitted → Reviewing → Shortlisted → Interview → Approved → Worker ID Generated → Active Worker → Job Assigned → Completed. Every admin status change is added to the audit trail with its actor and timestamp.
- **Automatic Worker IDs** (`SWL-YYYY-000001`): issued transactionally on approval from a monotonic counter; unique, permanent, never reused, and impossible for applicants to set themselves (blocked by Database Rules).
- **QR verification**: each approved worker gets a secure random verification token. The QR opens `verify.html?t=…`, which checks the token live against `/verifications` and shows VERIFIED WORKER or VERIFICATION FAILED with limited verification data.
- **Cloudinary Worker ID photos**: active workers can upload or replace their ID profile photo in the dashboard. It appears on the private ID card and the token-based public verification record.
- **Operations admin**: mobile-friendly sidebar navigation, global applicant/worker/Worker ID search, approval and suspension controls, detailed jobs, private documents, database-driven reports/CSV export, live operations charts, administrator-tracked worker daily reports, notifications, verification monitoring and an append-only audit log.
- **Important rule shown throughout**: creating an account does **not** guarantee employment or a job award.

## Team portal (Phase 2 + Phase 3)

- Workers create an account and a **pending** worker record at `/workers/{uid}` via `login.html` → "Join Seedwel team".
- `dashboard.html` is protected by Firebase Authentication. Pending accounts see an "Application under review" screen; only **active** workers see the dashboard (role, 10% commission rate, stats, and assigned tasks). Workers can move tasks **Pending → In Progress → Completed** and leave progress notes.
- `admin.html` has a **Team workers** panel: approve, reject, suspend, or activate workers (sets `/workers/{uid}/status`), plus an **Assign a task** form that writes to `/tasks/{workerUid}/{taskId}`.
- Task records live under `/tasks/{workerUid}/{taskId}`; a worker can read and update **only their own** tasks, while the administrator manages all workers and tasks.

## Original brand media

- Purpose-built, generated campaign photography lives in `assets/images/` and replaces generic stock imagery across the home and about experiences.
- Two lightweight H.264 films in `assets/videos/` present the company story and three-step delivery process. They are muted, inline, visibility-aware and include accessible play/pause controls.
- `assets/css/media-showcase.css` and `assets/js/media-showcase.js` provide responsive editorial layouts, scroll reveals, hover motion and reduced-motion support across the Home, About and Services pages.

## On-device public AI assistant

- Public pages include **Seedwel Local AI**, a real small language model running in the visitor's browser through WebGPU and [WebLLM](https://github.com/mlc-ai/web-llm). It does not use a paid or remote inference API, needs no API key, and never sends chat prompts to Seedwel.
- The assistant uses the quantized `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` model in a dedicated Web Worker. The first opt-in setup downloads roughly 300 MB of public model files; the browser caches them for later visits. Runtime generation needs a compatible, up-to-date browser and approximately 1 GB of available graphics memory.
- Its system context is limited to verified Seedwel services, careers, support and contact facts. It is explicitly instructed not to invent prices, vacancies, project names, application decisions or guarantees and hands account-specific questions to the Seedwel team.
- `assets/js/local-ai.js`, `assets/js/local-ai-worker.js` and `assets/css/local-ai.css` contain the integration. Update the curated facts in `systemPrompt()` when business information changes. The WebLLM CDN version is pinned so runtime updates are deliberate.
- Recent conversation is kept only in browser `sessionStorage`; no chat history is written to Firebase. Visitors must approve the one-time model download, and unsupported devices receive direct WhatsApp/email fallbacks.

## Uploads and portfolio administration

- **All new uploads use the existing connected Cloudinary product environment**: portfolio images, authenticated/private CVs and Worker ID profile photos are organised in its `portfolio` asset folder. Serverless functions create signed requests; no API secret or unsigned upload preset is exposed in browser code.
- Open `admin.html` to manage published portfolio projects with up to six photos each, protected image uploads, public portfolio details, share links, **contact inbox** and **job applications**.
- Careers submissions always reach the private admin inbox. If the CV provider is unavailable, the application is saved with a follow-up flag instead of being discarded.
- Open `projects.html` for the live, shareable portfolio.
- See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) before production use. Confirm the Vercel Cloudinary integration provides `CLOUDINARY_URL`, then deploy the included Firebase Database/Storage Rules.

## Deploy

- **Domain:** `seedwel.ltd` (see `CNAME`)
- **Vercel:** import the GitHub repo; framework **Other**, output `.` — `vercel.json` sets security headers.
- **SEO:** `robots.txt`, `sitemap.xml`, Open Graph tags and JSON-LD are included.

The repository deliberately contains no administrator password or private storage secret.
