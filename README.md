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

- `GET /api/health`, `GET /api/metrics`, `GET /api/logs`, `GET /api/docs`

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
