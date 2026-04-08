# Staging Readiness Checklist

## ✅ Completed Items

### Infrastructure & Deployment
- [x] **Dockerfile** - Multi-stage build with Node 20 LTS Alpine
- [x] **docker-compose.yml** - Complete orchestration with Redis 7
- [x] **.dockerignore** - Optimized build context
- [x] **Health Checks** - Built into Docker and app (`/api/health`)
- [x] **Graceful Shutdown** - SIGTERM/SIGINT handlers in queue.ts

### Redis & Queue System
- [x] **Redis Version Check** - Automatic detection of Redis 6.2+ requirement
- [x] **Connection Retry Logic** - Exponential backoff with 10 attempts
- [x] **TLS Support** - Handles `rediss://` URLs with self-signed certs
- [x] **Fallback Strategy** - In-memory queue for development
- [x] **Error Handling** - READONLY, ECONNREFUSED, timeout handling
- [x] **Staging Environment** - Added to NODE_ENV enum

### Security
- [x] **Helmet** - HTTP security headers enabled
- [x] **Non-root User** - Docker runs as nodejs:nodejs (UID 1001)
- [x] **Secrets Management** - `.env.local` cleared, documented in .env.example
- [x] **CORS Configuration** - Environment-based origin validation
- [x] **Rate Limiting** - Already implemented in middleware
- [x] **Input Validation** - Zod schemas for all endpoints

### Monitoring & Observability
- [x] **Structured Logging** - Pino with JSON output
- [x] **Metrics Endpoint** - `/api/metrics` with queue stats
- [x] **Health Endpoint** - `/api/health` with uptime and queue depth
- [x] **Request ID Tracking** - X-Request-ID header on all requests
- [x] **Error Tracking** - Centralized error handler with logging

### Documentation
- [x] **STAGING.md** - Complete deployment guide
- [x] **REDIS_FIX.md** - Redis issue resolution documentation
- [x] **.env.example** - All variables documented with examples
- [x] **README.md** - Already exists (needs minor updates)

### Code Quality
- [x] **TypeScript** - Full type safety
- [x] **ESLint** - Installed and configured
- [x] **Prettier** - Installed for code formatting
- [x] **Tests** - Vitest test suite exists
- [x] **Dependency Audit** - `npm audit` run, 1 high fixed, 8 low documented

## ⚠️ Pending Items (Not Critical for Staging)

### CI/CD (Can be added later)
- [ ] **GitHub Actions Workflow** - Automated build/test/deploy
- [ ] **Automated Tests in CI** - Run on every push/PR
- [ ] **Docker Image Push** - To container registry
- [ ] **Automated Deployment** - To staging environment

### Documentation (Nice to have)
- [ ] **LICENSE** - Add MIT or Apache 2.0
- [ ] **CONTRIBUTING.md** - Contributor guidelines
- [ ] **CHANGELOG.md** - Version history
- [ ] **CODE_OF_CONDUCT.md** - Community standards
- [ ] **SECURITY.md** - Vulnerability disclosure policy

### Monitoring (Production-level)
- [ ] **External Log Aggregation** - ELK/Splunk/CloudWatch
- [ ] **APM Integration** - Datadog/New Relic/Prometheus
- [ ] **Alerting** - PagerDuty/Opsgenie for critical errors
- [ ] **Uptime Monitoring** - Pingdom/UptimeRobot

## 🚀 Staging Deployment Steps

### Pre-Deployment Checklist
- [ ] Redis 6.2+ available (or use Docker Compose)
- [ ] All environment variables set (see `.env.example`)
- [ ] Firebase project configured
- [ ] Gemini API key obtained
- [ ] WhatsApp/Meta credentials ready (if using webhooks)

### Deployment Options

#### Option 1: Docker Compose (Recommended)
```bash
# 1. Clone repository
git clone <repo-url>
cd snap_shop

# 2. Create .env file
cp .env.example .env.staging
# Edit .env.staging with real values

# 3. Start services
docker-compose up -d

# 4. Check logs
docker-compose logs -f app

# 5. Verify health
curl http://localhost:3000/api/health
```

#### Option 2: Manual Deployment
```bash
# 1. Install dependencies
npm ci --production

# 2. Set environment variables
export NODE_ENV=staging
export REDIS_URL=redis://your-redis:6379
export GEMINI_API_KEY=your_key
# ... other vars

# 3. Start server
npm start &

# 4. Start worker (separate terminal)
npm run worker &

# 5. Verify
curl http://localhost:3000/api/health
```

