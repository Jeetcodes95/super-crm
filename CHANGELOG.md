# Changelog

All notable changes to Super CRM are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- AI lead scoring engine v0.1 (rule-based, BullMQ-powered)
- Lead CRUD API with tenant-scoped repository pattern
- JWT authentication with refresh token rotation
- Redis-backed token blacklist for logout security
- RBAC middleware with 5-tier role hierarchy
- Multi-tenant architecture with `tenantId` scoping
- BullMQ job queue integration (scoring, email, bulk import)
- CSV bulk lead import via background job (500-row batches)
- FastAPI scoring microservice scaffold
- Daily score decay cron job
- GitHub Actions CI pipeline (lint, test, build)
- Docker Compose development environment
- Audit logging middleware

---

## [0.1.0-alpha] - 2026-02-28

### Added
- Initial repository scaffold
- Monorepo structure with npm workspaces (backend, frontend, mobile, ai-service)
- TypeScript strict configuration across all packages
- ESLint + Prettier + husky pre-commit hooks
- Architecture documentation (architecture/ folder)
- Backend blueprint and frontend architecture docs
- React Native mobile architecture design
- Security considerations documentation

---

*Super CRM is currently in active pre-alpha development.*


## [Unreleased] — 2026-02-25

### Changed
- AI scoring: tuned decay coefficient from 0.02 → 0.018 for B2B lead lifecycle alignment
- Cache invalidation: migrated from pattern-based KEYS scan to Redis Set tag strategy
- ECS health check interval reduced to 30s; unhealthy detection now within 90s

### Fixed
- HRMS: Leave balance sync race condition on concurrent approval events


## [Unreleased] — 2026-03-04

### Added
- LMS: Configurable quiz retry limit per course (default: 3 attempts, 24h cooldown)
- LMS: Certificate generation moved to async BullMQ job with polling endpoint
- HRMS: Employee department hierarchy API (/api/v1/hrms/departments/tree)

### Performance
- BullMQ scoring worker concurrency increased from 8 to 12
- LMS certificate generation: 1.2s → async (response time 40ms)


## [Unreleased] — 2026-03-11

### Changed
- AI scoring: tuned decay coefficient from 0.02 → 0.018 for B2B lead lifecycle alignment
- Cache invalidation: migrated from pattern-based KEYS scan to Redis Set tag strategy
- ECS health check interval reduced to 30s; unhealthy detection now within 90s

### Fixed
- HRMS: Leave balance sync race condition on concurrent approval events
