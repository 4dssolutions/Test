const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'crm.sqlite'));
db.pragma('foreign_keys = ON');

function now() {
  return new Date().toISOString();
}

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      website TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT,
      source TEXT,
      preferred_contact_time TEXT,
      follow_up_at TEXT,
      gatekeeper_log TEXT,
      assigned_to TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT,
      deadline TEXT,
      project_type TEXT,
      notes TEXT,
      progress INTEGER DEFAULT 0,
      account_id INTEGER,
      payment_status TEXT,
      proof_of_payment TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      name TEXT NOT NULL,
      status TEXT,
      due_date TEXT,
      assigned_to TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      status TEXT,
      scheduled_at TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      channel TEXT,
      notes TEXT,
      account_id INTEGER,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      status TEXT,
      account_id INTEGER,
      project_id INTEGER,
      sent_at TEXT,
      signed_at TEXT,
      unsigned_notified INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      status TEXT,
      amount REAL,
      due_date TEXT,
      account_id INTEGER,
      stripe_invoice_id TEXT,
      subscription_id TEXT,
      overdue_notified INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT,
      stripe_subscription_id TEXT,
      current_period_end TEXT,
      account_id INTEGER,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
  `);
}

init();

module.exports = {
  db,
  now,
};
