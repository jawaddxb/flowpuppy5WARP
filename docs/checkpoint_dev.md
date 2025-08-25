## Checkpoint Dev — FlowPuppy v4

Date: 2025-08-17

### Scope
- Review of the authoritative spec (`docs/agent-build-master.md`) and locked backlog (`docs/LOCKED_BACKLOG.md`).
- Inventory of features implemented in code, noting deviations and additions beyond the backlog.
- Outstanding work, grouped functionally with AB-IDs.
- A numbered implementation flow (tasks) to converge to spec.

---

## 1) Specification (authoritative snapshot)
- **Invariants**: FlowDoc is the source of truth; three-pane layout; X quantization; Beginner/Pro modes; Save-before-Test; provider mocks allowed in simulated mode.
- **FlowDoc v1.1**: lanes, nodes, edges; decision/guard conventions (Left=No, Right=Yes); validation rules.
- **Planner pipeline**: `/api/agent/plan → /confirm → /generate` (JSON-only, schemas, fallback + repair).
- **Canvas UX**: anchors “+” (bottom, branch chips, event pills), curved labeled edges, lane bands, layout rhythm.
- **Inspector & Test**: schema-driven fields that write to FlowDoc; SSE Test with per-step focus; Undo one level.
- **Connections & Secrets**: derive required connections; `/api/providers/status`; AES-GCM secrets; SSRF/egress filtering; redaction.
- **Runtime & Tasks**: join/race/mapLoop; per-node policies; persist runs/steps and expose at `/tasks`.
- **Publish**: mini-apps routes (`/apps/[slug]/manifest`, `/a/[slug]`, `/apps/[slug]/run`, `/apps/[slug]/stream`), widget `/widget/v1.js`.
- **Quality gates**: golden prompts, visual snapshots, perf budgets, a11y traversal, telemetry; feature flags.

References: `docs/agent-build-master.md`, `docs/LOCKED_BACKLOG.md` (AB-001..904, CC1..CC3).

---

## 2) Features built (by functional grouping)

### A) Foundations (Phase 0)
- **FlowDoc schema (AB-001)**: Implemented as Zod schema and used across adapters.
  - Evidence: `apps/web/src/lib/flowdoc/schema.ts` (ZFlowDoc, nodes/edges, retry/resource policies)
- **Adapters (AB-002)**: AgentSpec→FlowDoc and FlowDoc→DSL adapters exist; generate merges planner DSL when valid.
  - Evidence: `apps/web/src/lib/agentSpec/adapter.ts`, `apps/web/src/lib/flowdoc/adapter.ts`, `apps/web/src/app/api/agent/generate/route.ts`
- **Fixtures (AB-003)**: Energy Optimizer FlowDoc used to seed builder.
  - Evidence: `apps/web/src/agentStage/fixtures/energy-optimizer.flow.json`
- **Storybook (AB-004)**: Storybook artifacts present in `storybook-static/` (token/components snapshots built previously).

### B) Conversational Builder UX (Phase 1)
- **Three-pane layout (AB-101)**: Builder layout with left panel, canvas, right inspector/test.
  - Evidence: `apps/web/src/app/agent/page.tsx`, `apps/web/src/agentStage/components/BuilderLayout.tsx`, `LeftPanel.tsx`, `RightInspector.tsx`
- **Lane bands & X quantization (AB-102)**: Toggle lane bands; quantized widths asserted by tests.
  - Evidence: `apps/web/tests/lanes.spec.ts`
- **Anchors and Add-Action (AB-103)**: Bottom “+” opens modal; event pills and decision chips expose mini “+”.
  - Evidence: `apps/web/tests/anchors.spec.ts`
- **Decision chips (AB-104)**: Chips rendered with mini add.
  - Evidence: `apps/web/tests/anchors.spec.ts`
- **Email event pills (AB-105)**: Pills visible with add.
  - Evidence: `apps/web/tests/anchors.spec.ts`
- **Curved edges & labels (AB-106)**: Present in canvas implementation (visuals; tested indirectly); dedicated edge component exists.
  - Evidence: `apps/web/src/components/edges/LabeledEdge.tsx`
- **Inspector binds to FlowDoc (AB-107)**: Right panel writes to node data via store.
  - Evidence: `apps/web/src/agentStage/components/RightInspector.tsx`
- **Beginner/Pro toggle (AB-108)**: Flags present in codebase; density/layout tokens used; basic toggle wiring.
  - Evidence: `apps/web/src/app/agent/page.tsx`, `apps/web/src/lib/flags` (flag usage), tokens in `apps/web/src/theme/tokens.ts`
