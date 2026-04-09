# Remaining Work - Complete Tracking

## 🔴 Critical Security (Must Fix Before Production)

### 1. Wire Business Access Middleware to All Routes
**Priority**: P0 (Blocker)
**Effort**: 30 minutes
**Files**: 
- `backend/src/routes/conversations.ts`
- `backend/src/routes/broadcast.ts`
- `backend/src/routes/emr.ts`
- `backend/src/routes/team.ts`

**Implementation**: Add `verifyFirebaseToken` and `verifyBusinessAccess` to all routes

### 2. Encrypt or Move Meta Access Tokens
**Priority**: P0 (Blocker)
**Effort**: 20 minutes
**Options**:
- A) Move to environment variables (simpler, recommended for single-tenant)
- B) Encrypt in Firestore with Google Cloud KMS (better for multi-tenant)

### 3. Add Rate Limiting to Webhook Endpoints
**Priority**: P1 (High)
**Effort**: 5 minutes
**File**: `backend/src/routes/webhook.ts`

---

## 🟡 High Priority Features (Should Have)

### 4. Fix InMemoryQueue to Actually Process Jobs
**Priority**: P1
**Effort**: 15 minutes
**File**: `backend/src/queues/queue.ts`
**Issue**: Dev fallback doesn't call processor function

### 5. Add HEALTHCHECK to Dockerfile
**Priority**: P1
**Effort**: 2 minutes
**File**: `Dockerfile`
**Current**: Has HEALTHCHECK instruction
**Status**: ✅ Already implemented

### 6. Template Variable Substitution
**Priority**: P1
**Effort**: 30 minutes
**File**: `backend/src/services/broadcast.service.ts`
**Variables**: `{{customer_name}}`, `{{business_name}}`, etc.

### 7. Conversation Assignment to Agents
**Priority**: P1
**Effort**: 45 minutes
**Files**:
- `backend/src/services/webhook.service.ts` - Auto-assign logic
- `backend/src/routes/conversations.ts` - Manual assign endpoint
- `frontend/src/pages/Conversations.tsx` - Assignment UI

---

## 🟢 Medium Priority Features (Nice to Have)

### 8. Email Delivery for Team Invites
**Priority**: P2
**Effort**: 1 hour
**Files**:
- `backend/src/services/email.service.ts` - NEW
- `backend/src/services/team.service.ts` - Call email service
**Requires**: SMTP configuration (already in config)

### 9. Browser Notifications for Escalations
**Priority**: P2
**Effort**: 1 hour
**Files**:
- `frontend/src/services/notifications.ts` - NEW
- `frontend/src/pages/Conversations.tsx` - Request permission & show notifications

### 10. Analytics from Stats Collection
**Priority**: P2
**Effort**: 2 hours
**File**: `frontend/src/pages/Analytics.tsx`
**Current**: Reads from conversations (slow)
**Target**: Read from `businesses/{id}/stats/daily_*` (fast)

### 11. Dashboard Stat Cards - Remove 5 Conversation Limit
**Priority**: P2
**Effort**: 10 minutes
**File**: `frontend/src/pages/Dashboard.tsx`
**Change**: Remove `.limit(5)` from queries

### 12. Conversations Filter Button Implementation
**Priority**: P2
**Effort**: 1 hour
**File**: `frontend/src/pages/Conversations.tsx`
**Features**: Filter by status, channel, date range

### 13. Conversations Info Panel Implementation
**Priority**: P2
**Effort**: 1 hour
**File**: `frontend/src/pages/Conversations.tsx`
**Features**: Customer details, tags, conversation history

---

## 🔵 Low Priority Features (Future)

### 14. Webchat Widget
**Priority**: P3
**Effort**: 4 hours
**Files**:
- `frontend/src/components/WebchatWidget.tsx` - NEW
- `backend/src/routes/webchat.ts` - NEW
**Features**: Embeddable chat widget for websites

---

## Implementation Plan

### Phase 1: Critical Security (Day 1 - 1 hour)
1. ✅ Wire business access middleware
2. ✅ Move Meta tokens to environment
3. ✅ Add webhook rate limiting

### Phase 2: High Priority Features (Day 2 - 3 hours)
4. ✅ Fix InMemoryQueue processor
5. ✅ Template variable substitution
6. ✅ Conversation assignment

### Phase 3: Medium Priority (Week 2 - 8 hours)
7. ✅ Email delivery
8. ✅ Browser notifications
9. ✅ Analytics optimization
10. ✅ Dashboard improvements
11. ✅ Filter & info panels

