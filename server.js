const express = require('express');
const path = require('path');
const { db, now } = require('./db');
const { sendBookingConfirmation, makeCall, sendSms } = require('./communications');
const { syncInvoice, syncSubscription } = require('./stripe');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const STATIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js',
  '/manifest.json': 'manifest.json',
  '/sw.js': 'sw.js',
  '/icon.svg': 'icon.svg',
};

const ENTITY_CONFIG = {
  accounts: {
    table: 'accounts',
    fields: ['name', 'phone', 'email', 'website'],
    required: ['name'],
    numberFields: [],
  },
  leads: {
    table: 'leads',
    fields: [
      'name',
      'status',
      'source',
      'preferred_contact_time',
      'follow_up_at',
      'gatekeeper_log',
      'assigned_to',
    ],
    required: ['name'],
    numberFields: [],
  },
  projects: {
    table: 'projects',
    fields: [
      'name',
      'status',
      'deadline',
      'project_type',
      'notes',
      'progress',
      'account_id',
      'payment_status',
      'proof_of_payment',
    ],
    required: ['name'],
    numberFields: ['progress', 'account_id'],
  },
  tasks: {
    table: 'tasks',
    fields: ['project_id', 'name', 'status', 'due_date', 'assigned_to'],
    required: ['name'],
    numberFields: ['project_id'],
  },
  bookings: {
    table: 'bookings',
    fields: [
      'name',
      'status',
      'scheduled_at',
      'contact_name',
      'contact_email',
      'contact_phone',
      'channel',
      'notes',
      'account_id',
    ],
    required: [],
    numberFields: ['account_id'],
  },
  contracts: {
    table: 'contracts',
    fields: ['name', 'status', 'account_id', 'project_id', 'sent_at', 'signed_at'],
    required: [],
    numberFields: ['account_id', 'project_id'],
  },
  invoices: {
    table: 'invoices',
    fields: [
      'name',
      'status',
      'amount',
      'due_date',
      'account_id',
      'stripe_invoice_id',
      'subscription_id',
    ],
    required: [],
    numberFields: ['amount', 'account_id'],
  },
  subscriptions: {
    table: 'subscriptions',
    fields: ['status', 'stripe_subscription_id', 'current_period_end', 'account_id'],
    required: [],
    numberFields: ['account_id'],
  },
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/stripe/invoice', (req, res) => {
  res.json(syncInvoice(req.body));
});

app.post('/api/stripe/subscription', (req, res) => {
  res.json(syncSubscription(req.body));
});

app.get('/api/:entity', (req, res) => {
  const config = ENTITY_CONFIG[req.params.entity];
  if (!config) {
    return res.status(404).json({ error: 'Unknown entity' });
  }

  const rows = db.prepare(`SELECT * FROM ${config.table} ORDER BY id DESC LIMIT 200`).all();
  res.json(rows);
});

app.get('/api/:entity/:id', (req, res) => {
  const config = ENTITY_CONFIG[req.params.entity];
  if (!config) {
    return res.status(404).json({ error: 'Unknown entity' });
  }

  const row = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.json(row);
});