- **Chat-driven builder overlay (early)**: Conversational mode UI implemented (outside original AB scope for Phase 1), with tests.
  - Evidence: `apps/web/src/agentStage/components/ConversationalFlow.tsx`, tests `apps/web/tests/conversational-*.spec.ts`

### C) Planner pipeline (Phase 2)
- **/api/agent/plan (AB-201)**: Deterministic, prompt-aware mock-first response with `options/defaults/nextQuestions` and `connectionsRequired`.
  - Evidence: `apps/web/src/app/api/agent/plan/route.ts`, tests `apps/web/tests/planner.spec.ts`
- **/api/agent/confirm (AB-202)**: Deterministic AgentSpec from selections validated by Zod.
  - Evidence: `apps/web/src/app/api/agent/confirm/route.ts`
- **/api/agent/generate (AB-203)**: AgentSpec→FlowDoc with planner DSL merge when valid.
  - Evidence: `apps/web/src/app/api/agent/generate/route.ts`
- **LLM provider routing stub (AB-204 groundwork)**: `getProviderOrder` for fallback policy (DB-backed when present).
  - Evidence: `apps/web/src/lib/aiRouting.ts`
- **Chat SSE for planning and DSL synthesis (additional)**: `/api/chat/stream` streams narrative lines and opportunistic DSL.
  - Evidence: `apps/web/src/app/api/chat/stream/route.ts`

### D) Connections & Secrets (Phase 3)
- **Derive required connections (AB-301)**: From FlowDoc nodes/providers/secrets.
  - Evidence: `apps/web/src/lib/connections.ts`
- **Providers status API (AB-302)**: `/api/providers/status` derives statuses via registry and DB/env secrets.
  - Evidence: `apps/web/src/app/api/providers/status/route.ts`, tests `apps/web/tests/providers-status.spec.ts`
- **Save-before-Test gating (AB-303)**: Right panel Test checks dirty state and warns; SSE Test integrated.
  - Evidence: `apps/web/src/agentStage/components/RightInspector.tsx`
- **Secrets infra (AB-304/306 partial)**: Redaction helpers used in run stream persistence; vault via Supabase tables when available.
  - Evidence: `apps/web/src/app/api/run/stream/route.ts` (redactSensitive), `apps/web/src/lib/providerRegistry.ts` (credentials fields)
- **SSRF/Egress (AB-305)**: Not implemented yet (see Outstanding).

### E) Provider Registry & Admin (Phase 3)
- **Static provider registry (AB-312)**: OpenWeather, Gmail, Apify, ScrapingBee with `statusCheck`, `credentials`, `mockResponse`.
  - Evidence: `apps/web/src/lib/providerRegistry.ts`, `apps/web/src/lib/registryLoader.ts`
- **Admin Providers console (AB-313)**: UI for listing/adding providers, editing credentials, viewing routing.
  - Evidence: `apps/web/src/app/admin/providers/page.tsx`
- **Admin Providers API (AB-313)**: List/create providers, update by id; MCP and OpenAPI importer endpoints present.
  - Evidence: `apps/web/src/app/api/admin/providers/route.ts`, `[id]/route.ts`, `openapi/route.ts`, `mcp/route.ts`
- **Node templates API (AB-314/315 scaffolding)**: Templates derived from registry and DB providers; MCP template placeholder.
  - Evidence: `apps/web/src/app/api/nodes/templates/route.ts`, test `apps/web/tests/palette-templates.spec.ts`

### F) Runtime & Tasks (Phase 4)
- **Run streaming & persistence (AB-402)**: `/api/run/stream` executes workflow (mock), streams SSE, persists `workflow_runs` and `run_steps` when DB present.
  - Evidence: `apps/web/src/app/api/run/stream/route.ts`
- **Runs listing and steps (AB-307/403)**: `/api/runs`, `/api/runs/:id/steps` endpoints with UI at `/tasks` and right panel tasks.
  - Evidence: `apps/web/src/app/api/runs/route.ts`, `apps/web/src/app/api/runs/[id]/steps/route.ts`, `apps/web/src/app/tasks/page.tsx`, right panel TasksPanel

### G) Hosted mini‑apps & Widget (Phase 9)
- **Manifest route (AB-902)**: `/apps/[slug]/manifest` implemented.
  - Evidence: `apps/web/src/app/apps/[slug]/manifest/route.ts`
