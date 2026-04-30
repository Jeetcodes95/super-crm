# Security Considerations: Super CRM

## Authentication & Authorization

### JWT Security
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry, stored in httpOnly cookies
- Refresh token rotation on every use (invalidate old token)
- Redis blacklist for revoked tokens (on logout or password change)

### Password Policy
- Minimum 8 characters, mixed case + number + symbol
- Bcrypt hashing (salt rounds: 12)
- Account lockout after 5 failed attempts (15-minute cooldown via Redis)
- Password reset via time-limited (10 min) signed URL

## API Security

### Input Validation
```typescript
// Every endpoint validates with Zod before processing
const createLeadSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  company: z.string().max(200).optional(),
});

// Middleware
export const validateBody = (schema: ZodSchema) =>
  (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) throw new ApiError(400, 'Validation failed', result.error.errors.map(e => e.message));
    req.body = result.data;
    next();
  };
```

### Rate Limiting
```typescript
// Per-tenant sliding window rate limit
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl',
  points: 100,           // requests
  duration: 60,          // per 60 seconds
  blockDuration: 120,    // block for 2 minutes if exceeded
});

// Per-IP for auth endpoints (stricter)
const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_auth',
  points: 10,
  duration: 900,         // 15 minutes
  blockDuration: 900,
});
```

### HTTP Security Headers (Helmet)
```typescript
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

## Data Security

### Tenant Isolation Enforcement
- Every MongoDB query **must** include `tenantId` — enforced by middleware, not by convention
- Integration tests validate cross-tenant data leakage scenarios

### Sensitive Data Handling
- PII fields (phone, email) are not logged in application logs
- All logs sanitized through a redaction filter
- S3 objects use server-side encryption (SSE-S3)
- MongoDB at-rest encryption enabled (Atlas)

### OWASP Top 10 Mitigations

| Attack | Mitigation |
|---|---|
| Injection | Zod validation + Mongoose parameterized queries |
| Broken Auth | JWT + refresh rotation + Redis blacklist |
| IDOR | Tenant scope middleware on every query |
| Security Misconfiguration | Helmet headers, no X-Powered-By, env validation |
| XSS | CSP headers + React's default escaping |
| SSRF | Whitelist for outbound HTTP calls |
| Sensitive Data Exposure | TLS everywhere + field-level encryption for PII |

## Mobile Security (React Native)
- Tokens stored in Expo SecureStore (Keychain on iOS, Keystore on Android)
- Certificate pinning for production API calls
- Biometric authentication before sensitive actions (payroll view)
- Root/jailbreak detection warning

## Compliance
- GDPR: data export + deletion APIs per user
- Data residency: region selection at tenant provisioning
- Audit logs: immutable, tenant-scoped, 365-day retention


## Updated: 2026-03-05

**CORS hardening:** Tightened CORS origin whitelist to exact tenant subdomain patterns only. Previously allowed regex match that could have been exploited by crafted subdomain. Switched to explicit allowlist loaded from tenant config at startup.


## Updated: 2026-03-19

**CORS hardening:** Tightened CORS origin whitelist to exact tenant subdomain patterns only. Previously allowed regex match that could have been exploited by crafted subdomain. Switched to explicit allowlist loaded from tenant config at startup.


## Updated: 2026-04-02

**CORS hardening:** Tightened CORS origin whitelist to exact tenant subdomain patterns only. Previously allowed regex match that could have been exploited by crafted subdomain. Switched to explicit allowlist loaded from tenant config at startup.


## Updated: 2026-04-16

**CORS hardening:** Tightened CORS origin whitelist to exact tenant subdomain patterns only. Previously allowed regex match that could have been exploited by crafted subdomain. Switched to explicit allowlist loaded from tenant config at startup.


## Updated: 2026-04-30

**CORS hardening:** Tightened CORS origin whitelist to exact tenant subdomain patterns only. Previously allowed regex match that could have been exploited by crafted subdomain. Switched to explicit allowlist loaded from tenant config at startup.
