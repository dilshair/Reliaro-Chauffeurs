const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'reliaro.db');
const db = new Database(DB_PATH);

/* Enable WAL for better concurrency */
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ════════════════════════════════════════
   SCHEMA
════════════════════════════════════════ */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name   TEXT NOT NULL,
    last_name    TEXT NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    phone        TEXT,
    password_hash TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    reference              TEXT UNIQUE NOT NULL,
    user_id                INTEGER REFERENCES users(id),
    -- Guest details (if not logged in)
    guest_first_name       TEXT,
    guest_last_name        TEXT,
    guest_email            TEXT,
    guest_phone            TEXT,
    -- Journey
    service                TEXT NOT NULL,
    vehicle_class          TEXT NOT NULL,
    pickup                 TEXT NOT NULL,
    dropoff                TEXT NOT NULL,
    date                   TEXT,
    time                   TEXT,
    passengers             INTEGER DEFAULT 1,
    luggage                TEXT,
    distance_km            REAL,
    duration_mins          INTEGER,
    notes                  TEXT,
    -- Pricing
    base_price             REAL NOT NULL,
    toll_cost              REAL DEFAULT 0,
    surcharge_amt          REAL DEFAULT 0,
    gst                    REAL NOT NULL,
    total_price            REAL NOT NULL,
    -- Payment
    payment_status         TEXT DEFAULT 'pending',
    payment_method         TEXT,
    stripe_payment_intent  TEXT,
    -- Status
    status                 TEXT DEFAULT 'pending',
    admin_notes            TEXT,
    created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/* ── Auto-create admin from env ── */
function seedAdmin() {
  const email = process.env.ADMIN_EMAIL_LOGIN;
  const pass  = process.env.ADMIN_PASSWORD;
  const name  = process.env.ADMIN_NAME || 'Admin';
  if (!email || !pass) return;
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
  if (!existing) {
    const hash = bcrypt.hashSync(pass, 10);
    db.prepare('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);
    console.log(`✅  Admin created: ${email}`);
  }
}
seedAdmin();

/* ── Booking reference generator ── */
function generateRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'RL-';
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

module.exports = { db, generateRef };
