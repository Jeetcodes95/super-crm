# Backend Blueprint: Super CRM API

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts        # MongoDB connection
│   │   ├── redis.ts           # Redis client
│   │   ├── env.ts             # Zod env validation
│   │   └── constants.ts
│   ├── middleware/
│   │   ├── authenticate.ts    # JWT validation
│   │   ├── authorize.ts       # RBAC enforcement
│   │   ├── tenantScope.ts     # Inject tenantId
│   │   ├── rateLimiter.ts     # Redis sliding window
│   │   ├── errorHandler.ts    # Global error handler
│   │   └── requestLogger.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schema.ts   # Zod validation schemas
│   │   ├── crm/
│   │   │   ├── leads/
│   │   │   │   ├── lead.model.ts
│   │   │   │   ├── lead.controller.ts
│   │   │   │   ├── lead.service.ts
│   │   │   │   ├── lead.repository.ts
│   │   │   │   └── lead.routes.ts
│   │   │   ├── deals/
│   │   │   ├── pipeline/
│   │   │   └── activities/
│   │   ├── lms/
│   │   │   ├── courses/
│   │   │   ├── enrollments/
│   │   │   └── certificates/
│   │   ├── hrms/
│   │   │   ├── employees/
│   │   │   ├── attendance/
│   │   │   └── leaves/
│   │   └── analytics/
│   ├── queues/
│   │   ├── queues.ts          # Queue definitions
│   │   ├── producers/         # Job creators
│   │   └── workers/           # Job processors
│   ├── events/
│   │   ├── eventBus.ts        # EventEmitter wrapper
│   │   └── listeners/         # Cross-module event handlers
│   ├── utils/
│   │   ├── ApiError.ts
│   │   ├── ApiResponse.ts
│   │   ├── asyncHandler.ts
│   │   ├── pagination.ts
│   │   └── jwt.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── .env.example
├── Dockerfile
└── package.json
```

## Core Patterns

### Response Wrapper
```typescript
export class ApiResponse<T> {
  constructor(
    public statusCode: number,
    public data: T,
    public message: string = 'Success',
    public pagination?: PaginationMeta
  ) {}
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors: string[] = []
  ) {
    super(message);
  }
}
```

### Repository Pattern
```typescript
export class LeadRepository {
  async findAll(scope: QueryScope, filters: LeadFilters, pagination: PaginationParams) {
    const query = { ...scope, ...buildFilters(filters) };
    const [data, total] = await Promise.all([
      Lead.find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.offset)
        .limit(pagination.limit)
        .lean(),
      Lead.countDocuments(query),
    ]);
    return { data, total };
  }

  async create(tenantId: string, payload: CreateLeadDto) {
    return Lead.create({ tenantId, ...payload });
  }

  async updateScore(leadId: string, scoreData: ScoreUpdate) {
    return Lead.findByIdAndUpdate(leadId, { $set: scoreData, $push: { scoreHistory: { $each: [scoreData.history], $slice: -20 } } });
  }
}
```

### Async Handler
```typescript
export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

## Environment Variables
```env
# Server
NODE_ENV=development
PORT=4000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/supercrm
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Services
AI_SERVICE_URL=http://localhost:8000
AWS_REGION=ap-south-1
AWS_S3_BUCKET=supercrm-media
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Email
SES_FROM_EMAIL=noreply@supercrm.io
```
