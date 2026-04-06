# SnapShop AI

A multi-tenant AI-powered customer communication and sales automation platform. This repo contains a production-ready backend built with Express, BullMQ, Firebase Admin, and Google Gemini.

---

## 🏗️ Backend Structure

```text
backend/
├── app.ts                 # Express app factory
├── server.ts              # HTTP server bootstrap
├── worker.ts              # Background job worker bootstrap
├── src/
│   ├── config/
│   │   ├── config.ts      # Environment validation
│   │   └── firebase.ts    # Firebase Admin initialization
│   ├── controllers/       # Request handlers
│   ├── middlewares/       # Auth, validation, error handling, logging
│   ├── queues/            # BullMQ queue definitions and worker factory
│   ├── routes/            # API route registration
│   ├── services/          # Business logic and Firestore access
│   ├── utils/             # Logger, retry helpers, Swagger, metrics, log store
│   └── validations/       # Zod schemas for all major endpoints
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Redis
- Firebase Project with Firestore and Auth enabled
- Google Gemini API key

### Install
```bash
npm install
```

### Environment
Copy `.env.example` to `.env.local` and fill in required values.

### Run locally
```bash
npm run dev
```

### Start workers
```bash
npm run worker
```

### Run tests
```bash
npm test
```

### Docker
```bash
docker build -t snapshop-backend .
docker-compose up --build
```

---

## 🔧 API Highlights

- `POST /api/webhook/:channel` — queue webhook payloads with HMAC verification and schema validation.
- `POST /api/emr/post` — enqueue EMR requests with authenticated access.
- `POST /api/broadcast/:broadcastId` — schedule or queue broadcast jobs.
- `POST /api/team/invite` — invite teammates with secure token issuance.
- `POST /api/team/accept` — accept team invites.
- `GET /api/logs` — query recent structured request logs.
- `GET /api/metrics` — in-process metrics for request volume and latency.
- `GET /api/health` — health check with Redis queue depth.
- `GET /api/docs` — interactive Swagger documentation.

---

## 🔐 Production Improvements

- Centralized environment validation using Zod.
- Firebase JWT authentication middleware.
- Role-aware authorization scaffolding.
- Structured logging with Pino.
- Central error middleware and consistent API error payloads.
- Redis-backed rate limiting for global and EMR routes.
- BullMQ retries with exponential backoff and failure logging.
- Input sanitization through Zod `.trim()` schemas.
- API documentation via Swagger UI.
- Docker deployment ready with Redis compose support.