#### Option 3: Docker Build Only
```bash
# 1. Build image
docker build -t snapshop-backend:staging .

# 2. Run container
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=staging \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e GEMINI_API_KEY=your_key \
  --name snapshop-app \
  snapshop-backend:staging

# 3. Check logs
docker logs -f snapshop-app
```

### Post-Deployment Verification

#### 1. Health Check
```bash
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-04-08T...",
  "uptime_s": 42,
  "queues": {
    "emr": { "waiting": 0 },
    "webhook": { "waiting": 0 },
    "broadcast": { "waiting": 0 }
  }
}
```

#### 2. Metrics Check
```bash
curl http://localhost:3000/api/metrics

# Should show:
# - global.total_requests
# - global.error_rate
# - endpoints breakdown
```

#### 3. Logs Check
```bash
# Docker Compose
docker-compose logs app | grep -i redis

# Manual
tail -f logs/app.log | grep -i redis

# Should see:
# ✓ "Redis connected successfully"
# ✓ "Redis version check passed"
# ✗ No "in-memory fallback" warnings
```

#### 4. Queue Test
```bash
# Send test webhook
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{
    "business_id": "test-biz",
    "user_id": "+1234567890",
    "message": "Hello staging"
  }'

# Check if job was queued
curl http://localhost:3000/api/metrics
```

#### 5. Worker Verification
```bash
# Check worker logs
docker-compose logs worker | tail -20

# Or manual
ps aux | grep "npm run worker"
```

## 🔧 Troubleshooting

### Issue: "Redis version too old"
**Solution**: See `REDIS_FIX.md` - Upgrade to Redis 6.2+

### Issue: "ECONNREFUSED"
**Solution**: 
1. Check Redis is running: `redis-cli ping`
2. Verify REDIS_URL in environment
3. Check firewall rules

### Issue: "Using in-memory fallback"
**Solution**: 
- This is expected in development (NODE_ENV=development)
- In staging, ensure NODE_ENV=staging and Redis is accessible

### Issue: Health check fails
**Solution**:
1. Check app logs: `docker-compose logs app`
2. Verify port 3000 is not in use: `netstat -ano | findstr :3000`
3. Check environment variables are set

### Issue: Worker not processing jobs
**Solution**:
1. Verify worker is running: `docker-compose ps`
2. Check worker logs: `docker-compose logs worker`
3. Verify Redis connection in worker logs

## 📊 Monitoring in Staging

### Key Metrics to Watch
- **Error Rate**: Should be < 1% (`/api/metrics`)
- **Response Time**: Should be < 500ms average
- **Queue Depth**: Should stay near 0 (check `/api/health`)
- **Redis Memory**: Monitor with `redis-cli INFO memory`

### Log Monitoring
```bash
# Watch for errors
docker-compose logs -f app | grep -i error

# Watch Redis connections
docker-compose logs -f app | grep -i redis

# Watch queue processing
docker-compose logs -f worker | grep -i completed
```

### Redis Monitoring
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check queue keys
KEYS bull:*

# Check queue lengths
LLEN bull:emr:waiting
LLEN bull:webhook:waiting
LLEN bull:broadcast:waiting

# Check failed jobs
LLEN bull:emr:failed
```

## 🎯 Success Criteria

Staging is ready when:
- ✅ App starts without errors
- ✅ Redis version 6.2+ detected
- ✅ Health endpoint returns 200
- ✅ Metrics endpoint shows data
- ✅ Test webhook is processed
- ✅ Worker logs show job completion
- ✅ No critical errors in logs
- ✅ Queue depths stay at 0

## 📞 Support

If issues persist:
1. Check `STAGING.md` for detailed troubleshooting
2. Check `REDIS_FIX.md` for Redis-specific issues
3. Review logs: `docker-compose logs app worker redis`
4. Verify environment variables: `docker-compose config`

## 🔄 Rollback Plan

If deployment fails:
```bash
# Stop services
docker-compose down

# Revert to previous version
git checkout <previous-commit>

# Restart
docker-compose up -d
```

Or use in-memory fallback:
```bash
# Set environment to development
export NODE_ENV=development
npm start
```

---

**Status**: ✅ **READY FOR STAGING DEPLOYMENT**

All critical components are in place. The Redis version issue has been resolved with automatic detection, retry logic, and comprehensive documentation.
