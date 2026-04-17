# Dev Log — Week 17

**Product**: Super CRM  
**Sprint**: Development Sprint 17  
**Date**: 2026-04-17  
**Author**: JeetCodes95  

---

## This Week's Focus

Continuing backend module development. Key sprint items:

### Completed
- Refined AI scoring decay coefficient (B2B cycle analysis)
- Added Redis tag-based cache invalidation for lead list queries
- HRMS: Leave balance recalculation moved to async event handler
- Tuned ECS ALB health check thresholds (unhealthy detection from 300s → 90s)
- Increased BullMQ `lead-scoring` queue concurrency from 8 → 12 workers

### In Progress
- Deal pipeline kanban — 60% done (stage transitions pending)
- Score history graph component (recharts integration)
- LMS: Quiz retry limit enforcement

### Blockers
None this week.

---

## Architecture Decision: Tag-Based Cache Invalidation

Switched from pattern-based Redis keyspace deletion to a tag-based strategy:

- Old: `KEYS leads:list:*` → O(n) full scan on write
- New: Maintain a Redis Set per tenant with all related cache keys → O(1) tag lookup

At 10k+ Redis keys per tenant, the old pattern was adding 30ms latency on every lead update. New approach keeps invalidation under 2ms regardless of key count.

---

## Metrics

| Metric | Value |
|---|---|
| Commits this week | 18 |
| Test coverage (crm) | 71% |
| API P95 latency | 88ms |
| Queue depth (avg) | 12 jobs |
| Open issues | 3 |
