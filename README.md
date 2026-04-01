# SnapShop AI

A multi-tenant AI-powered customer communication and sales automation platform.

Handles customer conversations across WhatsApp, Instagram, Facebook, and Web Chat — with a built-in AI engine, CRM, broadcast system, and analytics dashboard.

---

## Project Structure

```
snap_shop/
├── frontend/               # React + Vite UI
│   ├── src/
│   │   ├── components/     # Reusable UI components (Layout, AuthGuard, ErrorBoundary)
│   │   ├── context/        # React context providers (BusinessContext)
│   │   ├── pages/          # One file per route/page
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Conversations.tsx
│   │   │   ├── CRM.tsx
│   │   │   ├── Broadcasts.tsx
│   │   │   ├── Templates.tsx
│   │   │   ├── Segments.tsx
│   │   │   ├── AISettings.tsx
│   │   │   ├── Analytics.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/       # Firebase auth, Firestore helpers, Gemini AI
│   │   ├── lib/            # Utility functions (cn, etc.)
│   │   ├── App.tsx         # Routes
│   │   ├── main.tsx        # Entry point
│   │   ├── firebase.ts     # Firebase client init
│   │   └── index.css       # Global styles (Tailwind)
│   ├── index.html
│   └── vite.config.ts
│
├── backend/                # Express server
│   └── server.ts           # Webhook pipeline + Vite dev middleware
│
├── shared/                 # Types and constants shared by frontend & backend
│   ├── types.ts
│   └── constants.ts
│
├── firestore.rules         # Firestore security rules
├── firebase-applet-config.json
├── .env.local              # Environment variables (never commit this)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Authentication enabled
- A Gemini API key

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env.local` and fill in your keys:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Configure Firebase
Update `firebase-applet-config.json` with your Firebase project credentials.

### 4. Deploy Firestore rules
Go to your Firebase Console → Firestore → Rules and paste the contents of `firestore.rules`.

### 5. Run the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How It Works

### Message Pipeline (Backend)
```
Inbound Message (any channel)
  → POST /api/webhook/:channel
  → Deduplication check
  → Find or create Customer in Firestore
  → Find or create Conversation in Firestore
  → Store customer message
  → Load conversation history
  → Gemini AI processes message
      → Detects intent, language, confidence
      → Generates reply
      → Escalates to human if confidence < threshold
  → Store AI reply
  → Return response
```

### Webhook Integration
Send a POST request to trigger the AI pipeline. You MUST include an `X-Snap-Signature` header containing the HMAC-SHA256 signature of the raw request body using your `WEBHOOK_SECRET`.

Example Node.js signature generation:
```javascript
const crypto = require('crypto');
const bodyString = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
                        .update(bodyString)
                        .digest('hex');
```

```http
POST http://localhost:3000/api/webhook/whatsapp
Content-Type: application/json
X-Snap-Signature: <your_generated_signature>

{
  "business_id": "your-business-id",
  "user_id": "+923001234567",
  "message": "Price kya hai?",
  "type": "text",
  "name": "Customer Name"
}
```

Your `business_id` is shown on the Settings page after login.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| AI | Google Gemini 2.0 Flash |
| Animations | Motion (Framer Motion) |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |
