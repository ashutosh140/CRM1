# 🤖 AI CRM — Business Operating System

A fully automated, AI-powered CRM built from the project brief: lead management,
sales pipeline, customers, quotations, invoices, tasks, communication, and a
predictive AI layer. Built with **Next.js 15 + TypeScript + PostgreSQL (Prisma) + OpenAI**.

> **Runs with zero config.** If no `OPENAI_API_KEY` is set, all AI features fall
> back to deterministic heuristics ("mock mode") so the app is fully demoable.
> Add the key and the same features call OpenAI live — no code change.

---

## ✨ What's implemented (Phase 1 + AI core)

| Module | Status | AI features |
|--------|:------:|-------------|
| Dashboard (KPIs, revenue trend) | ✅ | AI Business Assistant insights |
| Lead Management | ✅ | AI scoring, **Zero-manual-entry capture**, conversation analysis |
| Sales Pipeline (drag & drop kanban) | ✅ | Stage win-probability |
| Customers | ✅ | **Customer Health Score**, churn risk |
| Quotations | ✅ | One-click generation → convert to invoice |
| Invoices & Payments | ✅ | Outstanding / overdue tracking |
| Tasks | ✅ | Assign & track |
| Communication Center | ✅ | Unified WhatsApp/Email/SMS/call log |
| Reports & Predictions | ✅ | Revenue **forecast**, **Employee AI Scores**, recovery targets |
| Settings | ✅ | Users, roles, integration status |
| Auto-capture webhook | ✅ | `POST /api/webhooks/inbound` |
| Role & permission management | ✅ | Admin / Manager / Sales / Employee |

> Outbound WhatsApp/Email/SMS **sending** and live payment collection are wired as
> adapters that activate the moment you add the relevant API keys (see below).

---

## 🚀 Quick start

### 1. Get a free PostgreSQL database (2 minutes)
- **Neon** → https://neon.tech → create project → copy the connection string, **or**
- **Supabase** → https://supabase.com → Project Settings → Database → connection string.

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set at minimum:
```
DATABASE_URL="postgresql://...your Neon/Supabase string..."
AUTH_SECRET="any-long-random-string"      # openssl rand -base64 32
# OPENAI_API_KEY="sk-..."                  # optional — leave blank for mock mode
```

### 3. Install, migrate, seed, run
```bash
npm install
npm run db:push      # create tables
npm run db:seed      # demo users + sample data
npm run dev          # http://localhost:3000
```

### 4. Log in
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@aicrm.app` | `admin123` |
| Manager | `manager@aicrm.app` | `manager123` |
| Sales | `sales@aicrm.app` | `sales123` |

---

## 🔌 API keys reference (what to get & when)

| Service | Env var | Needed for | Where |
|--------|---------|-----------|-------|
| **OpenAI** | `OPENAI_API_KEY` | Live AI scoring/analysis/insights | platform.openai.com |
| **WhatsApp** | `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID` | Sending WhatsApp follow-ups | Meta Business / 360dialog |
| **Email** | `SMTP_HOST/PORT/USER/PASS` | Sending emails | Gmail SMTP / SendGrid / Resend |
| **Payments** | `RAZORPAY_KEY_ID/SECRET` | Online payment collection | razorpay.com |

Everything works without these — they only enable real outbound delivery.

---

## 🧪 Try the AI

- **Leads → AI Capture** → paste any WhatsApp/email text → watch it extract a lead.
- **Lead detail → Conversation box** → paste a customer reply → see sentiment + intent.
- **Webhook** (simulate an inbound channel):
  ```bash
  curl -X POST http://localhost:3000/api/webhooks/inbound \
    -H "Content-Type: application/json" \
    -d '{"source":"WHATSAPP","message":"Hi, Ravi from Delta Corp here, need 20 units of Product X urgently, call +91 99999 88888"}'
  ```

---

## 🏗️ Architecture
```
src/
  app/
    (app)/            authenticated pages (dashboard, leads, customers, …)
    actions/          server actions (mutations) per domain
    api/webhooks/     inbound auto-capture
    login/            auth screen
  components/         UI + interactive client components
  lib/
    ai.ts             OpenAI adapter + heuristic fallbacks  ← all AI lives here
    auth.ts           JWT session (jose) + bcrypt + roles
    prisma.ts         DB client
    queries.ts        shared dashboard aggregations
prisma/
  schema.prisma       full data model
  seed.ts             demo data
```

## 🗺️ Roadmap (next phases, per brief)
- Phase 2: live WhatsApp/Email sending, PDF generation for quotes/invoices, meeting summary (speech-to-text).
- Phase 3: autonomous workflow engine, digital twin profiles, dynamic pricing.
- Phase 4: deeper predictive analytics, voice assistant.

---
Built phase-by-phase. This is Phase 1 — a real, running foundation, not a mockup.
