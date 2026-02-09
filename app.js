const API_BASE = '/api';

const ENTITY_CONFIG = {
  accounts: {
    label: 'Accounts',
    listFields: ['phone', 'email', 'website'],
  },
  leads: {
    label: 'Leads',
    listFields: ['status', 'source', 'preferred_contact_time', 'follow_up_at', 'assigned_to'],
  },
  projects: {
    label: 'Projects',
    listFields: ['status', 'deadline', 'project_type', 'progress', 'account_id', 'payment_status'],
  },
  tasks: {
    label: 'Tasks',
    listFields: ['status', 'due_date', 'project_id', 'assigned_to'],
  },
  bookings: {
    label: 'Bookings',
    listFields: ['status', 'scheduled_at', 'contact_name', 'contact_phone', 'channel', 'account_id'],
  },
  contracts: {
    label: 'Contracts',
    listFields: ['status', 'account_id', 'project_id', 'sent_at', 'signed_at'],
  },
  invoices: {
    label: 'Invoices',
    listFields: ['status', 'amount', 'due_date', 'account_id', 'stripe_invoice_id'],
  },
};

const cache = {
  accounts: [],
  projects: [],
};

const accountMap = new Map();
const projectMap = new Map();

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initForms();
  initLists();
  initServiceWorker();
  refreshAll();
});

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((btn) => btn.classList.remove('active'));
      tab.classList.add('active');
      const sectionId = tab.dataset.section;
      document.querySelectorAll('.section').forEach((section) => {
        section.classList.toggle('active', section.id === sectionId);
      });
    });
  });
}

function initForms() {
  document.querySelectorAll('form[data-entity]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const entity = form.dataset.entity;
      const payload = getFormPayload(form);
      const response = await fetch(`${API_BASE}/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to save record.');
        return;
      }

      form.reset();
      await refreshEntity(entity);
      await refreshDashboard();
    });
  });
}

function initLists() {
  document.querySelectorAll('[data-list]').forEach((list) => {
    list.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }

      const action = button.dataset.action;
      const entity = button.dataset.entity;
      const id = button.dataset.id;

      if (action === 'complete' && entity === 'tasks') {
        await fetch(`${API_BASE}/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Completed' }),
        });
        await refreshEntity('tasks');
        await refreshEntity('projects');
        await refreshDashboard();
      }
    });
  });
}

async function refreshAll() {
  await checkHealth();
  await Promise.all([
    refreshEntity('accounts'),
    refreshEntity('leads'),
    refreshEntity('projects'),
    refreshEntity('tasks'),
    refreshEntity('bookings'),
    refreshEntity('contracts'),
    refreshEntity('invoices'),
  ]);
  await refreshDashboard();
}

async function refreshEntity(entity) {
  if (!ENTITY_CONFIG[entity]) {
    return;
  }

  const response = await fetch(`${API_BASE}/${entity}`);
  const data = response.ok ? await response.json() : [];
  if (entity === 'accounts') {
    cache.accounts = data;
    accountMap.clear();
    data.forEach((account) => accountMap.set(String(account.id), account));
    refreshSelectOptions('accounts', data);
  }

  if (entity === 'projects') {
    cache.projects = data;
    projectMap.clear();
    data.forEach((project) => projectMap.set(String(project.id), project));
    refreshSelectOptions('projects', data);
  }

  renderList(entity, data);
}

