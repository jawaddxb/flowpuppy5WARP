# Agent Build — LOCKED_BACKLOG (v2.0)

> Authoritative spec: `/docs/agent-build-master.md`  
> Process rules: `/docs/cursor-rules.md`  
> Status: **LOCKED**. Edit by PR only. Each item must cite spec sections and pass DoD + QA.

## Conventions
- **IDs:** AB-### (phased blocks).  
- **Dependencies:** use IDs only.  
- **Tokens:** left 360px, lane 300px, gutter 24px, padding 24, radius 12, border `#e2e8f0`, text `#0f172a`, sub `#475569`, band `rgba(241,245,249,.35)`, focus ring 2px `#2563eb`, chip 12px/20–22px, event pill 26px.  
- **Stop conditions per item:** Touch ≤6 files; if more needed, split a child item.  
- **QA plan format:** Commands only (no prose). Include Playwright tag(s) and snapshot updates when relevant.

---

## Phase 0 — Foundations

### AB-001 — FlowDoc v1.1 (Zod schema)
- **Spec refs:** §2.1–2.3, Appx C
- **Depends:** —
- **DoD:**
  - Zod schema matches §2.1 structure; validates `branches`, event pills, labels.
  - Validation rules in §2.2/§2.3 implemented (no orphans; decisions; Yes/No rules).
  - Unit tests for valid/invalid samples (linear, decision, boolean Yes/No, multi-branch).
- **QA:**


### AB-002 — Adapters AgentSpec↔FlowDoc↔DSL
- **Spec refs:** §1, §3.3, §3.5
- **Depends:** AB-001
- **DoD:** Deterministic adapters with round-trip tests; Diff builder supports nodes/edges add/remove/modify.
- **QA:** `npm test -- -t "adapter|diff"`

### AB-003 — Fixtures (linear/decision/parallel/race/mapLoop)
- **Spec refs:** §7, Appx E/F
- **Depends:** AB-001
- **DoD:** JSON fixtures for 5 archetypes; visual seeds for canvas.
- **QA:** `npm test -- -t "fixtures"`

### AB-004 — Storybook (NodeCard/DecisionCard/EventPill/ConnectionTile)
- **Spec refs:** §4.4, §6
- **Depends:** Tokens (global)
- **DoD:** Stories for Beginner + Pro modes; token snapshot story.
- **QA:** `npm run storybook:build && npm run test:visual:snapshots`

### AB-010 — CI/CD gates
- **Spec refs:** §10
- **Depends:** AB-001..004
- **DoD:** CI runs typecheck/lint/unit/integration/e2e/snapshots; blocks on failure.
- **QA:** run pipeline locally if available, else `npm run qa`

### AB-011 — Security headers & basic observability
- **Spec refs:** §6 Security (high-level)
- **DoD:** Strict CSP, HSTS (dev-appropriate), minimal request logging with PII redaction pipeline stub.
- **QA:** curl checks + header asserts

### AB-012 — Perf budgets in build
- **Spec refs:** §10 Performance
- **DoD:** Budgets encoded in CI; fail if exceeded.
- **QA:** `npm run perf:check`

---

## Phase 1 — Builder UX

### AB-101 — Three-pane layout (Left Chat, Center Canvas, Right Inspector/Test)
- **Spec refs:** §0, §3, §5
- **Depends:** AB-004
- **DoD:** Persistent right column; left fixed 360px; routes `/agent` with panes.
- **QA:** `npx playwright test --grep @builder-layout`

### AB-102 — Lane bands & X quantization
- **Spec refs:** §0, §4.3–4.4
- **Depends:** AB-101
- **DoD:** X snaps to ~300px columns; bands auto-show at zoom ≥0.8 + toggle.
- **QA:** `npx playwright test --grep @lanes`

### AB-103 — Bottom “+” anchor on nodes → Add-Action
- **Spec refs:** §4.1
- **Depends:** AB-101
- **DoD:** Anchored modal; insert at Y≈sourceY+80; autowire; snap X by kind.
- **QA:** `npx playwright test --grep @anchor-node`

