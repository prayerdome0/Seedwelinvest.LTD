/**
 * Full relational schema for the Seedwel platform.
 * Written as a plain string so it is bundled with the server code and never
 * depends on runtime file-system lookups.
 */
export const SCHEMA_SQL = /* sql */ `
PRAGMA foreign_keys = ON;

/* ------------------------------------------------------------------ settings */
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ------------------------------------------------------- roles & permissions */
CREATE TABLE IF NOT EXISTS roles (
  key          TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  level        INTEGER NOT NULL DEFAULT 50,
  is_system    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_key   TEXT NOT NULL REFERENCES roles(key) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_key, permission)
);

/* ------------------------------------------------------------- departments */
CREATE TABLE IF NOT EXISTS departments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  head_user_id INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

/* -------------------------------------------------------------------- users */
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  email_verified_at TEXT,
  password_hash   TEXT,
  first_name      TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  avatar_path     TEXT,
  role_key        TEXT NOT NULL DEFAULT 'applicant' REFERENCES roles(key),
  department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  manager_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  job_title       TEXT NOT NULL DEFAULT '',
  employee_number TEXT,
  employment_type TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active',   /* active | invited | disabled */
  country         TEXT NOT NULL DEFAULT 'Zambia',
  location        TEXT NOT NULL DEFAULT '',
  bio             TEXT NOT NULL DEFAULT '',
  skills          TEXT NOT NULL DEFAULT '',
  date_of_birth   TEXT,
  gender          TEXT NOT NULL DEFAULT '',
  national_id     TEXT NOT NULL DEFAULT '',
  emergency_name  TEXT NOT NULL DEFAULT '',
  emergency_phone TEXT NOT NULL DEFAULT '',
  bank_name       TEXT NOT NULL DEFAULT '',
  bank_account    TEXT NOT NULL DEFAULT '',
  joined_at       TEXT,
  last_login_at   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_key);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

/* Additional roles granted on top of the user's primary role. */
CREATE TABLE IF NOT EXISTS user_roles (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL REFERENCES roles(key) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_key)
);

/* ----------------------------------------------------------------- sessions */
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  ip          TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

/* Single-use tokens: email verification, password reset, staff invitation. */
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,               /* verify_email | reset_password | invitation */
  token_hash TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL DEFAULT '',
  meta       TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tokens_type ON auth_tokens(type);

/* Brute-force protection. */
CREATE TABLE IF NOT EXISTS auth_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL DEFAULT '',
  ip         TEXT NOT NULL DEFAULT '',
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_identifier ON auth_attempts(identifier, created_at);

/* ------------------------------------------------------------ notifications */
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'system',
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  href       TEXT NOT NULL DEFAULT '',
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

/* --------------------------------------------------------------- audit logs */
CREATE TABLE IF NOT EXISTS audit_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name    TEXT NOT NULL DEFAULT 'System',
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL DEFAULT '',
  entity_id     TEXT,
  entity_label  TEXT NOT NULL DEFAULT '',
  field         TEXT NOT NULL DEFAULT '',
  previous_value TEXT NOT NULL DEFAULT '',
  new_value     TEXT NOT NULL DEFAULT '',
  ip            TEXT NOT NULL DEFAULT '',
  user_agent    TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at);

/* ------------------------------------------------------- website content/CMS */
CREATE TABLE IF NOT EXISTS content_blocks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT NOT NULL UNIQUE,
  page       TEXT NOT NULL DEFAULT 'general',
  title      TEXT NOT NULL DEFAULT '',
  subtitle   TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL DEFAULT '',
  extra      TEXT NOT NULL DEFAULT '{}',
  image_path TEXT,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS testimonials (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT '',
  company      TEXT NOT NULL DEFAULT '',
  quote        TEXT NOT NULL DEFAULT '',
  avatar_path  TEXT,
  rating       INTEGER NOT NULL DEFAULT 5,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faqs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT 'General',
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leadership (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  title           TEXT NOT NULL DEFAULT '',
  short_bio       TEXT NOT NULL DEFAULT '',
  bio             TEXT NOT NULL DEFAULT '',
  message         TEXT NOT NULL DEFAULT '',
  responsibilities TEXT NOT NULL DEFAULT '',
  focus           TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  linkedin        TEXT NOT NULL DEFAULT '',
  image_path      TEXT,
  is_published    INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  audience     TEXT NOT NULL DEFAULT 'all',   /* all | staff | clients | applicants */
  priority     TEXT NOT NULL DEFAULT 'normal',/* normal | important | urgent */
  is_published INTEGER NOT NULL DEFAULT 1,
  author_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ----------------------------------------------------------------- services */
CREATE TABLE IF NOT EXISTS services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  division     TEXT NOT NULL DEFAULT 'digital',
  icon         TEXT NOT NULL DEFAULT 'Sparkles',
  summary      TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  benefits     TEXT NOT NULL DEFAULT '',   /* newline separated */
  process      TEXT NOT NULL DEFAULT '',   /* newline separated */
  deliverables TEXT NOT NULL DEFAULT '',
  image_path   TEXT,
  starting_price TEXT NOT NULL DEFAULT '',
  is_featured  INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

/* --------------------------------------------------------------------- jobs */
CREATE TABLE IF NOT EXISTS jobs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  department      TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  location        TEXT NOT NULL DEFAULT 'Lusaka, Zambia',
  remote_status   TEXT NOT NULL DEFAULT 'On-site',     /* On-site | Hybrid | Remote */
  salary_min      REAL,
  salary_max      REAL,
  salary_currency TEXT NOT NULL DEFAULT 'ZMW',
  salary_visible  INTEGER NOT NULL DEFAULT 1,
  positions       INTEGER NOT NULL DEFAULT 1,
  summary         TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  responsibilities TEXT NOT NULL DEFAULT '',
  requirements    TEXT NOT NULL DEFAULT '',
  skills          TEXT NOT NULL DEFAULT '',
  deadline        TEXT,
  status          TEXT NOT NULL DEFAULT 'published', /* draft | published | closed | archived */
  is_featured     INTEGER NOT NULL DEFAULT 0,
  applicant_count INTEGER NOT NULL DEFAULT 0,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

/* -------------------------------------------------------------- applications */
CREATE TABLE IF NOT EXISTS applications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT NOT NULL UNIQUE,
  job_id          INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  first_name      TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  country         TEXT NOT NULL DEFAULT 'Zambia',
  location        TEXT NOT NULL DEFAULT '',
  education       TEXT NOT NULL DEFAULT '',
  experience      TEXT NOT NULL DEFAULT '',
  skills          TEXT NOT NULL DEFAULT '',
  cover_letter    TEXT NOT NULL DEFAULT '',
  portfolio_url   TEXT NOT NULL DEFAULT '',
  cv_path         TEXT,
  additional_info TEXT NOT NULL DEFAULT '',
  consent         INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'new',
  rating          INTEGER NOT NULL DEFAULT 0,
  notes           TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL DEFAULT 'website',
  assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);

CREATE TABLE IF NOT EXISTS application_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    TEXT NOT NULL DEFAULT '',
  to_status      TEXT NOT NULL DEFAULT '',
  note           TEXT NOT NULL DEFAULT '',
  actor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name     TEXT NOT NULL DEFAULT 'System',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_app_events_app ON application_events(application_id);

CREATE TABLE IF NOT EXISTS interviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at   TEXT NOT NULL,
  duration_mins  INTEGER NOT NULL DEFAULT 30,
  mode           TEXT NOT NULL DEFAULT 'Online',
  location       TEXT NOT NULL DEFAULT '',
  panel          TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  outcome        TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ------------------------------------------------------------------ clients */
CREATE TABLE IF NOT EXISTS clients (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  industry     TEXT NOT NULL DEFAULT '',
  country      TEXT NOT NULL DEFAULT 'Zambia',
  status       TEXT NOT NULL DEFAULT 'active',   /* active | inactive | prospect */
  notes        TEXT NOT NULL DEFAULT '',
  owner_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

/* --------------------------------------------------------- service requests */
CREATE TABLE IF NOT EXISTS service_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  reference     TEXT NOT NULL UNIQUE,
  service_id    INTEGER REFERENCES services(id) ON DELETE SET NULL,
  name          TEXT NOT NULL DEFAULT '',
  company       TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  budget        TEXT NOT NULL DEFAULT '',
  deadline      TEXT,
  description   TEXT NOT NULL DEFAULT '',
  attachment_path TEXT,
  status        TEXT NOT NULL DEFAULT 'new',  /* new|reviewing|assigned|in_progress|review|completed|rejected|cancelled */
  assigned_to   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_id     INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  project_id    INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

/* ----------------------------------------------------------------- projects */
CREATE TABLE IF NOT EXISTS projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  client_id    INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  client_label TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  summary      TEXT NOT NULL DEFAULT '',
  services     TEXT NOT NULL DEFAULT '',
  technologies TEXT NOT NULL DEFAULT '',
  results      TEXT NOT NULL DEFAULT '',
  outcomes     TEXT NOT NULL DEFAULT '',
  link         TEXT NOT NULL DEFAULT '',
  cover_image  TEXT,
  status       TEXT NOT NULL DEFAULT 'planning', /* planning|active|review|completed|on_hold|cancelled */
  progress     INTEGER NOT NULL DEFAULT 0,
  start_date   TEXT,
  deadline     TEXT,
  owner_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_published INTEGER NOT NULL DEFAULT 0,
  is_featured  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  due_date     TEXT,
  assigned_to  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);

CREATE TABLE IF NOT EXISTS project_files (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  path              TEXT NOT NULL,
  size              INTEGER NOT NULL DEFAULT 0,
  is_client_visible INTEGER NOT NULL DEFAULT 1,
  uploaded_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL DEFAULT '',
  is_internal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_project_messages_project ON project_messages(project_id);

/* -------------------------------------------------------------------- tasks */
CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reference    TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',
  priority     TEXT NOT NULL DEFAULT 'medium',   /* low | medium | high | urgent */
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  start_date   TEXT,
  due_date     TEXT,
  completed_at TEXT,
  approved_at  TEXT,
  approved_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  estimated_minutes INTEGER,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

CREATE TABLE IF NOT EXISTS task_checklist (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id  INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  is_done  INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  done_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  done_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_checklist_task ON task_checklist(task_id);

CREATE TABLE IF NOT EXISTS task_comments (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body    TEXT NOT NULL DEFAULT '',
  kind    TEXT NOT NULL DEFAULT 'comment',  /* comment | change_request | approval | system */
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

CREATE TABLE IF NOT EXISTS task_submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes         TEXT NOT NULL DEFAULT '',
  file_path     TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',  /* pending | approved | changes_required */
  review_notes  TEXT NOT NULL DEFAULT '',
  reviewed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_submissions_task ON task_submissions(task_id);

CREATE TABLE IF NOT EXISTS task_attachments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  path        TEXT NOT NULL,
  size        INTEGER NOT NULL DEFAULT 0,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ------------------------------------------------------------ opportunities */
CREATE TABLE IF NOT EXISTS opportunities (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'business_opportunity',
  summary       TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL DEFAULT 'Zambia',
  industry      TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'published', /* draft | published | unpublished | closed | archived */
  requirements  TEXT NOT NULL DEFAULT '',
  investment_range TEXT NOT NULL DEFAULT '',
  closing_date  TEXT,
  contact_name  TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  is_regulated  INTEGER NOT NULL DEFAULT 0,   /* 1 = may constitute a regulated activity */
  disclaimer    TEXT NOT NULL DEFAULT '',
  is_featured   INTEGER NOT NULL DEFAULT 0,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);

CREATE TABLE IF NOT EXISTS opportunity_interests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  organisation   TEXT NOT NULL DEFAULT '',
  message        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'new',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ------------------------------------------------------------ education */
CREATE TABLE IF NOT EXISTS courses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'Digital skills',
  summary      TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  outcomes     TEXT NOT NULL DEFAULT '',
  duration     TEXT NOT NULL DEFAULT '',
  level        TEXT NOT NULL DEFAULT 'Beginner',
  mode         TEXT NOT NULL DEFAULT 'Blended',
  image_path   TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

/* ---------------------------------------------------------------- documents */
CREATE TABLE IF NOT EXISTS documents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT 'company_document',
  stored_name    TEXT NOT NULL,
  mime           TEXT NOT NULL DEFAULT 'application/octet-stream',
  size           INTEGER NOT NULL DEFAULT 0,
  owner_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  uploader_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  related_type   TEXT NOT NULL DEFAULT '',
  related_id     INTEGER,
  visibility     TEXT NOT NULL DEFAULT 'private',  /* private | role | department | public */
  allowed_roles  TEXT NOT NULL DEFAULT '',
  is_sensitive   INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_related ON documents(related_type, related_id);

/* ---------------------------------------------------------------- messaging */
CREATE TABLE IF NOT EXISTS conversations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  subject         TEXT NOT NULL DEFAULT '',
  kind            TEXT NOT NULL DEFAULT 'direct',  /* direct | team | project */
  project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TEXT,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body            TEXT NOT NULL DEFAULT '',
  attachment_path TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

/* -------------------------------------------------------------------- media */
CREATE TABLE IF NOT EXISTS media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  path        TEXT NOT NULL,
  mime        TEXT NOT NULL DEFAULT '',
  size        INTEGER NOT NULL DEFAULT 0,
  width       INTEGER,
  height      INTEGER,
  alt         TEXT NOT NULL DEFAULT '',
  folder      TEXT NOT NULL DEFAULT 'general',
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

/* -------------------------------------------------------------- email outbox */
CREATE TABLE IF NOT EXISTS email_outbox (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  meta       TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
