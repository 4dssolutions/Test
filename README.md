# Refined Digital CRM (Web + App-ready)

This repository contains a lightweight CRM system built for browser use and future app
packaging (PWA-ready). It includes core CRM modules (Leads, Projects, Tasks, Bookings,
Contracts, Invoices) and a JSON API to integrate with external systems.

## Features
- Lead capture and follow-up tracking
- Project and task management with auto-progress updates
- Booking capture endpoint (for call agents or web forms)
- Billing records and overdue follow-up reminders
- Stripe webhook-compatible sync endpoints (invoice + subscription)
- Twilio-ready communication hooks (SMS, WhatsApp, call)
- Progressive Web App (PWA) shell for installable app flow

## Quick Start
```bash
npm install
npm start
```

Open: [http://localhost:3000](http://localhost:3000)

## Environment Variables
Copy `.env.example` to `.env` and adjust:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `TWILIO_WHATSAPP_FROM`
- `TWILIO_CALL_FROM`
- `EMAIL_FROM`

If Twilio credentials are not set, the CRM will skip outbound calls/SMS but still run.

## API Overview
- `GET /api/health`
- `GET /api/:entity` (accounts, leads, projects, tasks, bookings, contracts, invoices)
- `POST /api/:entity`
- `PUT /api/:entity/:id`
- `DELETE /api/:entity/:id`
- `POST /api/stripe/invoice`
- `POST /api/stripe/subscription`

## App Packaging
The UI ships with a manifest and service worker. You can package this into a mobile app
using tools like Capacitor, Cordova, or a WebView wrapper.