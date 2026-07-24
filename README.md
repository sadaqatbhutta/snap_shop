# SnapShop AI

Multi-tenant AI-powered customer communication platform with a React frontend and an Express/BullMQ backend.  
It supports agent chat, AI replies (Gemini), broadcasts, templates, segments, team invites, analytics, and website webchat embed.

---

## Stack

- Frontend: React, Vite, Firebase Web SDK
- Backend: Express, BullMQ, Firebase Admin, Zod, Pino
- AI: Google Gemini
- Queueing: Redis (with in-memory dev fallback)

---

## Project Structure

```text
frontend/                   # React dashboard and settings UI
backend/
├── app.ts                  # Express app factory
├── server.ts               # API server bootstrap
├── worker.ts               # Queue worker bootstrap
└── src/
    ├── config/             # Env validation + Firebase Admin init
    ├── controllers/        # Route handlers
    ├── middlewares/        # Auth, signatures, validation, errors
    ├── queues/             # Queue + worker factory
    ├── routes/             # API route modules
    ├── services/           # Business logic (AI, webhook, broadcast, team)
    ├── validations/        # Zod schemas
    └── utils/              # Logger, metrics, retry, swagger
shared/                     # Shared TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project (Auth + Firestore)
- Google Gemini API key
- Redis (recommended for production)

### Install

```bash
npm install
```

All npm scripts are defined in the **repository root** `package.json`. Run them from the repo root (not from `frontend/`). Examples: `npm run dev` (API server), `npm run dev:frontend` (Vite dashboard only), `npm run build`, `npm run preview`, `npm test`.

### Configure Environment

Copy `.env.example` to `.env.local` and fill required values.

Important values:

- `GEMINI_API_KEY`
- `FIREBASE_PROJECT_ID`
- `WEBHOOK_SECRET`
- `WEBHOOK_VERIFY_TOKEN`
- `META_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `TIKTOK_ACCESS_TOKEN` (if using TikTok outbound)
- `TIKTOK_WEBHOOK_SECRET` (if using TikTok inbound signature verification)

### Run API + frontend

```bash
npm run dev
```

### Run workers

```bash
npm run worker
```

### Run tests

```bash
npm test
```

---

## API Highlights

- `POST /api/webhook/:channel`  
  Inbound provider webhook endpoint (supports `whatsapp`, `instagram`, `facebook`, `tiktok`) with channel-aware signature verification.

- `POST /api/webchat/message`  
  Public website chat ingestion endpoint used by the embeddable webchat widget.

- `POST /api/ai/process`  
  Authenticated AI processing endpoint for frontend calls (`verifyFirebaseToken` + business access check).

- `POST /api/conversations/send`  
  Authenticated agent-to-customer send route.

- `POST /api/broadcast/:broadcastId`  
  Queue/schedule broadcast delivery.

- `DELETE /api/broadcast/:broadcastId`  
  Cancel queued scheduled broadcast and mark as cancelled.

- `POST /api/team/invite`, `POST /api/team/accept`, `DELETE /api/team/invite/:token`  
  Team invite lifecycle with revocation support.

- `GET /api/health`, `GET /api/runtime`, `GET /api/docs`

- `GET /api/logs`, `GET /api/metrics` — in **staging** and **production**, set `OBSERVABILITY_KEY` and send header `X-Observability-Key` with the same value (see README deployment checklist). Open without a key in **development** and **test** only.

---

## Webchat Widget Embed

Use the script below on any website:

```html
<script
  src="https://YOUR_FRONTEND_DOMAIN/webchat-widget.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-api-base="https://YOUR_BACKEND_DOMAIN"
  data-title="Chat with us"
  data-position="right"
  defer
></script>
```

The widget posts messages to `/api/webchat/message`, which flows into the same AI/conversation pipeline.

---

## Notes

- In development without Redis, the in-memory queue fallback is enabled.
- For production, configure Redis and run the worker process.
- Settings > Integrations shows health indicators for key channel configuration values.

---

## Firebase (rules, indexes, access)