### AB-104 — Decision chips on node with mini “+”
- **Spec refs:** §4.1, §2.3
- **Depends:** AB-103
- **DoD:** Chips render on card; click “+” inserts child; edge inherits label.
- **QA:** `npx playwright test --grep @decision-chips`

### AB-105 — Email event pills (“After sent/received”) with “+”
- **Spec refs:** §4.1, §2.1
- **Depends:** AB-103
- **DoD:** Two pills under email outputs; “+” inserts child.
- **QA:** `npx playwright test --grep @event-pills`

### AB-106 — Curved edges with centered label chips; primary vs secondary styling
- **Spec refs:** §4.2, §4.4
- **Depends:** AB-101
- **DoD:** Bezier edges; chip centered; primary styling enabled by flag.
- **QA:** `npx playwright test --grep @edges`

### AB-107 — Inspector (schema-driven) writes to FlowDoc only
- **Spec refs:** §5, §2
- **Depends:** AB-001, AB-101
- **DoD:** Forms for Condition, Agent Step, Loop; patch FlowDoc; no canvas-only state.
- **QA:** `npx playwright test --grep @inspector-bindings`

### AB-108 — Beginner/Pro toggle (persisted; density/tokens)
- **Spec refs:** §0.1
- **Depends:** AB-101
- **DoD:** Toggle in toolbar; Beginner expanded; Pro compact (dense Y=32); persists per user.
- **QA:** `npx playwright test --grep @beginner-pro`

### AB-109 — Narrative overlay (Plan bullets ↔ canvas selection/zoom)
- **Spec refs:** §3.6, Appx E
- **Depends:** AB-201..206 (needs plan blocks)
- **DoD:** Hover bullet highlights nodes/edges; click zooms; node select highlights bullet; “Back to Chat” button.
- **QA:** `npx playwright test --grep @narrative-overlay`

### AB-110 — A11y & shortcuts (aria, focus, keyboard nav)
- **Spec refs:** §4.3 A11y, §10 A11y
- **Depends:** AB-101..106
- **DoD:** Traversal covers nodes→anchors→chips→pills→modal→inspector; axe clean.
- **QA:** `npx playwright test --grep @a11y && npm run axe`

---

## Phase 2 — Planner pipeline

### AB-201 — /api/agent/plan (JSON-only, Zod-validated)
- **Spec refs:** §3.3, §3.4
- **Depends:** AB-001
- **DoD:** Options/defaults/nextQuestions; low-temp; schema validation + repair/fallback logging.
- **QA:** `npm test -- -t "plan endpoint"`

### AB-202 — /api/agent/confirm (deterministic AgentSpec)
- **Spec refs:** §1, §3.3
- **Depends:** AB-201
- **DoD:** Produces AgentSpec deterministically from selections; no prose.
- **QA:** `npm test -- -t "confirm endpoint"`

### AB-203 — /api/agent/generate (FlowDoc v1.1; warns on guards/outputs)
- **Spec refs:** §3.3, §2.2
- **Depends:** AB-202
- **DoD:** Valid FlowDoc; auto-insert outputs/guards with warnings.
- **QA:** `npm test -- -t "generate endpoint"`

### AB-204 — Provider fallback + JSON repair + logging
- **Spec refs:** §3.4
- **Depends:** AB-201..203
- **DoD:** Claude→OpenAI→Mistral→Gemini→DeepSeek→Qwen; repair heuristic; turn logging.
- **QA:** `npm test -- -t "fallback|repair"`

### AB-205 — Golden prompts (≥25) produce valid FlowDoc previews
- **Spec refs:** §10
- **Depends:** AB-201..204
- **DoD:** 25+ prompts across archetypes; all validate; diffs produced.
- **QA:** `npm run test:golden`

### AB-206 — Diff-Apply with counts + single-level Undo
- **Spec refs:** §3.5
- **Depends:** AB-203
- **DoD:** Diff UI in chat; Apply merges + records Undo; Undo restores.
- **QA:** `npx playwright test --grep @diff-apply`