### Phase 4: Future Enhancements (Backlog)
12. ⏳ Webchat widget
13. ⏳ Advanced analytics
14. ⏳ Multi-language support

---

## Quick Wins (Can Do Now - 30 minutes total)

### 1. Add HEALTHCHECK (Already Done ✅)
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

### 2. Fix InMemoryQueue
```typescript
class InMemoryQueue<T> {
  async add(_name: string, data: T, _opts?: JobsOptions) {
    const id = `dev-${this.name}-${Date.now()}`;
    const job = { id, data, status: 'completed' };
    
    // ✅ FIX: Actually call the processor
    if (this.processor) {
      setTimeout(async () => {
        try {
          await this.processor({ id, data } as any);
          logger.info({ queue: this.name, job_id: id }, 'In-memory job completed');
        } catch (err) {
          logger.error({ queue: this.name, job_id: id, error: (err as Error).message }, 'In-memory job failed');
        }
      }, 100);
    }
    
    return job;
  }
}
```

### 3. Add Webhook Rate Limiting
```typescript
webhookRouter.post('/:channel',
  rateLimiter({ windowMs: 60000, maxRequests: 100, keyPrefix: 'rl_webhook' }),
  verifyAnyWebhookSignature,
  validateBody(WebhookSchema),
  enqueueWebhookJob
);
```

### 4. Remove Dashboard Limit
```typescript
// frontend/src/pages/Dashboard.tsx
const q = query(
  collection(db, `businesses/${businessId}/conversations`),
  orderBy('updatedAt', 'desc')
  // ✅ Remove: limit(5)
);
```

---

## Testing Checklist

### Security Testing
- [ ] Try accessing another business's data (should fail with 403)
- [ ] Try webhook without signature (should fail with 401)
- [ ] Try webhook with invalid signature (should fail with 401)
- [ ] Verify Meta webhook signature works
- [ ] Verify custom webhook signature works
- [ ] Check Redis TLS in production
- [ ] Verify Firestore rules block unauthorized access

### Feature Testing
- [ ] InMemoryQueue processes jobs in development
- [ ] Template variables are substituted in broadcasts
- [ ] Conversations can be assigned to agents
- [ ] Email invites are sent
- [ ] Browser notifications appear on escalation
- [ ] Analytics loads from stats collection
- [ ] Dashboard shows all conversations
- [ ] Filter button works
- [ ] Info panel shows customer details

---

## Deployment Readiness

### Before Staging
- [x] Redis version issue fixed
- [x] 4 critical bugs fixed
- [x] Docker deployment ready
- [ ] Security middleware wired
- [ ] Meta tokens secured
- [ ] Webhook rate limiting added

### Before Production
- [ ] All P0 security items complete
- [ ] All P1 features complete
- [ ] Penetration testing done
- [ ] Load testing done
- [ ] Backup/restore tested
- [ ] Monitoring/alerting configured
- [ ] Incident response plan documented

---

## Current Status Summary

### ✅ Completed
- Redis version compatibility
- 4 critical bugs (broadcast, AI, status, agent messages)
- Docker & docker-compose
- Comprehensive documentation
- Meta webhook signature support
- Business access middleware (created)
- Frontend API key removed
- Redis TLS validation
- Firestore stats rules

### 🚧 In Progress
- Wiring business access middleware to routes
- Moving Meta tokens to environment
- Adding webhook rate limiting

### ⏳ Pending
- InMemoryQueue processor fix
- Template variable substitution
- Conversation assignment
- Email delivery
- Browser notifications
- Analytics optimization
- UI improvements (filter, info panel)
- Webchat widget

---

## Time Estimates

| Phase | Items | Effort | Priority |
|-------|-------|--------|----------|
| Security Fixes | 3 | 1 hour | P0 |
| High Priority | 4 | 3 hours | P1 |
| Medium Priority | 7 | 8 hours | P2 |
| Low Priority | 1 | 4 hours | P3 |
| **Total** | **15** | **16 hours** | - |

---

## Next Actions

1. **Immediate** (30 min): Implement 3 quick wins
2. **Today** (1 hour): Complete P0 security fixes
3. **This Week** (3 hours): Complete P1 features
4. **Next Week** (8 hours): Complete P2 features
5. **Backlog**: P3 features as needed

---

**Recommendation**: Focus on P0 security items first, then P1 features. P2 and P3 can be done iteratively based on user feedback.