1. Install Firebase CLI and log in: `npm install -g firebase-tools` then `firebase login`.
2. Select your project: `firebase use <FIREBASE_PROJECT_ID>`.
3. Deploy rules and composite indexes from this repo:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
4. In **Authentication**, enable the sign-in providers your app uses (Google / Email).
5. Ensure each owner has a document **`businesses/{authUid}`** with **`ownerEmail`** matching their login email.
6. For teammates, add **`businesses/{businessId}/agents/{theirAuthUid}`** after they accept an invite.
7. If the browser console shows a missing index link, open it and create the index, or redeploy indexes after updating [`firestore.indexes.json`](firestore.indexes.json).

---

## Production SaaS features

- **Per-business channel credentials** — Settings → Integrations (saved via `PUT /api/business/:id/integrations` into `businesses/{id}/private/credentials`; client cannot read tokens)
- **Channel tenant routing** — Meta `phone_number_id` / page ids map to SnapShop businesses via `channel_bindings/{channel:externalId}`
- **Billing** — Free / Growth Pro / Scale Plus / Enterprise with usage metering; Stripe Checkout + Customer Portal when `STRIPE_*` env vars are set (`/api/billing/...`, webhook `POST /api/billing/webhook`). Client cannot forge `billing` / `usage` fields (Firestore rules).
- **Plan limits** — monthly messages, AI calls, broadcasts, and agent seats enforced on webhooks, agent send, AI routes, and invites
- **Email** — SendGrid-compatible invites + inquiry/escalation alerts when `SMTP_API_URL` (+ `SMTP_API_KEY` for SendGrid) is set
- **Legal** — `/privacy` and `/terms`
- **Platform admin** — `/admin` (requires Firestore `admins/{uid}`)
- **Observability** — `/api/health` reports billing/email/meta OAuth/meta fallback; optional `SENTRY_DSN` / `VITE_SENTRY_DSN`
- **Meta OAuth** — Settings → Integrations → Connect with Meta (`META_APP_ID` + `META_APP_SECRET`)
- **Digest emails** — daily/weekly notification digests via BullMQ `digest` worker
- **Per-tenant webhook secrets** — rotate from Integrations for `X-Snap-Signature`

---

## Deployment Safety Checklist

Use this checklist before pushing to staging/production:

- Set `NODE_ENV` to `staging` or `production`.
- Configure a working `REDIS_URL` (Redis 6.2+).
- Set `QUEUE_STRICT_MODE=true` so startup fails fast if Redis is unavailable.
- Run workers (`npm run worker`) or enable controlled inline workers only when intended.
- Confirm `GET /api/health` returns `queueRuntime.mode = "redis"` and `status = "ok"`.
- Verify required secrets are present: `GEMINI_API_KEY`, `WEBHOOK_SECRET`, `META_ACCESS_TOKEN` (or per-business OAuth), Firebase service credentials.
- Set `OBSERVABILITY_KEY` (16+ characters) on the server and call `GET /api/logs` / `GET /api/metrics` with header `X-Observability-Key: <same value>`. Without this key in staging/production, those endpoints return 403.

### Single-origin vs split-origin

- **Single origin (default Docker image)**: The API process serves the built SPA from `frontend/dist` and static assets such as `/webchat-widget.js` when `index.html` is present after `npm run build`. Use one public URL for both dashboard and API.
- **Split origin**: Host the Vite build on static storage (for example Firebase Hosting) and run the API elsewhere. Set **`VITE_API_BASE_URL`** at **build time** to the API origin so all dashboard `fetch` calls resolve correctly. Add that static origin to **`ALLOWED_ORIGINS`** on the API.

### Ports

- **Local**: `.env.example` uses `PORT=3040` so the Vite dev server can proxy `/api` to the backend; the proxy target uses the same `PORT` value from your env ([frontend/vite.config.ts](frontend/vite.config.ts)). The dashboard calls `/api` via the Vite origin in dev ([frontend/src/lib/apiBase.ts](frontend/src/lib/apiBase.ts)).
- **Docker**: The image listens on **3000** by default ([docker-compose.yml](docker-compose.yml), [Dockerfile](Dockerfile)).
