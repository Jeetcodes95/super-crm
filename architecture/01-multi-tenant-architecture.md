# Architecture: Multi-Tenant SaaS Design

## Tenancy Model

Super CRM uses a **shared-database, tenant-isolated** model with `tenantId` field on every document. This balances cost efficiency at scale with logical data isolation.

```
Database: supercrm_db
├── Collection: tenants          # Tenant registry
├── Collection: users            # tenantId + userId + role
├── Collection: leads            # tenantId scoped
├── Collection: deals            # tenantId scoped
├── Collection: courses          # tenantId scoped
├── Collection: employees        # tenantId scoped
└── Collection: audit_logs       # tenantId scoped
```

## Tenant Isolation Pattern

Every MongoDB query is scoped through a middleware-injected tenant context:

```typescript
// Middleware: tenant context injection
export const tenantMiddleware = async (req, res, next) => {
  const tenantId = req.user.tenantId; // decoded from JWT
  req.tenantId = tenantId;
  next();
};

// Repository pattern enforcing tenant scope
class LeadRepository {
  async findAll(tenantId: string, filters: LeadFilters) {
    return Lead.find({ tenantId, ...filters })
      .lean()
      .exec();
  }
}
```

## Tenant Tiers

| Tier | Users | Storage | AI Calls/Month | Price |
|---|---|---|---|---|
| Starter | Up to 10 | 5 GB | 5,000 | $49/mo |
| Growth | Up to 50 | 25 GB | 25,000 | $149/mo |
| Scale | Up to 200 | 100 GB | 100,000 | $399/mo |
| Enterprise | Unlimited | Custom | Unlimited | Custom |

## Subdomain Routing

Each tenant gets a subdomain:
```
acme-corp.supercrm.io     → tenantId: "acme-corp"
blueskies.supercrm.io     → tenantId: "blueskies"
```

## Tenant Provisioning Flow

```
POST /api/v1/auth/register-org
  → Create tenant document
  → Create org-admin user
  → Provision default pipeline stages
  → Provision default LMS categories
  → Send welcome email (job queue)
  → Return JWT + tenant metadata
```

## Data Migration Strategy

For tenants requiring dedicated infrastructure (Enterprise):
- MongoDB Atlas Project isolation
- Separate Redis namespace
- Custom domain + SSL
- Dedicated BullMQ queue namespace

## Scaling Considerations

- MongoDB TTL indexes on session and cache collections
- Connection pooling per service (min: 5, max: 50 per pod)
- Tenant-level rate limiting via Redis sliding window
- Horizontal scaling: stateless API pods behind Nginx load balancer


## Updated: 2026-03-26 (Thu)

**Tenant provisioning optimization:** Added pre-warm step for Redis cache on tenant creation. New tenants now have default pipeline stages and permission matrix loaded into cache within 500ms of signup, reducing first-login latency.


## Updated: 2026-04-06

**Tenant provisioning optimization:** Added pre-warm step for Redis cache on tenant creation. New tenants now have default pipeline stages and permission matrix loaded into cache within 500ms of signup, reducing first-login latency.
