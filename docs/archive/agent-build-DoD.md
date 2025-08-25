# Agent Build – Definition of Done (DoD) & Exit Gates

This checklist augments the delivery plan. Each phase must hit its Exit Gate before proceeding.

## Phase 0 — Foundations
- [ ] FlowDoc v1.1 Zod/JSON schema published in repo
- [ ] Orchestrator interfaces/types: Task, Step, Artifact, Counters, Costs; `run(flowDoc, input, opts)`
- [ ] Adapters: AgentSpec ↔ FlowDoc ↔ current DSL (fixtures: linear, 3‑way decision, parallel count=2, race, mapLoop)
- [ ] Storybook: NodeCard, BranchChip, EventPill, ConnectionTile with token knobs
- [ ] Feature flag `agentBuild` enabled in dev

Exit Gate: schema + interfaces merged; adapters pass fixtures; Storybook running

## Phase 1 — Agent Builder UX
- [ ] Left panel (stepper/plan/connections) implemented
- [ ] Add‑Action catalog (Top/Apps/Chat/AI/Logic/Scrapers/By FlowPuppy)
- [ ] Canvas lane snap math deterministic (ELK only for Y)
- [ ] Decision edge chips; event outlet pills under outputs
- [ ] Inspector forms (Condition, Loop, Agent Step) with exact copy
- [ ] Playwright visual snapshots:
  - [ ] Main screen
  - [ ] Add Action modal
  - [ ] Loop inspector
  - [ ] Condition inspector
  - [ ] Agent Step
- [ ] Token snapshot test: left=360px, right≈384px, lane col=300px, radius=12, border `#e2e8f0`, band rgba(241,245,249,0.35), title 15px semibold

Exit Gate: snapshots pass; 4 lane headers visible; + buttons/focus order correct

## Phase 2 — Planner pipeline
- [ ] `/api/agent/plan`/`confirm`/`generate` implemented
- [ ] Prompt harness with golden outputs (≥5 intents)
- [ ] `/generate` runs FlowDoc validation and auto‑inserts missing outputs/guards/placeholder decision with warnings

Exit Gate: golden tests green; invalid FlowDoc rejected unless warnings are acknowledged

## Phase 3 — Connections & Secrets
- [ ] Provider registry abstraction (name, scopes, UI, secret schema)
- [ ] Google OAuth, OpenWeather key, Webscrape key flows
- [ ] Save‑before‑Test gate; unresolved secrets block test with Connect CTA
- [ ] Egress allowlist + SSRF denylist enforced; logger redaction map

Exit Gate: connectors show ✓ after auth; secrets redacted in logs; allowlist on

## Phase 4 — Runtime orchestrator (v1.1)
- [ ] Parallel joins (all/any/count/deadline)
- [ ] Race/first‑winner (cancel losers)
- [ ] MapLoop with gather reducers (array/objectMerge/sum/custom)
- [ ] Per‑node: retry/backoff, timeout, idempotencyKey, cancelPolicy, compensation
- [ ] Resource governance: provider pools (concurrency, rateLimitPerSec), `budgetUSD` hard guard
- [ ] Observability: artifacts (input/output/error/screenshot), counters, costs in Task

Exit Gate: example scenarios run and counters/artifacts visible in `/tasks/{id}`

## Phase 5 — Power nodes
- [ ] Code node (JS sandbox) hardened (time/mem/builtins)
- [ ] Knowledge Base (Website crawl)
- [ ] Computer Use (session API) – behind flag
- [ ] Phone (outbound) – behind flag

Exit Gate: smoke tests; timeouts/screenshots recorded where applicable

## Phase 6 — QA, A11y, Performance
- [ ] Time‑to‑preview < 2s; add‑node < 150ms; 60fps pan/zoom @50 nodes
- [ ] Keyboard navigation across canvas/plus/menus/inspector
- [ ] Telemetry events + dashboards wired

Exit Gate: performance & a11y checks green; telemetry flowing

---

## Acceptance Snapshot
From blank prompt: Prompt → Plan → Confirm → Generate → Preview → Connect → Test. UI matches spec (lanes, chips, pills, modal tabs). Orchestrator executes parallel majority, race, and mapLoop with retries/timeouts/idempotency/compensation/resource caps; artifacts/counters visible in Task.

