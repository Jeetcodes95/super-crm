# Architecture: Scaling to 50k Users

## Target Performance Metrics

| Metric | Target |
|---|---|
| API P50 latency | <80ms |
| API P99 latency | <300ms |
| WebSocket connections | 10,000 concurrent |
| Throughput | 5,000 req/s peak |
| Availability | 99.9% SLA |
| Database query P99 | <50ms |
| Background job queue depth | <1,000 |

---

## Caching Strategy

### Redis Cache Layers

```
Layer 1 — Application Cache (Redis)
  TTL: 5–60 minutes
  Targets:
    - User session + JWT validation
    - Tenant configuration
    - Role permission matrix
    - Dashboard KPI aggregates
    - Course catalog (tenant-level)

Layer 2 — CDN Cache (CloudFront)
  TTL: 1 hour – 7 days
  Targets:
    - Static assets (JS, CSS, images)
    - Course video thumbnails
    - Certificate PDFs (once generated)
    - Public landing page

Layer 3 — MongoDB Query Cache
  - Covered indexes for all high-frequency queries
  - Avoid full collection scans
  - Atlas Search for text queries
```

### Cache Invalidation Pattern

```typescript
// Cache-aside pattern
async function getLead(leadId: string, tenantId: string) {
  const cacheKey = `lead:${tenantId}:${leadId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const lead = await Lead.findOne({ _id: leadId, tenantId }).lean();
  if (lead) await redis.setEx(cacheKey, 300, JSON.stringify(lead)); // 5 min TTL
  return lead;
}

// Invalidate on update
async function updateLead(leadId: string, tenantId: string, updates: Partial<Lead>) {
  await Lead.updateOne({ _id: leadId, tenantId }, updates);
  await redis.del(`lead:${tenantId}:${leadId}`);
  await redis.del(`leads:list:${tenantId}:*`);  // Pattern-based invalidation
}
```

---

## MongoDB Indexing Strategy

```javascript
// Leads Collection
db.leads.createIndex({ tenantId: 1, assignedTo: 1, status: 1 }); // Compound: agent view
db.leads.createIndex({ tenantId: 1, score: -1 });                  // AI score sorting
db.leads.createIndex({ tenantId: 1, createdAt: -1 });              // Recency
db.leads.createIndex({ tenantId: 1, email: 1 }, { unique: true }); // Dedup

// Attendance Collection
db.attendance.createIndex({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });

// Enrollments Collection
db.enrollments.createIndex({ tenantId: 1, userId: 1, courseId: 1 }, { unique: true });
db.enrollments.createIndex({ courseId: 1, progress: 1 });

// Audit Logs — TTL Index (auto-delete after 365 days)
db.audit_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
```

---

## Queue-Based Processing

### BullMQ Queue Architecture

```
Queues:
  high-priority:     Scoring jobs, webhook processing
  standard:          Email sends, PDF generation
  bulk:              CSV imports, batch score decay
  low-priority:      Analytics aggregation, report exports

Workers Per Queue:
  high-priority:     10 concurrent workers
  standard:          5 concurrent workers
  bulk:              2 concurrent workers (rate-limited)
  low-priority:      2 concurrent workers
```

### Retry + Dead Letter

```typescript
const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400, count: 1000 },  // Keep 24h
    removeOnFail: false,    // Keep failed jobs for inspection
  },
};

// Dead letter queue
export const dlqWorker = new Worker('dlq', async (job) => {
  await ErrorReport.create({
    queue: job.queue.name,
    jobId: job.id,
    data: job.data,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
  });
  await alertOpsTeam(job);
}, { connection: redis });
```

---

## Horizontal Scaling Architecture

```
Internet
    │
    ▼
[AWS CloudFront CDN]
    │
    ▼
[Application Load Balancer]
    │
    ├──▶ [ECS Fargate: Next.js Frontend]  ×3 pods, auto-scale
    │
    ├──▶ [ECS Fargate: Node API]          ×3–10 pods, auto-scale
    │
    ├──▶ [ECS Fargate: BullMQ Workers]    ×2–5 pods, auto-scale
    │
    └──▶ [ECS Fargate: AI Scoring API]    ×2 pods, fixed
         (Python FastAPI)
    │
    ▼
[MongoDB Atlas M30+]   [Redis ElastiCache r6g.large]
[AWS S3]               [AWS SES (email)]
```

## Auto-scaling Policy

```yaml
# ECS Service Auto Scaling
TargetTrackingScaling:
  Metric: ALBRequestCountPerTarget
  TargetValue: 1000      # Scale out when >1000 req/target
  ScaleOutCooldown: 60   # seconds
  ScaleInCooldown: 300   # seconds

MinCapacity: 2
MaxCapacity: 20
```


## Updated: 2026-03-12 (Thu)

**Cache invalidation pattern update:** Switched from pattern-based Redis key deletion (`KEYS leads:list:*`) to tag-based invalidation using Redis Sets. Eliminates full keyspace scan on write operations — critical improvement at 50k+ key count.
