const { db, now } = require('./db');

function syncInvoice(payload = {}) {
  const stripeId = payload.id;
  if (!stripeId) {
    return { error: 'Missing Stripe invoice ID' };
  }

  const existing = db.prepare('SELECT id FROM invoices WHERE stripe_invoice_id = ?').get(stripeId);
  const mapped = mapInvoice(payload);

  if (existing) {
    db.prepare(`
      UPDATE invoices
      SET status = ?, amount = ?, due_date = ?, subscription_id = ?, account_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      mapped.status,
      mapped.amount,
      mapped.due_date,
      mapped.subscription_id,
      mapped.account_id,
      now(),
      existing.id
    );
    return { id: existing.id, updated: true };
  }

  const info = db.prepare(`
    INSERT INTO invoices (name, status, amount, due_date, account_id, stripe_invoice_id, subscription_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    mapped.name,
    mapped.status,
    mapped.amount,
    mapped.due_date,
    mapped.account_id,
    stripeId,
    mapped.subscription_id,
    now(),
    now()
  );

  return { id: info.lastInsertRowid, created: true };
}

function syncSubscription(payload = {}) {
  const stripeId = payload.id;
  if (!stripeId) {
    return { error: 'Missing Stripe subscription ID' };
  }

  const existing = db.prepare('SELECT id FROM subscriptions WHERE stripe_subscription_id = ?').get(stripeId);
  const mapped = mapSubscription(payload);

  if (existing) {
    db.prepare(`
      UPDATE subscriptions
      SET status = ?, current_period_end = ?, account_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      mapped.status,
      mapped.current_period_end,
      mapped.account_id,
      now(),
      existing.id
    );
    return { id: existing.id, updated: true };
  }

  const info = db.prepare(`
    INSERT INTO subscriptions (status, stripe_subscription_id, current_period_end, account_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    mapped.status,
    stripeId,
    mapped.current_period_end,
    mapped.account_id,
    now(),
    now()
  );

  return { id: info.lastInsertRowid, created: true };
}

function mapInvoice(payload) {
  return {
    name: payload.number || `Stripe Invoice ${payload.id || ''}`.trim(),
    status: mapInvoiceStatus(payload.status),
    amount: typeof payload.amount_due === 'number' ? payload.amount_due / 100 : null,
    due_date: payload.due_date ? new Date(payload.due_date * 1000).toISOString() : null,
    subscription_id: payload.subscription || null,
    account_id: payload.metadata?.account_id ? Number(payload.metadata.account_id) : null,
  };
}

function mapSubscription(payload) {
  return {
    status: payload.status || 'active',
    current_period_end: payload.current_period_end
      ? new Date(payload.current_period_end * 1000).toISOString()
      : null,
    account_id: payload.metadata?.account_id ? Number(payload.metadata.account_id) : null,
  };
}

function mapInvoiceStatus(status) {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'open':
      return 'Sent';
    case 'uncollectible':
    case 'past_due':
      return 'Overdue';
    default:
      return 'Draft';
  }
}

module.exports = {
  syncInvoice,
  syncSubscription,
};
