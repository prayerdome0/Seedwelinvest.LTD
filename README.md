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
| `login.html` | Private team login (workers sign in / apply) |
| `dashboard.html` | Private worker dashboard (active team members only) |
| `admin.html` | Secure admin (portfolio, messages, applications) |

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
