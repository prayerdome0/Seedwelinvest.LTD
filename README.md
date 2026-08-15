# Seedwel Investment LTD

Static public website, a Firebase-backed portfolio administration workspace, and a private team portal.

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
- **Application workflow**: Account Created → Application Submitted → Under Review / Info Required → Approved or Rejected — with clear status screens for the applicant at every step.
- **Automatic Worker IDs** (`SWL-YYYY-000001`): issued transactionally on approval from a monotonic counter; unique, permanent, never reused, and impossible for applicants to set themselves (blocked by Database Rules).
- **QR verification**: each approved worker gets a secure random verification token. The QR opens `verify.html?t=…`, which checks the token live against `/verifications` and shows VERIFIED WORKER or VERIFICATION FAILED with limited, non-private data only.
- **Admin controls**: approve / reject / request info / mark under review / suspend / reactivate, worker search (name, email, Worker ID), a Jobs panel, worker notifications and an append-only audit log.
- **Important rule shown throughout**: creating an account does **not** guarantee employment or a job award.

## Team portal (Phase 2 + Phase 3)

- Workers create an account and a **pending** worker record at `/workers/{uid}` via `login.html` → "Join Seedwel team".
- `dashboard.html` is protected by Firebase Authentication. Pending accounts see an "Application under review" screen; only **active** workers see the dashboard (role, 10% commission rate, stats, and assigned tasks). Workers can move tasks **Pending → In Progress → Completed** and leave progress notes.
- `admin.html` has a **Team workers** panel: approve, reject, suspend, or activate workers (sets `/workers/{uid}/status`), plus an **Assign a task** form that writes to `/tasks/{workerUid}/{taskId}`.
- Task records live under `/tasks/{workerUid}/{taskId}`; a worker can read and update **only their own** tasks, while the administrator manages all workers and tasks.

## Portfolio administration

- Open `admin.html` to manage published portfolio projects, protected image uploads, public portfolio details, share links, **contact inbox** and **job applications**.
- Open `projects.html` for the live, shareable portfolio.
- See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) before using the admin in production. Deploy the included Database/Storage Rules so contact messages and applications can be stored securely.

## Deploy

- **Domain:** `seedwel.ltd` (see `CNAME`)
- **Vercel:** import the GitHub repo; framework **Other**, output `.` — `vercel.json` sets security headers.
- **SEO:** `robots.txt`, `sitemap.xml`, Open Graph tags and JSON-LD are included.

The repository deliberately contains no administrator password or private storage secret.
