# Quick Start - Deploy to Staging in 5 Minutes

## Prerequisites
- Docker & Docker Compose installed
- Git repository cloned
- Environment variables ready

---

## Step 1: Configure Environment (2 minutes)

```bash
# Copy environment template
cp .env.example .env.staging

# Edit with your values
nano .env.staging
```

**Required variables**:
```env
GEMINI_API_KEY=your_gemini_api_key_here
WEBHOOK_SECRET=your_webhook_secret_32_chars_min
FIREBASE_PROJECT_ID=your_firebase_project_id
META_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_id
WEBHOOK_VERIFY_TOKEN=your_verify_token
```

---

## Step 2: Start Services (1 minute)

```bash
# Start everything (Redis + App + Worker)
docker-compose up -d

# Watch logs
docker-compose logs -f app
```

**Look for**:
- ✅ "Redis connected successfully"
- ✅ "Redis version check passed"
- ✅ "SnapShop backend started"

---

## Step 3: Verify Health (30 seconds)

```bash
curl http://localhost:3000/api/health
```

**Expected response**:
```json
{
  "status": "ok",
  "timestamp": "2026-04-08T...",
  "uptime_s": 10,
  "queues": {
    "emr": { "waiting": 0 },
    "webhook": { "waiting": 0 },
    "broadcast": { "waiting": 0 }
  }
}
```

---

## Step 4: Test Core Features (1 minute)

### Test Webhook
```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "test-biz",
    "user_id": "+1234567890",
    "message": "Hello"
  }'
```

### Check Metrics
```bash
curl http://localhost:3000/api/metrics
```

### View Logs
```bash
curl http://localhost:3000/api/logs?limit=10
```

---

## Step 5: Access Dashboard (30 seconds)

Open browser: `http://localhost:3000`

1. Sign in with Firebase Auth
2. Configure business settings
3. Add FAQs and AI context
4. Test a conversation

---

## Troubleshooting

### Issue: "Redis connection error"
```bash
# Check Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### Issue: "GEMINI_API_KEY is required"
```bash
# Verify environment file
cat .env.staging | grep GEMINI

# Restart with new env
docker-compose down
docker-compose up -d
```

### Issue: Port 3000 already in use
```bash
# Find process
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /F /PID <pid>

# Or change port in .env.staging
PORT=3001
```

---

## Common Commands

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f app
docker-compose logs -f worker
docker-compose logs -f redis

# Restart services
docker-compose restart app worker

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Check service status
docker-compose ps
```

---

## What's Working Now

✅ **Broadcasts**: Send messages to segmented customers
✅ **AI Responses**: Use FAQs and business context
✅ **Agent Messages**: Delivered to customers on WhatsApp/Instagram/Facebook
✅ **Conversation Management**: Proper escalation and status handling
✅ **Queue System**: Redis-backed with retry logic
✅ **Monitoring**: Health, metrics, and logs endpoints

---

## Next Steps

1. Configure WhatsApp webhook in Meta Developer Console
2. Point webhook URL to: `https://your-domain.com/api/webhook/whatsapp`
3. Add business settings in dashboard
4. Configure FAQs and AI context
5. Create customer segments
6. Test broadcast sending
7. Monitor logs and metrics

---

## Need Help?

- **Deployment Guide**: See `STAGING.md`
- **Redis Issues**: See `REDIS_FIX.md`
- **Bug Fixes**: See `BUG_FIXES.md`
- **Full Checklist**: See `STAGING_CHECKLIST.md`

---

**You're ready to go!** 🚀

The system is fully functional and ready for staging use.
