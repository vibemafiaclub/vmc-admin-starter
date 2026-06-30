CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  status TEXT NOT NULL DEFAULT 'received',
  received_at TEXT,
  estimated_value INTEGER NOT NULL DEFAULT 0,
  assignee TEXT NOT NULL DEFAULT 'choesumin',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT,
  revenue INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '기타',
  date TEXT NOT NULL,
  time TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  inquiry_id TEXT REFERENCES inquiries(id),
  project_id TEXT REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  inquiry_id TEXT REFERENCES inquiries(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('masking_enabled', 'true');

CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  direction TEXT NOT NULL DEFAULT 'inbound',
  subject TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  body TEXT,
  received_at TEXT NOT NULL,
  is_replied INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal',
  inquiry_id TEXT REFERENCES inquiries(id),
  draft_status TEXT
);

CREATE TABLE IF NOT EXISTS email_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id INTEGER NOT NULL REFERENCES emails(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  is_draft INTEGER NOT NULL DEFAULT 0
);