### AB-207 — Guard/Decision conventions (Left=No, Right=Yes; auto Yes/No; label validation)
- **Spec refs:** §2.3
- **Depends:** AB-203
- **DoD:** Auto-label boolean branches; validation errors/warnings surfaced.
- **QA:** `npm test -- -t "guard conventions"`

---

## Phase 3 — Connections & Secrets

### AB-301 — Derive required connections from FlowDoc; render tiles
- **Spec refs:** §6.4
- **Depends:** AB-203
- **DoD:** Detect providers & secrets via **provider registry**; tiles in left; statuses updatable; **Skip (Simulated)** unblocks Test with seeded mocks; banner shown.
- **QA:** `npx playwright test --grep @connections-derive`

### AB-302 — /api/providers/status and live updates
- **Spec refs:** §6
- **Depends:** AB-301
- **DoD:** Status via **registry** with `statusCheck()`; env in dev, vault in prod; UI refresh on completion.
- **QA:** `npm test -- -t "providers status"`

### AB-303 — Save-before-Test gating; explicit skip with warning
- **Spec refs:** §0 Save-before-Test, §6
- **Depends:** AB-301..302
- **DoD:** Test disabled if dirty/missing connections; “Skip” logs a warning.
- **QA:** `npx playwright test --grep @test-gate`

### AB-304 — Secrets (AES-GCM), per-tenant scoping
- **Spec refs:** §6 Security
- **Depends:** AB-302
- **DoD:** At-rest encryption; scoped reads; key rotation stub; **registry** reads provider-required secrets from vault.
- **QA:** unit + integration mocks

### AB-305 — SSRF allowlist/denylist; egress filtering
- **Spec refs:** §6 Security
- **DoD:** Deny private nets; explicit allowlist; tests for blocked/allowed.
- **QA:** `npm test -- -t "ssrf|egress"`

### AB-306 — Redaction in logs/artifacts
- **Spec refs:** §6 Security
- **DoD:** No secrets in logs/SSE/artifacts; test leak attempts.
- **QA:** `npm test -- -t "redaction"`

### AB-307 — /api/runs + /api/runs/:id/steps (DB-backed)
- **Spec refs:** §8.1, §8.2
- **DoD:** Supabase tables; list/detail endpoints; pagination/filters.
- **QA:** `npm test -- -t "runs api"`

### AB-308 — Sandbox transform execution (limits)
- **Spec refs:** §7 Policies
- **DoD:** Timeouts/resource caps for transform/code stubs; tests for limits.
- **QA:** unit

### AB-312 — Provider Registry v1 (DB + runtime)
- **Spec refs:** §6 Providers & Connections, §10 Contracts
- **Depends:** AB-301..302
- **DoD:** DB models (`providers`, `org_provider_settings`); server APIs to load descriptors; registry drives status from vault/env; mocks wired.
- **QA:** `npx playwright test --grep @providers-registry`

### AB-313 — Admin: Providers console (CRUD)
- **Spec refs:** §6 Admin
- **Depends:** AB-312
- **DoD:** `/admin/providers` list/search; create/edit provider (id, category, auth, required_secrets, config_schema, icon); validate descriptor; preview mock sample.
- **QA:** `npx playwright test --grep @providers-admin`

### AB-314 — OpenAPI importer
- **Spec refs:** §11 Extensibility
- **Depends:** AB-312
- **DoD:** Upload OpenAPI spec → provider descriptor + HTTP node templates; sample request validator; errors surfaced.
- **QA:** `npx playwright test --grep @openapi-importer`

### AB-315 — MCP provider type
- **Spec refs:** §11 MCP
- **Depends:** AB-312
- **DoD:** Register MCP endpoint; list tools; expose selected tools as node templates; mock outputs shape-consistent with live.
- **QA:** `npx playwright test --grep @mcp`

### AB-316 — Category mocks pack (Email/Chat/Weather/HTTP/Storage/Scraping)
- **Spec refs:** §10 Testing & Quality
- **Depends:** AB-301..302
- **DoD:** Deterministic, prompt-aware mocks per category; seeded by (orgId, providerId, nodeId, prompt); stable snapshots.
- **QA:** `npm test -- -t "mocks"`

