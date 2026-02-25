# Super CRM — AI-Powered CRM + LMS + HRMS Platform

> **Unifying customer relationships, workforce operations, and learning systems under one intelligent engine.**

[![Build Status](https://img.shields.io/github/actions/workflow/status/JeetCodes95/super-crm/ci.yml?branch=main)](https://github.com/JeetCodes95/super-crm/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-alpha-orange)](CHANGELOG.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Vision

Most businesses run on disconnected systems — a separate CRM, a separate LMS, a separate HRMS — each generating data silos and operational friction.

**Super CRM eliminates that fragmentation.**

We're building a unified, AI-native platform where sales data informs HR decisions, course completion correlates with deal velocity, and every role — from founder to field agent — operates from a single, intelligent, context-aware dashboard.

This is not a feature addition to an existing tool. This is a rearchitected operating system for modern service businesses, agencies, and EdTech companies.

---

## Market Positioning

| Dimension | Legacy Tools | Super CRM |
|---|---|---|
| Architecture | Monolith / siloed | Multi-tenant microservices |
| AI Layer | Bolt-on | First-class, event-driven |
| Target | Enterprise (overpriced) | Mid-market, agencies, EdTech |
| Mobile | Web-only or afterthought | Native Admin + Employee + Student views |
| Pricing | Per-seat + addon hell | Modular SaaS subscriptions |

---

## Core Modules

### 🎯 CRM Engine
- Lead capture, qualification, and pipeline management
- Multi-stage deal tracking with custom stages
- AI lead scoring (behavioral + demographic signals)
- Activity timeline per contact
- Bulk import / CSV ingestion

### 🤖 AI Scoring Engine
- Real-time scoring on lead creation and update events
- Weighted model: engagement score + firmographic fit + activity recency
- Score decay algorithm for inactive leads
- Explainable score breakdown per lead

### 📚 LMS Module
- Course builder with video, document, and quiz modules
- Student enrollment, progress tracking, and completion certificates
- Instructor / student / admin role split
- Course completion → CRM signal pipeline

### 👥 HRMS Module
- Employee onboarding and profile management
- Department and hierarchy structure
- Attendance tracking (check-in / check-out via mobile)
- Leave management with approvals
- Payroll-ready data structure

### 📊 Role-Based Dashboards
- **Super Admin**: Platform health, tenant overview, billing status
- **Org Admin**: Team performance, pipeline health, HR overview
- **Manager**: Team deals, attendance, course completions
- **Agent / Employee**: Personal pipeline, tasks, attendance
- **Student**: Enrolled courses, progress, certificates

### 📱 Mobile App (React Native)
- Admin: Real-time pipeline and HR alerts
- Employee: Attendance, tasks, course access
- Student: Course consumption, quiz attempts, progress
- Offline-capable with background sync

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB Atlas (primary), Redis (cache + sessions) |
| Mobile | React Native (Expo managed + bare workflow) |
| AI/ML | Python microservice (FastAPI) — scoring + NLP |
| Queue | BullMQ + Redis |
| Storage | AWS S3 (media, certificates, documents) |
| Auth | JWT + refresh tokens, RBAC middleware |
| Infra | Docker, AWS ECS + ECR, Nginx, Vercel (frontend) |
| CI/CD | GitHub Actions |
| Monitoring | Sentry, Datadog APM |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  Next.js Web App       React Native Mobile App              │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS / WebSocket
┌────────────────────────────▼────────────────────────────────┐
│                   API Gateway (Nginx)                       │
│              Rate limiting, Auth validation                 │
└───────┬─────────────┬──────────────┬───────────────┬────────┘
        │             │              │               │
┌───────▼───┐  ┌──────▼──────┐  ┌───▼───────┐  ┌───▼───────┐
│ CRM API   │  │  LMS API    │  │ HRMS API  │  │  AI API   │
│ (Node/TS) │  │  (Node/TS)  │  │ (Node/TS) │  | (FastAPI) │
└───────┬───┘  └──────┬──────┘  └───┬───────┘  └───┬───────┘
        │             │              │               │
┌───────▼─────────────▼──────────────▼───────────────▼────────┐
│                    MongoDB Atlas (Multi-tenant)              │
│             Redis Cache    BullMQ Job Queues                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
super-crm/
├── backend/
│   ├── src/
│   │   ├── config/           # DB, Redis, env config
│   │   ├── modules/
│   │   │   ├── auth/         # JWT, RBAC middleware
│   │   │   ├── crm/          # Leads, Deals, Pipeline
│   │   │   ├── lms/          # Courses, Progress, Certs
│   │   │   ├── hrms/         # Employees, Attendance, Leave
│   │   │   └── ai/           # Scoring engine API client
│   │   ├── queues/           # BullMQ workers
│   │   ├── events/           # Event emitter patterns
│   │   ├── utils/
│   │   └── server.ts
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/
│   │   ├── dashboard/
│   │   ├── crm/
│   │   ├── lms/
│   │   └── hrms/
│   ├── components/
│   ├── lib/
│   └── Dockerfile
├── mobile/
│   ├── src/
│   │   ├── screens/
│   │   ├── navigation/
│   │   ├── store/            # Zustand
│   │   └── services/         # API + offline sync
│   └── app.json
├── ai-service/
│   ├── scoring/
│   ├── nlp/
│   └── main.py
├── architecture/
├── docker-compose.yml
├── .github/workflows/
├── ROADMAP.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas cluster
- Redis 7+
- Docker & Docker Compose

### Development Setup

```bash
git clone https://github.com/JeetCodes95/super-crm.git
cd super-crm

# Install all dependencies
npm install --workspaces

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Start infrastructure (MongoDB + Redis via Docker)
docker-compose up -d infrastructure

# Start development servers
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full 12-month execution plan.

**Current Phase**: Foundation & Core Architecture (Q1 2026)

| Phase | Timeline | Status |
|---|---|---|
| Core CRM Engine | M1–M2 | 🔄 In Progress |
| LMS Module | M3–M4 | 📋 Planned |
| HRMS Module | M3–M4 | 📋 Planned |
| AI Scoring v1 | M5 | 📋 Planned |
| Mobile App v1 | M7–M8 | 📋 Planned |
| Beta Launch | M10 | 📋 Planned |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We follow conventional commits and trunk-based development.

---

## License

MIT License — see [LICENSE](LICENSE)

---

*Built by [JeetCodes95](https://github.com/JeetCodes95) — AI SaaS Architect | MERN | Next.js | React Native*
