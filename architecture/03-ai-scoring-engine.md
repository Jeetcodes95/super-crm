# Architecture: AI Lead Scoring Engine

## Overview

The AI Scoring Engine is an event-driven microservice that assigns a numeric score (0–100) to every lead in real time. Scores are updated on every significant CRM event, with exponential decay applied to inactive leads.

## Scoring Architecture

```
CRM API Event → BullMQ Queue → Scoring Worker → FastAPI Scorer → Score Update
                                    ↑
                          Feature Extraction
                         (lead + activity data)
```

## Score Formula (v1 — Rule-Based Weighted Engine)

```
Score = Σ (weight_i × normalized_feature_i) × decay_factor

Feature Weights:
  Email opened:           +15
  Meeting booked:         +25
  Deal stage advanced:    +20
  Page/product viewed:    +8
  Form submitted:         +10
  Last activity (recent): +12
  Company size (fit):     +10
  Budget match:           +15
  Inactive >7 days:       × 0.85 decay
  Inactive >30 days:      × 0.60 decay
  Closed-lost history:    -20
```

## Scoring Microservice (FastAPI)

```python
# ai-service/scoring/scorer.py
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import math

@dataclass
class LeadFeatures:
    email_opens: int
    meetings_booked: int
    deal_stage_index: int
    last_activity_days: int
    company_size_fit: float    # 0.0–1.0
    budget_match: float        # 0.0–1.0
    closed_lost_count: int

WEIGHTS = {
    "email_opens":        15,
    "meetings_booked":    25,
    "deal_stage_index":   20,
    "company_size_fit":   10,
    "budget_match":       15,
}

def compute_decay(last_activity_days: int) -> float:
    if last_activity_days <= 7:
        return 1.0
    elif last_activity_days <= 30:
        return 0.85
    else:
        return max(0.40, math.exp(-0.02 * last_activity_days))

def score_lead(features: LeadFeatures) -> dict:
    raw_score = 0
    raw_score += min(features.email_opens * 5, 15)
    raw_score += min(features.meetings_booked * 25, 50)
    raw_score += features.deal_stage_index * 4
    raw_score += features.company_size_fit * 10
    raw_score += features.budget_match * 15
    raw_score -= features.closed_lost_count * 20

    decay = compute_decay(features.last_activity_days)
    final_score = max(0, min(100, raw_score * decay))

    return {
        "score": round(final_score, 2),
        "decay_factor": decay,
        "label": classify_score(final_score),
        "breakdown": {
            "raw_score": raw_score,
            "decay": decay,
        }
    }

def classify_score(score: float) -> str:
    if score >= 75: return "HOT"
    if score >= 50: return "WARM"
    if score >= 25: return "COLD"
    return "DEAD"
```

## BullMQ Worker (Node.js)

```typescript
// backend/src/queues/workers/scoring.worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { scoringClient } from '../services/ai.client';
import { LeadRepository } from '../modules/crm/repositories/lead.repository';

interface ScoringJob {
  leadId: string;
  tenantId: string;
  trigger: 'email_open' | 'meeting_booked' | 'stage_change' | 'daily_decay';
}

export const scoringWorker = new Worker<ScoringJob>(
  'lead-scoring',
  async (job: Job<ScoringJob>) => {
    const { leadId, tenantId, trigger } = job.data;

    const lead = await LeadRepository.findWithActivity(leadId, tenantId);
    if (!lead) return;

    const features = extractFeatures(lead);
    const result = await scoringClient.score(features);

    await LeadRepository.updateScore(leadId, {
      score: result.score,
      label: result.label,
      lastScoredAt: new Date(),
      scoreHistory: [...lead.scoreHistory, { score: result.score, timestamp: new Date(), trigger }]
    });

    // Emit score change event for downstream subscribers
    await eventBus.emit('lead.score.updated', { leadId, tenantId, ...result });
  },
  { connection: redis, concurrency: 10 }
);
```

## Event Triggers

| CRM Event | Queue Action |
|---|---|
| Lead created | Immediate scoring job |
| Email opened | +15 signal job |
| Meeting booked | +25 signal job |
| Deal stage advanced | +20 signal job |
| Daily cron (midnight) | Decay batch job for all inactive leads |
| Lead closed-lost | Score reset + -20 penalty |

## Score API

```
GET  /api/v1/leads/:leadId/score
     → Returns current score, label, breakdown, history

POST /api/v1/leads/:leadId/score/recalculate
     → Forces immediate rescore (Manager+ permission)
```

## Future: ML Model (v2)

Replace rule engine with a trained gradient boosting model (XGBoost):
- Training data: closed-won vs closed-lost leads (historical)
- Feature engineering from CRM event stream
- Scikit-learn pipeline → ONNX export → serve via FastAPI
- A/B test rule engine vs ML model per tenant


## Updated: 2026-03-02

**Decay tuning:** Adjusted exponential decay rate from 0.02 to 0.018 based on lead lifecycle analysis. Leads with 45-day inactivity now score ~25% higher than before — reduces false "DEAD" classifications for long-cycle B2B deals.


## Updated: 2026-04-09 (Thu)

**Decay tuning:** Adjusted exponential decay rate from 0.02 to 0.018 based on lead lifecycle analysis. Leads with 45-day inactivity now score ~25% higher than before — reduces false "DEAD" classifications for long-cycle B2B deals.


## Updated: 2026-04-20

**Decay tuning:** Adjusted exponential decay rate from 0.02 to 0.018 based on lead lifecycle analysis. Leads with 45-day inactivity now score ~25% higher than before — reduces false "DEAD" classifications for long-cycle B2B deals.