async function refreshDashboard() {
  const statsContainer = document.getElementById('stats-cards');
  const leadStatusContainer = document.getElementById('lead-status-cards');
  if (!statsContainer || !leadStatusContainer) {
    return;
  }

  const [leads, projects, tasks, bookings, invoices] = await Promise.all([
    fetch(`${API_BASE}/leads`).then((res) => (res.ok ? res.json() : [])),
    fetch(`${API_BASE}/projects`).then((res) => (res.ok ? res.json() : [])),
    fetch(`${API_BASE}/tasks`).then((res) => (res.ok ? res.json() : [])),
    fetch(`${API_BASE}/bookings`).then((res) => (res.ok ? res.json() : [])),
    fetch(`${API_BASE}/invoices`).then((res) => (res.ok ? res.json() : [])),
  ]);

  const completedTasks = tasks.filter((task) => task.status === 'Completed').length;
  const overdueInvoices = invoices.filter((invoice) => invoice.status === 'Overdue').length;

  statsContainer.innerHTML = '';
  statsContainer.appendChild(createStatCard('Active Leads', leads.length));
  statsContainer.appendChild(createStatCard('Active Projects', projects.length));
  statsContainer.appendChild(createStatCard('Tasks Completed', completedTasks));
  statsContainer.appendChild(createStatCard('Bookings', bookings.length));
  statsContainer.appendChild(createStatCard('Overdue Invoices', overdueInvoices));

  const statusCounts = leads.reduce((acc, lead) => {
    const status = lead.status || 'Unspecified';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  leadStatusContainer.innerHTML = '';
  Object.entries(statusCounts).forEach(([status, count]) => {
    leadStatusContainer.appendChild(createStatCard(status, count));
  });
}

function createStatCard(label, value) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  const title = document.createElement('h3');
  title.textContent = label;
  const span = document.createElement('span');
  span.textContent = value;
  card.appendChild(title);
  card.appendChild(span);
  return card;
}

function renderList(entity, items) {
  const list = document.querySelector(`[data-list="${entity}"]`);
  if (!list) {
    return;
  }

  list.innerHTML = '';
  const config = ENTITY_CONFIG[entity];

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.textContent = `No ${config.label.toLowerCase()} yet.`;
    list.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'list-card';

    const header = document.createElement('div');
    header.className = 'list-card-header';
    const title = document.createElement('h4');
    title.textContent = item.name || `${config.label.slice(0, -1)} #${item.id}`;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = item.status || 'Active';
    header.appendChild(title);
    header.appendChild(badge);
    card.appendChild(header);

    const metaGrid = document.createElement('div');
    metaGrid.className = 'meta-grid';
    config.listFields.forEach((field) => {
      const cell = document.createElement('div');
      const label = document.createElement('small');
      label.textContent = prettifyLabel(field);
      const value = document.createElement('span');
      value.textContent = formatValue(field, item[field]);
      cell.appendChild(label);
      cell.appendChild(value);
      metaGrid.appendChild(cell);
    });
    card.appendChild(metaGrid);

    if (entity === 'tasks' && item.status !== 'Completed') {
      const actions = document.createElement('div');
      actions.className = 'actions';
      const button = document.createElement('button');
      button.className = 'button';
      button.dataset.action = 'complete';
      button.dataset.entity = 'tasks';
      button.dataset.id = item.id;
      button.textContent = 'Mark Completed';
      actions.appendChild(button);
      card.appendChild(actions);
    }

    list.appendChild(card);
  });
}

function prettifyLabel(field) {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(field, value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (field === 'account_id') {
    return accountMap.get(String(value))?.name || `Account #${value}`;
  }

  if (field === 'project_id') {
    return projectMap.get(String(value))?.name || `Project #${value}`;
  }

  if (field === 'progress') {
    return `${value}%`;
  }

  if (field === 'amount') {
    const number = Number(value);
    return Number.isFinite(number) ? `R ${number.toFixed(2)}` : value;
  }

  if (field.endsWith('_at') || field.endsWith('_date') || field === 'deadline') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  return value;
}

function getFormPayload(form) {
  const formData = new FormData(form);
  const payload = {};
  for (const [key, value] of formData.entries()) {
    if (value !== '') {
      payload[key] = value;
    }
  }
  return payload;
}

function refreshSelectOptions(source, items) {
  document.querySelectorAll(`select[data-source="${source}"]`).forEach((select) => {
    const current = select.value;
    select.innerHTML = '<option value="">Select</option>';
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name || `${source.slice(0, -1)} #${item.id}`;
      select.appendChild(option);
    });
    select.value = current;
  });
}

async function checkHealth() {
  const status = document.getElementById('sync-status');
  if (!status) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/health`);
    status.textContent = response.ok ? 'Connected' : 'Offline';
  } catch (error) {
    status.textContent = 'Offline';
  }
}

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
}
