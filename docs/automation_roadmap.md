# Project Beacon — Automation Roadmap & Tracker

> **Status:** Living document | Last updated: 2026-05-28
> **Scope:** Tracks all planned automations for Project Beacon — purpose, build order, dependencies, tool choices, risks, review requirements, and data contracts.
> **Constraint:** No application code, no migrations, no Supabase changes, no RLS changes, no modifications to existing product behavior.

---

## Table of Contents

1. [Build Order Overview](#build-order-overview)
2. [Automation Lane Details](#automation-lane-details)
3. [Data Contracts](#data-contracts)
4. [30/60/90-Day Roadmap](#306090-day-roadmap)
5. [Risks & Guardrails](#risks--guardrails)
6. [Metrics to Track](#metrics-to-track)
7. [Future Dashboard Vision](#future-dashboard-vision)
8. [Suggested npm Commands](#suggested-npm-commands)

---

## Build Order Overview

| # | Automation | Status | Owner | Target Window |
|---|-----------|--------|-------|---------------|
| 1 | Automation roadmap / tracker | ✅ Done | Herman | Day 0 |
| 2 | Link freshness checker v1 | 🔲 Not started | — | Days 1–15 |
| 3 | Raw source capture contract | 🔲 Not started | — | Days 10–20 |
| 4 | Parser output contract | 🔲 Not started | — | Days 15–25 |
| 5 | Manual capture CLI / form | 🔲 Not started | — | Days 20–30 |
| 6 | Resource parser MVP | 🔲 Not started | — | Days 31–45 |
| 7 | Taxonomy validator | 🔲 Not started | — | Days 40–55 |
| 8 | Draft review dashboard | 🔲 Not started | — | Days 50–70 |
| 9 | Draft importer | 🔲 Not started | — | Days 60–75 |
| 10 | Implementation guide recommender | 🔲 Not started | — | Days 70–85 |
| 11 | Implementation guide draft builder | 🔲 Not started | — | Days 80–90 |

**Status key:** ✅ Done · 🟡 In progress · 🔲 Not started · ⛔ Blocked · 🔍 In review

---

## Automation Lane Details

---

### 1. Automation Roadmap / Tracker

| Field | Value |
|-------|-------|
| **Purpose** | Single source of truth for all planned automations. Tracks status, dependencies, risks, and build order. |
| **Tool** | Markdown (this file) |
| **Depends on** | Nothing — this is the entry point |
| **Review required** | Herman sign-off before any downstream automation begins |
| **Output** | `docs/automation_roadmap.md` |

**Notes:** Update this file whenever an automation status changes or a dependency is resolved.

---

### 2. Link Freshness Checker v1

| Field | Value |
|-------|-------|
| **Purpose** | Verify that all resource URLs stored in Beacon are still reachable and classify their current state. Prevents stale or broken links from surfacing to end users. |
| **Tool** | Node.js script (no framework) · `node-fetch` or native `fetch` (Node 18+) · optionally `p-limit` for concurrency control |
| **Depends on** | Access to resource URL list (manual export or read-only DB query) |
| **Review required** | Human review of all `needs_manual_review` results before any record is updated |
| **Output** | JSON report (see [Parser Output Contract](#4-parser-output-contract)) |

**Deterministic Statuses:**

| Status | Meaning |
|--------|---------|
| `ok` | HTTP 200 received, URL is live and reachable |
| `redirect` | HTTP 301/302 — destination may have moved permanently |
| `client_error` | HTTP 4xx — bad request, not found, unauthorized, etc. |
| `server_error` | HTTP 5xx — upstream server error |
| `unreachable` | Network-level failure: DNS, timeout, ECONNREFUSED |
| `insecure` | HTTP (not HTTPS) or expired/invalid TLS certificate |
| `needs_manual_review` | Ambiguous response, bot-detection suspected, unusual headers, or non-standard status code |

**Guardrails:**
- Never write back to the database in v1; output is read-only report only
- Cap concurrency to ≤ 5 simultaneous requests to avoid rate-limiting
- Respect `robots.txt` where detectable
- Log raw HTTP status code alongside the deterministic status for auditability
- All `needs_manual_review` items require a human decision before any downstream action

---

### 3. Raw Source Capture Contract

| Field | Value |
|-------|-------|
| **Purpose** | Define the exact shape of a "captured source" — the raw input before any parsing. Ensures all capture methods (manual form, CLI, browser extension) produce a consistent record. |
| **Tool** | JSON Schema (draft-07 or later) |
| **Depends on** | Roadmap (this doc) |
| **Review required** | Herman review before any parser is built against it |
| **Output** | `docs/contracts/raw_source.schema.json` |

**Draft Field List:**

```
url             string, required
captured_at     ISO 8601 datetime, required
capture_method  enum: manual | cli | extension | import
raw_html        string, optional (full page HTML if available)
page_title      string, optional
og_title        string, optional
og_description  string, optional
canonical_url   string, optional
notes           string, optional (human annotation at capture time)
captured_by     string, optional (user identifier)
```

---

### 4. Parser Output Contract

| Field | Value |
|-------|-------|
| **Purpose** | Define the exact shape of a parsed resource record — the normalized output after the resource parser runs. All downstream consumers (taxonomy validator, draft importer, recommender) read this shape. |
| **Tool** | JSON Schema (draft-07 or later) |
| **Depends on** | Raw source capture contract (#3) |
| **Review required** | Herman review before resource parser is built |
| **Output** | `docs/contracts/parser_output.schema.json` |

**Draft Field List:**

```
id                  uuid, generated
source_url          string
title               string
description         string
resource_type       enum (see taxonomy)
primary_tags        string[]
secondary_tags      string[]
confidence_score    float 0.0–1.0 (parser confidence in classification)
parse_method        enum: auto | manual | hybrid
parsed_at           ISO 8601 datetime
flagged_for_review  boolean
review_reason       string, optional
raw_source_id       uuid, reference to raw source record
```

---

### 5. Manual Capture CLI / Form

| Field | Value |
|-------|-------|
| **Purpose** | Allow a human to manually capture a resource when automated scraping is blocked, ambiguous, or not yet available. Produces a valid raw source record. |
| **Tool** | Node.js CLI (`prompts` or `enquirer`) or simple HTML form (no backend change) |
| **Depends on** | Raw source capture contract (#3) |
| **Review required** | No automated review — human input is the review |
| **Output** | Raw source JSON conforming to the capture contract |

**Notes:** This lane exists as a fallback and as the primary input method before the parser is built. It must validate against the raw source schema before writing any file.

---

### 6. Resource Parser MVP

| Field | Value |
|-------|-------|
| **Purpose** | Transform a raw source capture into a normalized parser output record. Extracts title, description, resource type, and initial tags using rule-based heuristics (not ML) in v1. |
| **Tool** | Node.js · `cheerio` for HTML parsing · JSON Schema validator (`ajv`) for output validation |
| **Depends on** | Raw source capture contract (#3) · Parser output contract (#4) · Manual capture CLI (#5) |
| **Review required** | All records with `confidence_score < 0.7` or `flagged_for_review: true` go to human review queue |
| **Output** | Parser output JSON per record + a batch summary report |

**MVP scope:** Rule-based only. No ML. No third-party AI API calls. Heuristics defined in a config file so they can be updated without touching core logic.

---

### 7. Taxonomy Validator

| Field | Value |
|-------|-------|
| **Purpose** | Verify that tags and resource_type values in a parser output record match the approved Beacon taxonomy. Flag or reject records that use out-of-vocabulary terms. |
| **Tool** | Node.js script · taxonomy defined in `docs/taxonomy.json` (source of truth) |
| **Depends on** | Parser output contract (#4) · Resource parser MVP (#6) |
| **Review required** | All records with unknown tags routed to human review before taxonomy is extended |
| **Output** | Validation report: valid / invalid / warnings per record |

**Guardrails:**
- Taxonomy file is append-only by automation; terms are never removed automatically
- New terms must be manually approved and added to `docs/taxonomy.json` before the validator accepts them

---

### 8. Draft Review Dashboard

| Field | Value |
|-------|-------|
| **Purpose** | Surface all records flagged for human review in one place. Shows link check status, parser confidence, taxonomy warnings, and review reason. Enables efficient human triage without touching the database. |
| **Tool** | Static HTML report generated from JSON · or a local dev server (no production deploy) |
| **Depends on** | Link freshness checker (#2) · Resource parser MVP (#6) · Taxonomy validator (#7) |
| **Review required** | Herman approves dashboard layout before it becomes the canonical review surface |
| **Output** | `reports/draft_review_[date].html` (or JSON consumed by a local viewer) |

**Fields shown per record:**
- URL + link status
- Title + description (parsed)
- Resource type + tags
- Confidence score
- Flags / review reason
- Approve / reject / edit actions (local only, no DB write)

---

### 9. Draft Importer

| Field | Value |
|-------|-------|
| **Purpose** | Take human-approved records from the review dashboard and prepare them for import into Beacon's data layer. Produces a validated, ready-to-import payload — but does NOT execute the import automatically. |
| **Tool** | Node.js script · validates output against parser output contract before producing payload |
| **Depends on** | Draft review dashboard (#8) · Parser output contract (#4) |
| **Review required** | Final human confirmation required before any payload is handed off for import |
| **Output** | `imports/ready_[date].json` — import-ready payload in Beacon's expected format |

**Guardrails:**
- Script is dry-run by default; `--commit` flag required to produce final payload
- Payload is never applied directly by the script; a human applies it
- Rejected or un-reviewed records are never included in the payload

---

### 10. Implementation Guide Recommender

| Field | Value |
|-------|-------|
| **Purpose** | Given a set of imported resources, suggest which resources are strong candidates for an implementation guide. Uses tag density, resource type, and link health as signals. |
| **Tool** | Node.js · rule-based scoring (no ML in v1) |
| **Depends on** | Draft importer (#9) · Taxonomy validator (#7) |
| **Review required** | Recommendations are suggestions only; Herman decides which guides to build |
| **Output** | `reports/guide_candidates_[date].json` — ranked list with rationale per entry |

**Scoring signals (v1):**
- Tag count and tag specificity
- Resource type weight (tutorial > article > reference)
- Link health (ok > redirect > all others)
- Number of related resources already imported

---

### 11. Implementation Guide Draft Builder

| Field | Value |
|-------|-------|
| **Purpose** | Generate a structured first draft of an implementation guide from a set of recommended resources. Produces an outline + resource citations, not finished prose. |
| **Tool** | Node.js · Markdown output · template-driven (no AI in v1) |
| **Depends on** | Implementation guide recommender (#10) |
| **Review required** | All drafts require full Herman editorial review before publication |
| **Output** | `drafts/guide_[slug]_[date].md` — structured outline per guide |

**Draft sections generated:**
1. Title (from primary resource or manual input)
2. Goal statement (templated)
3. Prerequisites (from tag analysis)
4. Resource list (with title, URL, type, confidence score)
5. Suggested reading order
6. Open questions / gaps flagged by the parser

---

## Data Contracts

All contracts live in `docs/contracts/`. Schemas are JSON Schema draft-07.

| Contract | File | Status | Used By |
|----------|------|--------|---------|
| Raw source capture | `raw_source.schema.json` | 🔲 Not written | Manual capture CLI, parser |
| Parser output | `parser_output.schema.json` | 🔲 Not written | Taxonomy validator, dashboard, importer |
| Taxonomy | `taxonomy.json` | 🔲 Not written | Taxonomy validator, parser |
| Import payload | `import_payload.schema.json` | 🔲 Not written | Draft importer |
| Guide draft | `guide_draft.schema.json` | 🔲 Not written | Draft builder |

**Contract change rule:** Any change to a contract requires updating all automation lanes that consume it and re-running validation before the lane is used again.

---

## 30/60/90-Day Roadmap

### Days 1–30 — Foundation

**Goal:** Establish contracts and the core detection loop. No writes to production.

- [ ] Finalize and publish raw source capture contract
- [ ] Finalize and publish parser output contract
- [ ] Build and test link freshness checker v1 (report only)
- [ ] Build manual capture CLI / form
- [ ] Define initial taxonomy in `docs/taxonomy.json`
- [ ] Run link checker against existing resource URLs; review results with Herman

**Exit criteria:** Link checker produces a stable, auditable JSON report. Manual capture produces valid raw source records.

---

### Days 31–60 — Parsing & Validation

**Goal:** Automate the transformation from raw capture to validated, normalized record.

- [ ] Build resource parser MVP (rule-based, no ML)
- [ ] Build taxonomy validator
- [ ] Build draft review dashboard (local, static)
- [ ] Run parser on a batch of manually captured resources
- [ ] Human review session: triage flagged records via dashboard
- [ ] Refine heuristics based on review session findings

**Exit criteria:** Parser produces records with `confidence_score ≥ 0.7` on ≥ 80% of test inputs. Dashboard surfaces all flagged records without manual file inspection.

---

### Days 61–90 — Import & Recommendation

**Goal:** Move approved records toward import-readiness and surface guide opportunities.

- [ ] Build draft importer (dry-run default)
- [ ] Run first import-ready payload cycle; Herman approves and applies
- [ ] Build implementation guide recommender
- [ ] Build implementation guide draft builder
- [ ] Produce first guide draft for Herman review
- [ ] Retrospective: update this roadmap with lessons learned

**Exit criteria:** At least one import-ready payload produced and reviewed. At least one guide draft generated and reviewed by Herman.

---

## Risks & Guardrails

| Risk | Likelihood | Impact | Guardrail |
|------|-----------|--------|-----------|
| Link checker triggers rate limits or bot detection | Medium | Low | Cap concurrency ≤ 5; add `User-Agent` header; flag `needs_manual_review` instead of retrying |
| Parser misclassifies resource type | High in v1 | Medium | Confidence score + `flagged_for_review` field; human review queue before any import |
| Taxonomy drift (tags added ad-hoc) | Medium | High | Taxonomy file is append-only via automation; new terms require human approval |
| Contract schema changes break downstream lanes | Low | High | Version contracts; update all consumers before deploying schema change |
| Dashboard surfaces incomplete data | Medium | Low | Dashboard is read-only; no action taken from it writes to any system |
| Draft builder produces low-quality outlines | High in v1 | Low | Drafts are clearly labeled as AI-free first drafts; editorial review required |
| Import payload applied without review | Low | High | Dry-run default; `--commit` flag + human confirmation required |
| Scope creep into ML / AI tooling | Medium | Medium | v1 constraint: rule-based only. ML consideration deferred to post-day-90 retro |

---

## Metrics to Track

### Link Freshness Checker

| Metric | Target |
|--------|--------|
| % of URLs with status `ok` | Baseline on first run; improve over time |
| % flagged `needs_manual_review` | < 10% of total |
| Run duration (total batch) | < 5 minutes for ≤ 500 URLs |
| Time-to-resolution for flagged links | < 7 days |

### Resource Parser

| Metric | Target |
|--------|--------|
| % of records with `confidence_score ≥ 0.7` | ≥ 80% by end of day 60 |
| % flagged for human review | < 20% of total |
| Parse time per record | < 200ms |

### Review Dashboard

| Metric | Target |
|--------|--------|
| Time to clear review queue | < 2 hours per weekly session |
| % of flagged records approved on first review | ≥ 70% |

### Import Pipeline

| Metric | Target |
|--------|--------|
| Records imported per cycle | Tracked; no specific target in v1 |
| % of imports requiring post-import correction | < 5% |

### Guide Pipeline

| Metric | Target |
|--------|--------|
| Guides drafted per month | Tracked; no specific target in v1 |
| % of drafts approved without major restructure | Target ≥ 50% by day 90 |

---

## Future Dashboard Vision

> This section describes a post-day-90 concept. Nothing here is in scope for the current roadmap.

A unified Beacon Automation Dashboard would provide:

- **Live link health overview** — URL status distribution (ok / redirect / error / unreachable / insecure / review)
- **Parser throughput** — records processed, confidence distribution, review queue depth
- **Taxonomy health** — tag usage frequency, orphaned tags, pending new-term approvals
- **Import pipeline status** — drafts pending, approved, imported, rejected
- **Guide coverage map** — which topic clusters have guides, which are uncovered
- **Stale record alerts** — resources not re-checked in > 30 days
- **Activity log** — every automation run, with timestamps and outcome summaries

**Ideal implementation (future):** A local Next.js app reading from a `data/` directory of JSON reports, with no live database connection. Hosted locally or as a static export. No external dependencies.

---

## Suggested npm Commands

These are the command names to define in `package.json` scripts once each automation is built. Listed here so they can be reserved and kept consistent.

```json
{
  "scripts": {
    "beacon:check-links":     "node scripts/link-checker.js",
    "beacon:check-links:dry": "node scripts/link-checker.js --dry-run",
    "beacon:capture":         "node scripts/manual-capture.js",
    "beacon:parse":           "node scripts/resource-parser.js",
    "beacon:parse:batch":     "node scripts/resource-parser.js --batch",
    "beacon:validate-tags":   "node scripts/taxonomy-validator.js",
    "beacon:review":          "node scripts/generate-review-report.js",
    "beacon:import":          "node scripts/draft-importer.js",
    "beacon:import:commit":   "node scripts/draft-importer.js --commit",
    "beacon:recommend":       "node scripts/guide-recommender.js",
    "beacon:draft-guide":     "node scripts/guide-draft-builder.js"
  }
}
```

**Conventions:**
- All scripts are dry-run / read-only by default
- Destructive or write operations require an explicit flag (`--commit`, `--write`, `--apply`)
- All scripts output JSON reports to `reports/` or `drafts/` — never to stdout only
- All scripts accept `--verbose` for debug logging and `--help` for usage

---

## Directory Structure (Planned)

```
project-beacon/
├── docs/
│   ├── automation_roadmap.md       ← this file
│   └── contracts/
│       ├── raw_source.schema.json
│       ├── parser_output.schema.json
│       ├── import_payload.schema.json
│       ├── guide_draft.schema.json
│       └── taxonomy.json
├── scripts/
│   ├── link-checker.js
│   ├── manual-capture.js
│   ├── resource-parser.js
│   ├── taxonomy-validator.js
│   ├── generate-review-report.js
│   ├── draft-importer.js
│   ├── guide-recommender.js
│   └── guide-draft-builder.js
├── reports/
│   ├── link_check_[date].json
│   ├── draft_review_[date].html
│   └── guide_candidates_[date].json
├── drafts/
│   └── guide_[slug]_[date].md
└── imports/
    └── ready_[date].json
```

---

## Open Questions

- [ ] Where does the resource URL list come from for link checker v1? (Manual export? Read-only query? Flat file?)
- [ ] Is there an existing taxonomy or tag list to seed `taxonomy.json` from?
- [ ] What is the expected batch size for the parser MVP? (10s / 100s / 1000s of records?)
- [ ] Who besides Herman is in the review loop for flagged records?
- [ ] Is there a preferred import format for Beacon's data layer, or is that TBD?
- [ ] Should the draft builder support multiple output formats (Markdown, Notion, plain text)?

---

<!-- [DOWNLOAD THIS FILE AS: automation_roadmap.md] -->
