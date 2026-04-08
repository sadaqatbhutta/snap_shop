# Staging Deployment Guide

## Prerequisites

### Redis Requirements
- **Minimum Version**: Redis 6.2+ (required by BullMQ 5.x)
- **Recommended**: Redis 7.0+ for best performance and stability

### Check Your Redis Version
```bash
redis-cli INFO server | grep redis_version
```

If your Redis version is < 6.2, you must upgrade:

**Ubuntu/Debian:**
```bash
sudo add-apt-repository ppa:redislabs/redis
sudo apt-get update
sudo apt-get install redis-server
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Managed Services:**
- AWS ElastiCache: Use Redis 6.2 or 7.x engine
- Google Cloud Memorystore: Select Redis 6.x or 7.x
- Azure Cache for Redis: Use Premium tier with Redis 6.x+
- Redis Cloud: All plans support Redis 6.2+

---

## Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.example .env.staging
```

### 2. Configure Redis Connection

**Local Redis:**
```env
REDIS_URL=redis://localhost:6379
```

**Redis with Password:**
```env
REDIS_URL=redis://:your_password@hostname:6379
```

**Redis with TLS (Staging/Production):**
```env
REDIS_URL=rediss://username:password@hostname:6380
```

**AWS ElastiCache:**
```env
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
```

**Google Cloud Memorystore:**
```env
REDIS_URL=redis://10.0.0.3:6379
```

### 3. Set Environment
```env
NODE_ENV=staging
STAGING=true
```

---

## Common Redis Issues & Solutions

### Issue 1: "Redis version too old for BullMQ"
**Error:** `Redis version 5.x detected, BullMQ requires 6.2+`

**Solution:**
1. Upgrade Redis to 6.2+ (see Prerequisites above)
2. Or use in-memory fallback for development:
   ```env
   NODE_ENV=development
   ```

### Issue 2: "ECONNREFUSED" or "Redis connection error"
**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
1. Verify Redis is running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. Check firewall rules allow port 6379/6380

3. Verify REDIS_URL is correct in .env

### Issue 3: "READONLY" errors
**Error:** `READONLY You can't write against a read only replica`

**Solution:**
- You're connected to a Redis replica, not the master
- Update REDIS_URL to point to the master node
- For AWS ElastiCache, use the Primary Endpoint, not Reader Endpoint

### Issue 4: TLS/SSL connection failures
**Error:** `Error: self signed certificate in certificate chain`

**Solution:**
- Use `rediss://` (with double 's') in REDIS_URL
- The queue.ts automatically handles self-signed certs in staging
- For production, use proper CA-signed certificates

### Issue 5: Connection timeout
**Error:** `Error: Connection timeout`

**Solution:**
1. Increase timeout in Redis connection:
   ```typescript
   // Already configured in queue.ts
   connectTimeout: 10000
   ```

2. Check network latency between app and Redis

3. Verify Redis max connections:
   ```bash
   redis-cli CONFIG GET maxclients
   ```

---

## Deployment Steps

### 1. Install Dependencies
```bash
npm ci --production
```

### 2. Build Frontend (if needed)
```bash
npm run build
```

### 3. Set Environment Variables
```bash
export NODE_ENV=staging
export REDIS_URL=redis://your-redis-host:6379
export GEMINI_API_KEY=your_key_here
# ... other vars from .env.example
```

### 4. Start Server
```bash
npm start
```

### 5. Start Worker (separate process)
```bash
npm run worker
```

### 6. Verify Health
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
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

---

## Monitoring Redis in Staging

### Check Queue Status
```bash
# Via API
curl http://localhost:3000/api/metrics

# Via Redis CLI
redis-cli
> KEYS bull:*
> LLEN bull:emr:waiting
> LLEN bull:webhook:failed
```

### Monitor Logs
```bash
# Application logs
tail -f logs/app.log | grep -i redis

# Redis logs (Ubuntu)
tail -f /var/log/redis/redis-server.log
```

### Performance Metrics
```bash
redis-cli INFO stats
redis-cli INFO memory
redis-cli SLOWLOG GET 10
```

---

## Fallback Mode (Development)

If Redis is unavailable, the app automatically falls back to in-memory queues:

```
[WARN] Using in-memory fallback queue because Redis is unavailable
```

**Limitations:**
- Jobs are not persisted
- No retry on app restart
- Single-process only (no worker separation)
- Not suitable for staging/production

**To disable fallback and force Redis:**
```env
NODE_ENV=staging  # or production
```

---

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Build frontend
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=staging
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - redis

  worker:
    build: .
    command: npm run worker
    environment:
      - NODE_ENV=staging
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - redis

volumes:
  redis-data:
```

### Run with Docker Compose
```bash
docker-compose up -d
docker-compose logs -f app
```

---

## Troubleshooting Checklist

- [ ] Redis version is 6.2 or higher
- [ ] Redis is running and accessible
- [ ] REDIS_URL is correctly formatted
- [ ] Firewall allows Redis port (6379/6380)
- [ ] TLS is configured if using `rediss://`
- [ ] Environment variables are set
- [ ] Application logs show "Redis connected successfully"
- [ ] Health endpoint returns queue status
- [ ] No "READONLY" or "ECONNREFUSED" errors in logs

---

## Support

If issues persist:
1. Check application logs: `logs/app.log`
2. Check Redis logs
3. Verify Redis version: `redis-cli INFO server`
4. Test Redis connection: `redis-cli -u $REDIS_URL ping`
5. Review this guide's Common Issues section

For BullMQ-specific issues, see: https://docs.bullmq.io/
