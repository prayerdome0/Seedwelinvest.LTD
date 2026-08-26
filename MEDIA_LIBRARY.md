# Seedwel media library plan (Cloudinary)

This is the practical plan for building a **100–200 asset** media library in the
**existing Cloudinary account**, while keeping the website itself fast: only
**30–50 carefully chosen, optimized images** are actually loaded on the public
pages. The rest stay in the library for future pages, blog posts, service
detail pages, education content, recruitment and campaigns.

## Folder structure

```text
seedwel/
├── website/
│   ├── hero/          # homepage + section heroes
│   ├── services/      # one strong image per service
│   ├── projects/      # portfolio project shots
│   ├── team/          # real Seedwel team photos (preferred!)
│   └── education/     # early learning, tuition, classroom
│
├── recruitment/
│   ├── cvs/           # applicant CVs (private, authenticated delivery)
│   └── attachments/   # applicant certificates/attachments (private)
│
├── members/
│   ├── profiles/      # worker ID profile photos (private-ish, signed URL)
│   └── documents/     # role-based worker documents (private, authenticated)
│
└── company/
    ├── documents/     # company handbook masters, brand files
    └── media/         # logos, brand assets, campaign material
```

Notes on how this maps to the current implementation:

- Legacy assets already live under `portfolio/` (projects, CVs, profile
  pictures). Those keep working; new worker documents upload under
  `seedwel/worker-documents/<role>/…` with **authenticated** delivery so they
  are never exposed on guessable URLs.
- CVs and private worker documents are always delivered through the backend
  (`/api/cloudinary-download`, `/api/cloudinary-document`), which issues
  short-lived signed links only after checking who is asking.
- Public website imagery can live under `seedwel/website/…` with normal
  delivery, plus Cloudinary transformations (`f_auto,q_auto,w_…`) for
  optimisation.

## Target library (140+ assets, no random duplication)

| Category | Target | Examples |
|---|---|---|
| Business | 20 | Entrepreneurs, business meetings, small businesses, office work, customer consultation |
| Websites / Technology | 20 | Website development, mobile screens, laptop work, web design, software interfaces |
| Graphics / Branding | 20 | Logos, business cards, flyers, social media graphics, branding mockups |
| Virtual Assistance | 15 | Remote work, administrative work, email, scheduling, customer support |
| Cold Calling / Sales | 15 | Sales calls, headsets, CRM/lead management, customer communication, sales teams |
| Education | 30 | Early learning, classroom, mathematics, computers, books, teacher/student activities |
| Seedwel / company | 20+ | Team, work environment, projects, events, business activities |

## Rules that keep it feeling human, not AI-generated

1. **Real Seedwel photographs first.** For the team, office, projects and
   events, real photos do more to remove the "AI website" feeling than any
   design trick. Upload them under `seedwel/website/team/` and `company/`.
2. **No identifiable children.** For education imagery use illustrations,
   hands-only or from-behind compositions, or properly licensed photos where
   parental/guardian permission is documented. Never use a child's identifiable
   photograph without permission.
3. **Specific scenes, not generic batches.** Source/create *scenes* — "a
   designer choosing social-media post printouts", "a tutor pointing at a
   worked equation" — with varied composition, environment, people and
   lighting. Avoid generating 50 near-identical "professional business"
   images.
4. **No government or official branding.** Do not use government emblems,
   official-looking seals, or imagery implying partnerships that don't exist.
5. **Optimize on delivery.** Use `f_auto,q_auto` and explicit widths. A page
   should load a handful of purposeful images, not a photo gallery.

## What the website loads today (the strategic 30–50)

Currently the public pages use a small, deliberate set (see `assets/images/`):
the homepage hero, four "What We Do" visuals, the package mockup, the education
imagery, the story/team photo and the per-service images. As the library grows,
swap these for Cloudinary-delivered versions (or new real photographs) and add
imagery to service detail pages, the education page galleries and portfolio
entries — page by page, never all at once.

## When adding images to the library

- Prefer uploading via the admin portfolio tools or the documented API kinds;
  avoid unsigned upload presets.
- Name files descriptively (`seedwel/website/education/math-tuition-01.jpg`).
- For private material (CVs, documents), never switch delivery to `upload`
  (public). Keep `authenticated` delivery and the backend access checks.
