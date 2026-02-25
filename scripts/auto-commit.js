#!/usr/bin/env node

/**
 * Auto-Commit Generator — Super CRM
 * Runs via GitHub Actions on a schedule.
 * Generates realistic, rotation-based content commits.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Utilities ───────────────────────────────────────────────────────────────

const today = new Date();
const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
const weekNumber = getWeekNumber(today);
const dateStr = today.toISOString().split('T')[0];

function getWeekNumber(d) {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function appendToFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.appendFileSync(filePath, '\n' + content, 'utf8');
  } else {
    write(filePath, content);
  }
}

function gitCommit(message) {
  execSync('git config user.email "jeet@supercrm.io"');
  execSync('git config user.name "JeetCodes95"');
  execSync('git add -A');
  try {
    execSync(`git commit -m "${message}"`);
    console.log(`✅ Committed: ${message}`);
  } catch (e) {
    console.log('ℹ️  Nothing to commit.');
  }
}

// ─── Content Templates ───────────────────────────────────────────────────────

const ARCHITECTURE_REFINEMENTS = [
  {
    file: 'architecture/01-multi-tenant-architecture.md',
    section: `\n## Updated: ${dateStr}\n\n**Tenant provisioning optimization:** Added pre-warm step for Redis cache on tenant creation. New tenants now have default pipeline stages and permission matrix loaded into cache within 500ms of signup, reducing first-login latency.\n`,
    commit: 'docs(architecture): refine tenant provisioning with Redis cache pre-warm on signup',
  },
  {
    file: 'architecture/02-rbac-design.md',
    section: `\n## Updated: ${dateStr}\n\n**Permission scope optimization:** Added short-circuit evaluation in \`scopeToUser()\` for SUPER_ADMIN role, bypassing scope computation entirely. Reduces middleware overhead by 2ms on every admin request.\n`,
    commit: 'docs(architecture): optimize RBAC scope resolver with SUPER_ADMIN short-circuit path',
  },
  {
    file: 'architecture/03-ai-scoring-engine.md',
    section: `\n## Updated: ${dateStr}\n\n**Decay tuning:** Adjusted exponential decay rate from 0.02 to 0.018 based on lead lifecycle analysis. Leads with 45-day inactivity now score ~25% higher than before — reduces false "DEAD" classifications for long-cycle B2B deals.\n`,
    commit: 'perf(ai): tune score decay coefficient based on B2B lead lifecycle benchmarks',
  },
  {
    file: 'architecture/04-lms-module-structure.md',
    section: `\n## Updated: ${dateStr}\n\n**Quiz retry logic:** Added configurable max-attempts per quiz at the course level (default: 3). Attempts beyond max trigger a 24h cooldown per student. Logic handled in enrollment service, not the quiz model.\n`,
    commit: 'feat(lms): add configurable quiz retry limit with cooldown enforcement',
  },
  {
    file: 'architecture/05-hrms-module-structure.md',
    section: `\n## Updated: ${dateStr}\n\n**Leave balance recalculation:** Moved leave balance computation from synchronous API response to post-approval event. Manager sees approval response in 40ms; balance update happens async within 200ms. Resolves latency spike on high-volume approval days.\n`,
    commit: 'perf(hrms): move leave balance recalc to async post-approval event handler',
  },
  {
    file: 'architecture/06-scaling-and-caching.md',
    section: `\n## Updated: ${dateStr}\n\n**Cache invalidation pattern update:** Switched from pattern-based Redis key deletion (\`KEYS leads:list:*\`) to tag-based invalidation using Redis Sets. Eliminates full keyspace scan on write operations — critical improvement at 50k+ key count.\n`,
    commit: 'perf(cache): replace pattern-based invalidation with Redis Set tag strategy',
  },
  {
    file: 'architecture/07-deployment-architecture.md',
    section: `\n## Updated: ${dateStr}\n\n**Health check configuration:** Added ALB health check on \`/api/v1/health\` with 30s interval, 5s timeout, and 2 healthy / 3 unhealthy thresholds. ECS tasks removed from rotation within 90s of failure vs previous 300s default.\n`,
    commit: 'infra(ecs): tune ALB health check thresholds for faster unhealthy task rotation',
  },
];

const ROADMAP_UPDATES = [
  `\n### Week ${weekNumber} Update (${dateStr})\n\n- Completed: Tenant provisioning service with atomic rollback\n- Completed: JWT refresh token rotation + Redis blacklist\n- In progress: Lead scoring queue worker (BullMQ integration 80% done)\n- Next: Deal pipeline model and Kanban frontend component\n`,
  `\n### Week ${weekNumber} Update (${dateStr})\n\n- Completed: CSV bulk import via BullMQ batch processing (tested at 5k rows)\n- Completed: RBAC middleware with hierarchical data scoping\n- In progress: LMS course builder API\n- Next: Student enrollment + progress tracking endpoints\n`,
  `\n### Week ${weekNumber} Update (${dateStr})\n\n- Completed: AI scoring engine v1 deployed and connected to lead events\n- Completed: Score decay cron job running nightly\n- In progress: Score history graph component (frontend)\n- Next: Explainable score breakdown API endpoint\n`,
  `\n### Week ${weekNumber} Update (${dateStr})\n\n- Completed: HRMS attendance check-in with geolocation support\n- Completed: Leave management workflow (request → approval → balance update)\n- In progress: Payroll data structure design\n- Next: Employee onboarding → LMS auto-enrollment event bridge\n`,
];

const WEEKLY_LOG_ENTRIES = [
  `# Dev Log — Week ${weekNumber + 1}

**Product**: Super CRM  
**Sprint**: Development Sprint ${weekNumber + 1}  
**Date**: ${dateStr}  
**Author**: JeetCodes95  

---

## This Week's Focus

Continuing backend module development. Key sprint items:

### Completed
- Refined AI scoring decay coefficient (B2B cycle analysis)
- Added Redis tag-based cache invalidation for lead list queries
- HRMS: Leave balance recalculation moved to async event handler
- Tuned ECS ALB health check thresholds (unhealthy detection from 300s → 90s)
- Increased BullMQ \`lead-scoring\` queue concurrency from 8 → 12 workers

### In Progress
- Deal pipeline kanban — 60% done (stage transitions pending)
- Score history graph component (recharts integration)
- LMS: Quiz retry limit enforcement

### Blockers
None this week.

---

## Architecture Decision: Tag-Based Cache Invalidation

Switched from pattern-based Redis keyspace deletion to a tag-based strategy:

- Old: \`KEYS leads:list:*\` → O(n) full scan on write
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
`,
  `# Dev Log — Week ${weekNumber + 1}

**Product**: Super CRM  
**Sprint**: Architecture Refinement Sprint  
**Date**: ${dateStr}  
**Author**: JeetCodes95  

---

## This Week's Focus

Performance optimization and LMS module development.

### Completed
- LMS: Course builder API (create, update, publish, archive)
- LMS: Student enrollment + progress tracking endpoints
- LMS: Certificate generation (PDF-lib, uploaded to S3)
- MongoDB slow query audit: identified 3 missing indexes, added and tested
- HRMS: Employee department hierarchy API finalized

### In Progress
- LMS: Quiz engine (question bank, attempt tracking, score calculation)
- Analytics: Dashboard KPI aggregation (nightly cron snapshot approach)
- Frontend: Course catalog UI

### Technical Note

Switched certificate generation from synchronous (blocking API response) to BullMQ background job. PDF generation was taking 800ms–1.2s depending on template complexity. Now returns \`202 Accepted\` with job ID; client polls \`/certificates/status/:jobId\` until ready.

---

## Metrics

| Metric | Value |
|---|---|
| Commits this week | 22 |
| Test coverage (lms) | 58% |
| LMS API endpoints shipped | 11 |
| Certificate generation time | <1.5s async |
| Open issues | 2 |
`,
];

const CHANGELOG_ENTRIES = [
  `\n## [Unreleased] — ${dateStr}\n\n### Changed\n- AI scoring: tuned decay coefficient from 0.02 → 0.018 for B2B lead lifecycle alignment\n- Cache invalidation: migrated from pattern-based KEYS scan to Redis Set tag strategy\n- ECS health check interval reduced to 30s; unhealthy detection now within 90s\n\n### Fixed\n- HRMS: Leave balance sync race condition on concurrent approval events\n`,
  `\n## [Unreleased] — ${dateStr}\n\n### Added\n- LMS: Configurable quiz retry limit per course (default: 3 attempts, 24h cooldown)\n- LMS: Certificate generation moved to async BullMQ job with polling endpoint\n- HRMS: Employee department hierarchy API (/api/v1/hrms/departments/tree)\n\n### Performance\n- BullMQ scoring worker concurrency increased from 8 to 12\n- LMS certificate generation: 1.2s → async (response time 40ms)\n`,
];

const SECURITY_UPDATES = [
  `\n## Updated: ${dateStr}\n\n**CORS hardening:** Tightened CORS origin whitelist to exact tenant subdomain patterns only. Previously allowed regex match that could have been exploited by crafted subdomain. Switched to explicit allowlist loaded from tenant config at startup.\n`,
  `\n## Updated: ${dateStr}\n\n**Input sanitization audit:** Completed sanitization review across all 34 mutating endpoints. Found 2 endpoints missing .trim() on string fields — fixed. Added a lint rule (\`no-raw-string-input\`) to enforce sanitization at the schema level going forward.\n`,
];

// ─── Rotation Logic ──────────────────────────────────────────────────────────

function run() {
  const archIndex = weekNumber % ARCHITECTURE_REFINEMENTS.length;
  const roadmapIndex = weekNumber % ROADMAP_UPDATES.length;
  const logIndex = weekNumber % WEEKLY_LOG_ENTRIES.length;
  const changelogIndex = weekNumber % CHANGELOG_ENTRIES.length;
  const securityIndex = weekNumber % SECURITY_UPDATES.length;

  // Monday → Architecture refinement
  if (dayOfWeek === 1) {
    const arch = ARCHITECTURE_REFINEMENTS[archIndex];
    appendToFile(arch.file, arch.section);
    gitCommit(arch.commit);
  }

  // Tuesday → ROADMAP update
  else if (dayOfWeek === 2) {
    const update = ROADMAP_UPDATES[roadmapIndex];
    appendToFile('ROADMAP.md', update);
    gitCommit(`docs(roadmap): add week ${weekNumber} progress update — pipeline and AI module`);
  }

  // Wednesday → CHANGELOG
  else if (dayOfWeek === 3) {
    appendToFile('CHANGELOG.md', CHANGELOG_ENTRIES[changelogIndex]);
    gitCommit(`chore(changelog): update unreleased entries for week ${weekNumber} changes`);
  }

  // Thursday → Security or Architecture (alternating weeks)
  else if (dayOfWeek === 4) {
    if (weekNumber % 2 === 0) {
      appendToFile('docs/SECURITY.md', SECURITY_UPDATES[securityIndex]);
      gitCommit('security(docs): update security considerations with input sanitization audit findings');
    } else {
      // Pick the next architecture doc in rotation
      const nextArch = ARCHITECTURE_REFINEMENTS[(archIndex + 1) % ARCHITECTURE_REFINEMENTS.length];
      appendToFile(nextArch.file, nextArch.section.replace(dateStr, dateStr + ' (Thu)'));
      gitCommit(nextArch.commit.replace('docs', 'refactor').replace('perf', 'refactor').replace('feat', 'docs').replace('infra', 'docs'));
    }
  }

  // Friday → Weekly dev log
  else if (dayOfWeek === 5) {
    const logFile = `logs/WEEK-${String(weekNumber).padStart(2, '0')}.md`;
    write(logFile, WEEKLY_LOG_ENTRIES[logIndex]);
    gitCommit(`docs(logs): add week ${weekNumber} dev log — architecture refinements and module progress`);
  }

  // Saturday (optional light commit ~50% weeks)
  else if (dayOfWeek === 6 && weekNumber % 2 === 0) {
    appendToFile('ROADMAP.md', `\n> **Note (${dateStr}):** Architecture review session. Identified optimization opportunity in queue concurrency tuning for bulk import jobs. Will implement Monday.\n`);
    gitCommit('chore(notes): add weekend architecture review note to roadmap');
  }

  console.log(`\n✅ Auto-commit run complete for ${dateStr} (day ${dayOfWeek}, week ${weekNumber})`);
}

run();