app.post('/api/:entity', async (req, res) => {
  const config = ENTITY_CONFIG[req.params.entity];
  if (!config) {
    return res.status(404).json({ error: 'Unknown entity' });
  }

  const payload = sanitizePayload(config, req.body);
  const missing = config.required.filter((field) => !payload[field]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  const columns = Object.keys(payload);
  const values = columns.map((key) => payload[key]);
  const timestamp = now();

  columns.push('created_at', 'updated_at');
  values.push(timestamp, timestamp);

  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders})`);
  const info = stmt.run(values);
  const record = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(info.lastInsertRowid);

  if (req.params.entity === 'tasks' && record.project_id) {
    updateProjectProgress(record.project_id);
  }

  if (req.params.entity === 'bookings') {
    try {
      await sendBookingConfirmation(record);
    } catch (error) {
      console.warn('Booking confirmation failed:', error);
    }
  }

  res.status(201).json(record);
});

app.put('/api/:entity/:id', async (req, res) => {
  const config = ENTITY_CONFIG[req.params.entity];
  if (!config) {
    return res.status(404).json({ error: 'Unknown entity' });
  }

  const payload = sanitizePayload(config, req.body);
  const columns = Object.keys(payload);

  if (!columns.length) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const assignments = columns.map((column) => `${column} = ?`);
  const values = columns.map((column) => payload[column]);
  const timestamp = now();

  assignments.push('updated_at = ?');
  values.push(timestamp, req.params.id);

  const stmt = db.prepare(`UPDATE ${config.table} SET ${assignments.join(', ')} WHERE id = ?`);
  stmt.run(values);

  const record = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  if (req.params.entity === 'tasks' && record.project_id) {
    updateProjectProgress(record.project_id);
  }

  res.json(record);
});

app.delete('/api/:entity/:id', (req, res) => {
  const config = ENTITY_CONFIG[req.params.entity];
  if (!config) {
    return res.status(404).json({ error: 'Unknown entity' });
  }

  const stmt = db.prepare(`DELETE FROM ${config.table} WHERE id = ?`);
  const info = stmt.run(req.params.id);
  if (!info.changes) {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.status(204).end();
});

app.get(Object.keys(STATIC_FILES), (req, res) => {
  const asset = STATIC_FILES[req.path];
  res.sendFile(path.join(__dirname, asset));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Refined Digital CRM running on http://localhost:${PORT}`);
  scheduleOverdueChecks();
});

function sanitizePayload(config, body) {
  const payload = {};
  config.fields.forEach((field) => {
    if (body[field] !== undefined && body[field] !== '') {
      payload[field] = body[field];
    }
  });

  config.numberFields.forEach((field) => {
    if (payload[field] !== undefined) {
      const value = Number(payload[field]);
      payload[field] = Number.isFinite(value) ? value : null;
    }
  });

  return payload;
}

function updateProjectProgress(projectId) {
  const total = db.prepare('SELECT COUNT(*) as total FROM tasks WHERE project_id = ?').get(projectId).total;
  const completed = db
    .prepare('SELECT COUNT(*) as total FROM tasks WHERE project_id = ? AND status = ?')
    .get(projectId, 'Completed').total;
  const progress = total ? Math.floor((completed / total) * 100) : 0;

  db.prepare('UPDATE projects SET progress = ?, updated_at = ? WHERE id = ?').run(progress, now(), projectId);
}

function scheduleOverdueChecks() {
  const interval = 60 * 60 * 1000;
  void runOverdueChecks();
  setInterval(() => {
    void runOverdueChecks();
  }, interval);
}

async function runOverdueChecks() {
  const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const overdueInvoices = db
    .prepare(
      `SELECT * FROM invoices WHERE status = ? AND overdue_notified = 0 AND created_at <= ?`
    )
    .all('Overdue', threshold);

  for (const invoice of overdueInvoices) {
    const account = loadAccount(invoice.account_id);
    if (account?.phone) {
      await makeCall(account.phone, 'Your invoice is overdue. Please contact Refined Digital to resolve it.');
      await sendSms(account.phone, 'Your invoice is overdue. Please contact Refined Digital to resolve it.');
    }

    db.prepare('UPDATE invoices SET overdue_notified = 1, updated_at = ? WHERE id = ?').run(
      now(),
      invoice.id
    );
  }

  const pendingContracts = db
    .prepare(
      `SELECT * FROM contracts WHERE status = ? AND unsigned_notified = 0 AND created_at <= ?`
    )
    .all('Pending', threshold);

  for (const contract of pendingContracts) {
    const account = loadAccount(contract.account_id);
    if (account?.phone) {
      await makeCall(account.phone, 'Your contract is awaiting signature. Please review and sign to proceed.');
      await sendSms(account.phone, 'Your contract is awaiting signature. Please review and sign to proceed.');
    }

    db.prepare('UPDATE contracts SET unsigned_notified = 1, updated_at = ? WHERE id = ?').run(
      now(),
      contract.id
    );
  }
}

function loadAccount(accountId) {
  if (!accountId) {
    return null;
  }

  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
}
