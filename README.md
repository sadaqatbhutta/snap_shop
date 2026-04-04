# SnapShop AI

A multi-tenant AI-powered customer communication and sales automation platform designed for modern businesses. SnapShop AI handles customer conversations across multiple channels with a built-in AI engine, CRM, broadcast system, and a comprehensive analytics dashboard.

---

## 🌟 Core Features

- **Multi-Channel Hub**: Unified inbox for WhatsApp, Instagram, and Facebook.
- **AI Automation**: Powered by Google Gemini 2.0 Flash for intelligent, contextual replies in multiple languages (English, Urdu, Arabic, etc.).
- **Asynchronous Pipeline**: Built with BullMQ and Redis for high-throughput webhook processing.
- **Segment-Based Broadcasts**: Send massive campaigns to thousands of customers with automated cursor-based pagination.
- **Durable CRM**: Automates customer and conversation lifecycle management using Firestore Transactions.
- **Security First**: Configurable CORS policies, Redis-backed rate limiting, and HMAC-SHA256 signature verification.
- **Team Management**: Robust invitation and role-based access for agents and admins.

---

## 🏗️ Project Structure

```text
snap_shop/
├── frontend/               # React + Vite UI
│   ├── src/
│   │   ├── components/     # UI Design System & Reusable Components
│   │   ├── context/        # Business & Auth Context Providers
│   │   ├── pages/          # Dashboard, Conversations, Broadcasts, CRM, etc.
│   │   ├── services/       # Firebase Client & Gemini AI connectors
│   │   ├── App.tsx         # Routing Logic
│   │   └── main.tsx        # Entry point
│   └── vite.config.ts
│
├── backend/                # Express Server (Node.js)
│   ├── api/                # Route Handlers (Webhook, Team, EMR, etc.)
│   ├── core/               # Shared Utilities (Config, Redis, Logger, Firebase Admin)
│   ├── schemas/            # Zod validation schemas
│   ├── services/           # Business Logic (AI Pipeline, Broadcast Worker)
│   ├── server.ts           # Web Server Entry point
│   └── worker.ts           # Background Job Processor
│
├── shared/                 # Contract types shared by Frontend/Backend
│   ├── types.ts            # TypeScript Interfaces
│   └── constants.ts
│
├── firestore.rules         # Resource-level access control
├── tsconfig.json           # Strict-mode TypeScript configuration
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- **Redis Server** (for Rate Limiting and Background Jobs)
- **Firebase Project** (Firestore & Auth enabled)
- **Gemini API Key** (Google AI SDK)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and fill in your credentials:
```bash
# Core
GEMINI_API_KEY=your_key
REDIS_URL=redis://localhost:6379

# Security
WEBHOOK_SECRET=your_32_char_secret_key
ALLOWED_ORIGINS=https://app.snapshop.com,http://localhost:5173

# Meta Integration
WEBHOOK_VERIFY_TOKEN=your_token
META_ACCESS_TOKEN=your_access_token
```

### 3. Deploy Firestore Rules
Go to your Firebase Console → Firestore → Rules and paste the contents of `firestore.rules`.

### 4. Run the Development Environment
Start the web server and Vite dev middleware:
```bash
npm run dev
```

### 5. Start Background Workers
In a separate terminal, start the BullMQ worker:
```bash
npm run worker
```

---

## ⚙️ How It Works

### Asynchronous Webhook Pipeline
SnapShop uses a producer-consumer model for webhooks to ensure responsiveness and reliability.

1. **Producer**: Webhook arrives at `POST /api/webhook/:channel`.
2. **Validator**: Authenticates the signature and validates the schema.
3. **Queue**: Message is pushed to a **Redis-backed BullMQ**.
4. **Consumer**: The worker process picks up the job:
   - Performs an atomic **Firestore Transaction** to link the message to a Customer and Conversation.
   - Triggers the **AI Pipeline** (Gemini 2.0 Flash) to generate a response.
   - Sends the reply via Meta's Channel APIs.
   - Updates daily analytics and stats counters.

---

## 🛡️ Security & Scalability

- **CORS Policy**: In production, the backend strictly enforces an origin allowlist via the `ALLOWED_ORIGINS` variable.
- **Distributed Rate Limiting**: Uses `rate-limiter-flexible` with Redis to prevent abuse across both global and EMR-specific routes.
- **Durable Operations**: Every customer message uses cursor-based pagination and Firestore transactions to ensure data consistency during massive broadcast campaigns.

---

## 📝 Environment Variables Summary

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini AI access. |
| `REDIS_URL` | Connection string for the local or managed Redis instance. |
| `WEBHOOK_SECRET` | Secret key for generating HMAC-SHA256 webhook signatures. |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins. |
| `SMTP_API_URL` | Endpoint for sending team invitation emails. |
| `APP_URL` | Root URL of your frontend (for invite links). |
