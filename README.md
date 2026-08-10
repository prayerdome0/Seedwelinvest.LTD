# Seedwel Investment LTD

Static public website and a Firebase-backed portfolio administration workspace.

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
| `admin.html` | Secure admin (portfolio, messages, applications) |

## Portfolio administration

- Open `admin.html` to manage published portfolio projects, protected image uploads, public portfolio details, share links, **contact inbox** and **job applications**.
- Open `projects.html` for the live, shareable portfolio.
- See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) before using the admin in production. Deploy the included Database/Storage Rules so contact messages and applications can be stored securely.

## Deploy

- **Domain:** `seedwel.ltd` (see `CNAME`)
- **Vercel:** import the GitHub repo; framework **Other**, output `.` — `vercel.json` sets security headers.
- **SEO:** `robots.txt`, `sitemap.xml`, Open Graph tags and JSON-LD are included.

The repository deliberately contains no administrator password or private storage secret.
