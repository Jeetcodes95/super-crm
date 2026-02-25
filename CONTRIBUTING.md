# Contributing to Super CRM

Thank you for your interest in contributing. Super CRM is an active SaaS product — contributions should be production-grade.

---

## Development Process

We use **trunk-based development**:
- `main` — production-ready code, protected branch
- `develop` — integration branch
- Feature branches: `feat/description`, `fix/description`, `refactor/description`

## Setting Up the Environment

```bash
git clone https://github.com/JeetCodes95/super-crm.git
cd super-crm
npm install --workspaces
cp backend/.env.example backend/.env
docker-compose up -d infrastructure
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

why:
- Business or technical reason

impact:
- What this changes for users or system
```

**Types**: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `infra`, `security`, `chore`

**Examples:**
```
feat(crm): add AI score badge to lead card

why:
- Sales agents need immediate lead quality signal without opening detail view

impact:
- Visible score label next to each lead in list and kanban views
```

## Pull Request Requirements

- [ ] Branch created from `develop`
- [ ] PR title follows conventional commit format
- [ ] All existing tests pass: `npm run test --workspace=backend`
- [ ] New functionality has test coverage (minimum 60%)
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Lint clean: `npm run lint`
- [ ] PR description explains the **why**, not just the **what**

## Code Standards

- TypeScript strict mode — no `any` without justification
- All async functions use `asyncHandler` wrapper
- All MongoDB queries **must** include `tenantId`
- API responses use `ApiResponse` + `ApiError` wrappers
- No direct `console.log` in production code — use the logger utility

## Security

If you find a security vulnerability, do **not** open a public issue.  
Email: security@supercrm.io (PGP key in SECURITY.md)

---

*Super CRM — Built by practitioners, for practitioners.*