- **Hosted UI (AB-902)**: `/a/[slug]` implemented with client stream to `/api/run/stream`.
  - Evidence: `apps/web/src/app/a/[slug]/page.tsx`
- **Embed widget (AB-903)**: `/widget/v1.js` serves a custom element that fetches manifest and renders a simple form/preview.
  - Evidence: `apps/web/src/app/widget/v1.js/route.ts`
- Note: The spec’s `/apps/[slug]/run|stream` are not wired; current implementation uses `/api/run/stream` (see Deviations).

### H) QA, A11y, Perf, Telemetry (Phase 6/10)
- **Unit tests**: 31 passing in last run; FlowDoc, planner, adapters, executor, redaction, providers.
- **E2E smoke & canvas tests**: Anchors, lanes, planner, palette-templates; conversational layout/styling scenarios added.
- **Visual snapshots/Perf/A11y/Telemetry**: Not fully wired in CI (see Outstanding).

QA snapshot: `.qa/last.json` shows typecheck ✓, unit ✓, e2e 1 failing (conversational styling).

---

## 3) New additions outside the backlog (or ahead of schedule)
- **Conversational flow mode and API**: Natural language chat to guide workflow building, with quick actions and staged prompts.
  - Evidence: UI `apps/web/src/agentStage/components/ConversationalFlow.tsx`; API `apps/web/src/app/api/chat/continue/route.ts`; tests `apps/web/tests/conversational-*.spec.ts`
- **Chat SSE planning stream**: `/api/chat/stream` synthesizes narrative + DSL opportunistically from provider LLMs or fallback.
- **Admin routing preview UI**: Providers page references `/api/admin/routes` endpoints (not yet implemented) to view/edit AI routing.

---

## 4) Deviations and gaps vs spec/backlog
- **Publish routes**: Spec: `/apps/[slug]/run|stream`; current: hosted page calls `/api/run/stream`. Action: add spec-compliant routes or update spec to accept `/api/run/stream`.
- **Secrets vault integration (AB-319)**: Only env/DB stubs; no vault-backed registry reads or per-tenant scoping finalized.
- **SSRF allowlist/egress (AB-305)**: Not implemented.
- **Redaction (AB-306)**: Partially applied in run streaming; broader log/SSE surfaces need coverage.
- **Guard/Decision conventions (AB-207)**: Validation warnings/surfacing not implemented yet.
- **Narrative overlay (AB-109)**: Not implemented.
- **A11y & shortcuts (AB-110/603)**: Basic focus and sizes present; formal axe checks and full traversal not wired.
- **Visual snapshots/Perf budgets (AB-601/602)**: Not CI-blocking yet.
- **Golden prompts (AB-205)**: Not implemented.
- **Feature flags (AB-CC3)**: Present in code usage (`agentBuild`, layout/elkY, tokens) but flag registry and rollout policy need consolidation.
- **Admin routes health/routing**: UI references `/api/admin/providers/health` and `/api/admin/routes` which are missing; add.
- **E2E failure**: `@conversational-styling` expects blue send button background; computed style returns transparent in CI snapshot.

---

## 5) Outstanding work (by functional grouping)

### Foundations
- **AB-010**: CI gates for typecheck/lint/unit/integration/e2e/snapshots (partial; add visual/perf/a11y).
- **AB-011/012**: Security headers & perf budgets in build.

### Conversational Builder UX
- **AB-109**: Narrative overlay and chat↔canvas linking.
- **AB-110**: A11y traversal and keyboard shortcuts; axe pass.
- Fix e2e `@conversational-styling` button contrast regression.

### Planner pipeline
- **AB-204**: Full provider fallback matrix and JSON repair logging.
- **AB-205**: Golden prompts set (≥25) with validations.
- **AB-206/207**: Diff-Apply with Undo and guard conventions with surfaced warnings.

### Connections & Secrets
- **AB-304/319**: Secrets vault integration; per-tenant; Save-before-Test + Skip finalized with banner.
- **AB-305/306**: SSRF allowlist/egress filtering and comprehensive redaction.

### Provider Registry & Admin
- **AB-312/313**: Complete Admin providers health checks, credentials flows; implement `/api/admin/providers/health` and `/api/admin/routes` CRUD.
- **AB-314/315**: OpenAPI importer UI round-trip; MCP provider tools listing and node template wiring.

### Runtime & Tasks
- **AB-401**: Runtime semantics (join/race/mapLoop) and per-node policies.
- **AB-402/403**: Ensure SSE→DB path integrated with Tasks live reflect (<1s) via poll/sub.