### AB-317 — Scraping APIs (Apify, ScrapingBee)
- **Spec refs:** §6 Scraping/RPA
- **Depends:** AB-312, AB-316
- **DoD:** Provider descriptors; node templates; mock + live mode; retries/backoff/rate-limit; error surfaces; basic SERP/JS-render support.
- **QA:** `npx playwright test --grep @scraping`

### AB-318 — Planner provider suggestions
- **Spec refs:** §3 Planner & Chat
- **Depends:** AB-312
- **DoD:** Capability-based suggestion chips in chat; writes provider ids and `data.secrets[]` into FlowDoc; respects org defaults.
- **QA:** `npx playwright test --grep @provider-suggest`

### AB-319 — Secrets vault integration (registry)
- **Spec refs:** §6 Security
- **Depends:** AB-304, AB-312
- **DoD:** Registry reads `required_secrets[]` from vault; Save-before-Test + Skip (Simulated) finalized; redaction verified.
- **QA:** `npx playwright test --grep @secrets-vault`

---

## Phase 4 — Runtime (v1.1)

### AB-401 — Runtime semantics (join/race/mapLoop) + policies
- **Spec refs:** §7
- **Depends:** AB-003, AB-203
- **DoD:** Implement join(any/all/count/deadline), race (cancel losers), mapLoop (maxConcurrent/gather); per-node retry/backoff, timeout, idempotency, compensation hooks.
- **QA:** `npm test -- -t "runtime semantics"`

### AB-402 — Test SSE → persistence (insert workflow_runs, upsert run_steps, finalize)
- **Spec refs:** §8.4, §5
- **Depends:** AB-307
- **DoD:** On test: insert run; stream steps → upsert; finalize status/duration.
- **QA:** `npx playwright test --grep @test-sse-db`

### AB-403 — /tasks reflects runs in <1s (poll/sub)
- **Spec refs:** §8.3, §8.4
- **Depends:** AB-402
- **DoD:** Live list; detail timeline; retries and artifacts visible.
- **QA:** `npx playwright test --grep @tasks`

### AB-404 — Live-or-mock toggles per integration
- **Spec refs:** §11 Flags
- **DoD:** Flags to switch between **mock-first** and live per provider; deterministic, prompt-aware mocks; tests.
- **QA:** unit

### AB-405 — Integration tests in mock mode (Slack, Email, etc.)
- **Spec refs:** §10 Integration
- **Depends:** AB-404
- **DoD:** Mock suites for core providers; pass under CI.
- **QA:** `npm run test:integrations`

---

## Phase 5 — Power nodes & Templates

### AB-501 — Code node sandbox hardening
- **Spec refs:** §5 Ask-AI (usage), §7 Policies
- **DoD:** Strict sandbox, timeouts, size limits, allowed modules.
- **QA:** unit + smoke

### AB-502 — Knowledge base crawl
- **Spec refs:** §5 Ask-AI helpers (context), §5/§7 generally
- **DoD:** Crawl website; index; node config in Inspector.
- **QA:** integration mock

### AB-503 — Computer Use (flagged)
- **Spec refs:** §5, §7
- **DoD:** Stub service interface + sessions; behind flag.
- **QA:** smoke

### AB-504 — Phone (flagged)
- **Spec refs:** §5, §7
- **DoD:** Outbound provider interface (e.g., Twilio-like); behind flag.
- **QA:** smoke

### AB-510 — Templates gallery (50 curated)
- **Spec refs:** §9 Publish (alignment)
- **DoD:** Gallery UI; metadata; search; examples render in Builder.
- **QA:** e2e basic

### AB-511 — Template import/install UX + fixtures
- **Spec refs:** §9
- **DoD:** Import → preview diff → Apply; fixtures for 10+.
- **QA:** e2e

---

## Phase 6 — QA, A11y, Perf (plus platform)

### AB-601 — Visual snapshots (CI-blocking)
- **Spec refs:** §10.6, §4.4
- **DoD:** Token sheet + NodeCard/DecisionCard/Add-Action/ConnectionTile/Canvas; fail on drift.
- **QA:** `npm run test:visual:snapshots`

### AB-602 — Perf budgets
- **Spec refs:** §10 Performance
- **DoD:** time-to-preview <2s; add-node <150ms; 60fps @50 nodes.
- **QA:** perf script

### AB-603 — Keyboard traversal + axe checks
- **Spec refs:** §10 A11y
- **DoD:** Full traversal; axe passes on Builder & Tasks.
- **QA:** `npm run axe && npx playwright test --grep @a11y`

### AB-604 — Telemetry (events + dashboards)
- **Spec refs:** §10 Telemetry
- **DoD:** Emit events/metrics; minimal dashboard.
- **QA:** unit/integration

---

## Phase 9 — Hosted mini-apps (Publish)

### AB-901 — One-click Publish from Builder (share link + embed)
- **Spec refs:** §9
- **Depends:** AB-203, AB-303
- **DoD:** Publish action; returns slug, share link, embed instructions.
- **QA:** e2e

### AB-902 — Routes (manifest, hosted UI, run, stream)
- **Spec refs:** §9
- **DoD:** `GET /apps/[slug]/manifest`, `GET /a/[slug]`, `POST /apps/[slug]/run`, `GET /apps/[slug]/stream`.
- **QA:** integration

### AB-903 — Embed widget `GET /widget/v1.js`
- **Spec refs:** §9
- **DoD:** Loader that mounts widget, configurable props.
- **QA:** basic embed page

### AB-904 — Inputs validation, quotas/rate limits, no secrets exposure
- **Spec refs:** §9 Security
- **DoD:** Strict input schemas; rate limiting; secrets never leak.
- **QA:** unit/integration

---

## Cross-cutting

### AB-CC1 — Docs (AI chat-to-workflow, integrations, security, acceptance)
- **Spec refs:** whole spec
- **DoD:** Dev docs; short user docs; acceptance checklist per phase.
- **QA:** lint + link check

### AB-CC2 — Test matrix (unit, integration-mock, e2e)
- **Spec refs:** §10
- **DoD:** Matrix in CI; tags used in QA plans.
- **QA:** CI run

---

## DoD Completion Summary (Agent Build)

- AB-001: FlowDoc Zod schema parity — DONE
  - Strict start-node/input checks and cycle detection; surfaced via `strictIssues` in UI.
- AB-204: Provider fallback + JSON repair — DONE
  - Fallback across providers with attempt logs; robust JSON repair + Zod validation.
- AB-304/AB-319: Secrets encryption + vault — DONE
  - AES-GCM encryption; rotation endpoint; vault shim wired for prod.
- AB-307/AB-403: Runs API + Tasks UI CI — DONE
  - @tasks-e2e coverage; stubs when DB absent; cross-browser smoke.

### Parity & UX
- Quick/Conversational parity for diff preview → apply → inline connect.
- Graph hygiene and inspector accessibility implemented.

### Test Matrix Policy
- Chromium: planner/console/axe/tasks slices; visual/perf excluded.
- Firefox/WebKit/Mobile: smoke + planner + console + axe.

### AB-CC3 — Feature flags
- **Spec refs:** §11
- **DoD:** `agentBuild`, `agentBuild.curvedEdges`, `layout.elkY`, `theme.tokens.strict`, per-provider `mockMode`.
- **QA:** unit

---

<!-- AUTO:AB_INDEX:BEGIN -->
### Auto-generated Index

- **0) Invariants (must always hold)**
  - AB-002
- **1) Glossary**
  - AB-001
- **2) FlowDoc (source of truth)**
  - AB-003
- **3) Conversational Builder (revised methodology)**
  - AB-110
- **4) Canvas interaction & visuals**
  - AB-106
- **5) Inspector & Test (right panel)**
  - AB-303
- **6) Connections & Secrets**
  - AB-306
- **7) Runtime & semantics (v1.1)**
  - AB-401
- **8) Tasks (persistent runs)**
  - AB-403
- **9) Hosted mini-apps (publish)**
  - AB-904
- **10) Testing & quality gates (evidence-based)**
  - AB-604
- **13) Acceptance snapshot (what “done” looks like)**
  - AB-603

<!-- AUTO:AB_INDEX:END -->