### Publish
- **AB-902**: Implement `/apps/[slug]/run` and `/apps/[slug]/stream` shims that forward to runtime.
- **AB-904**: Inputs validation, quotas/rate-limits, no secrets exposure.

### QA/Perf/Telemetry
- **AB-601/602/603/604**: Visual snapshots as CI-blocking; perf budgets; axe; telemetry events/metrics.

---

## 6) Implementation flow (numbered tasks)
1. AB-001: Finalize FlowDoc v1.1 schema, validation helpers, decision conventions; add unit tests for valid/invalid cases.
2. AB-002: Harden adapters (AgentSpec↔FlowDoc↔DSL), cover round-trip tests; ensure Diff shape contract present.
3. AB-003: Expand fixtures (linear/decision/parallel/race/mapLoop) and hook into builder seeds and tests.
4. AB-004/601: Restore Storybook builds + token/components visual snapshots; make CI-blocking.
5. AB-101..106: Close remaining canvas UX gaps (curved edges options, lane bands on toggle, anchor insertion rules with X snap).
6. AB-107: Ensure all Inspector fields write back to FlowDoc only; add schema-driven forms for core node types.
7. AB-108: Persist Beginner/Pro mode per user; verify density tokens.
8. AB-109: Implement narrative overlay linking Plan bullets ↔ canvas selection/zoom.
9. AB-201..203: Lock planner endpoints (schemas, deterministic mocks), generate warns on auto-inserted outputs/guards; wire chat apply/undo.
10. AB-204: Implement provider fallback with logging and JSON repair; route via `ai_routes` when DB present.
11. AB-205: Author ≥25 golden prompts and snapshot their outputs; add to CI.
12. AB-206/Undo: Diff-Apply UI with counts; single-level undo snapshot and restore.
13. AB-301..303: Derive required connections; implement Save-before-Test + Skip (banner); left panel tiles with live status refresh.
14. AB-304/306/319: Secrets AES-GCM at rest, redaction on logs/SSE/artifacts, vault integration with per-tenant scoping.
15. AB-305: SSRF allowlist/denylist and egress filter; tests.
16. AB-312/313: Provider Registry v1 (DB+runtime); Admin providers health, CRUD, credentials modal; implement `/api/admin/providers/health` and `/api/admin/routes`.
17. AB-314/315: OpenAPI importer to provider+templates; MCP provider type with tool templates.
18. AB-401: Runtime semantics and policies; executor tests.
19. AB-402/403: SSE→DB persistence on Test; `/tasks` reflects runs in <1s (poll or sub).
20. AB-901..904: Publish flow: implement `/apps/[slug]/run|stream`; harden widget; inputs validation and rate-limits.
21. AB-CC3: Consolidate feature flags; ensure fallbacks.
22. AB-604: Telemetry events/metrics + minimal dashboard.

Notes on additions:
- Integrate Conversational Flow as an optional front to AB-201..206: map conversation context to AgentSpec, then reuse generate→Diff-Apply.
- Fix the conversation styling e2e by ensuring the send button computed background color is non-transparent in test env.

---

## 7) Verification (quick commands)
- Unit: `npm -w apps/web run test` (Vitest; planner/flowdoc/adapters/executor/providers)
- E2E (selected): `npx playwright test --grep @lanes|@anchor-node|@planner|@palette-templates`
- Conversational: `npx playwright test --grep @conversational-`
- Smoke: `npx playwright test --grep @smoke`

---

## 8) Evidence index (selected file paths)
- Planner: `apps/web/src/app/api/agent/{plan,confirm,generate}/route.ts`
- Chat: `apps/web/src/app/api/chat/{route.ts,stream/route.ts,continue/route.ts}`
- Registry: `apps/web/src/lib/{providerRegistry.ts,registryLoader.ts,connections.ts}`
- Providers Admin: `apps/web/src/app/admin/providers/page.tsx`, `apps/web/src/app/api/admin/providers/*`
- Runtime/Tasks: `apps/web/src/app/api/run/stream/route.ts`, `apps/web/src/app/api/runs/*`, `apps/web/src/app/tasks/page.tsx`
- Publish: `apps/web/src/app/apps/[slug]/manifest/route.ts`, `apps/web/src/app/a/[slug]/page.tsx`, `apps/web/src/app/widget/v1.js/route.ts`
- Canvas/UX: `apps/web/src/agentStage/components/*`, `apps/web/src/components/edges/LabeledEdge.tsx`

