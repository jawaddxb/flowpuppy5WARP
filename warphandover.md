FlowPuppy GPT5 — Warp Handover
================================

Purpose
-------
This handover document provides a complete specification and status of the FlowPuppy GPT5 system as of the latest push to `jawaddxb/Flowpuppy-GPT5` on `main`. It covers architecture, feature set, security, testing, what is implemented, what remains outstanding (by backlog ID), known gaps, and the exact steps to run, test, and extend the system.


High-level Overview
-------------------
FlowPuppy GPT5 is a Next.js (App Router) web app for building AI-powered workflows in two modes:
- Quick: guided setup that generates a workflow and presents a diff for apply.
- Conversational: chat-first orchestration that proposes structured changes (diff previews) with inline connections and testing.

Source-of-truth is a typed FlowDoc. The React Flow canvas renders a projection of FlowDoc and never mutates state directly. The system uses LLM guidance with strong guardrails (schema-first prompts, JSON repair, Zod validation, and deterministic E2E stubs) for reliable CI.


System Architecture
-------------------
Packages and layout
- Monorepo: root `package.json`, workspaces under `apps/*`, `packages/*`.
- Primary app: `apps/web` (Next.js 14 App Router + React 18 + Tailwind).
- State: Zustand store for graph and UI state at `apps/web/src/agentStage/graph/store.ts`.
- Canvas: React Flow in `apps/web/src/agentStage/components/FlowCanvas.tsx`.
- Builder shell: `BuilderLayout.tsx` orchestrates left/right panels and canvas.

Core concepts
- FlowDoc (v1.1): canonical workflow representation (nodes, edges, lanes), with strict and runtime validations.
- Planner Pipeline: `/api/agent/plan → /api/agent/confirm → /api/agent/generate` produces FlowDoc from user intent (prompt/spec).
- Conversational Orchestration: `/api/chat/continue` returns chat messages with quickActions (continue/edit/connect/simulate/preview/apply).
- Diff-Apply: structural changes are displayed as a diff; user applies to update FlowDoc, records undo, and opens testing.
- Inline Connections: derived from FlowDoc (providers, secrets) and gated in the Inspector Testing tab.

Key modules and files (non-exhaustive)
- Flow modeling
  - `apps/web/src/lib/flowdoc/schema.ts` — Zod schemas for FlowDoc and strict validations (start nodes, cycle detection, etc.).
  - `apps/web/src/lib/flowdoc/validate.ts` — Custom validations and messages (e.g., orphan node guidance).
  - `apps/web/src/lib/orchestrator/validate.ts` — Runtime-only validations (e.g., join policy sanity checks).
  - `apps/web/src/lib/flowdoc/fromDsl.ts` & `adapter.ts` — DSL ↔ FlowDoc.
- Canvas & UI
  - `apps/web/src/agentStage/components/FlowCanvas.tsx` — React Flow canvas, accessibility fixes (`nodesFocusable={false}`).
  - `apps/web/src/agentStage/components/BuilderLayout.tsx` — 3-pane layout, right-pane persistence/pinning, keyboard shortcuts.
  - `apps/web/src/agentStage/components/LeftPanelFixed.tsx` — Quick + Conversational driver and E2E `quickApi` hooks.
  - `apps/web/src/agentStage/components/ConversationalFlow.tsx` — Conversation UI, diff preview panel, `convoApi` hooks.
  - `apps/web/src/agentStage/components/RightInspector.tsx` — Inspector + Testing, connections gating, `inspectorApi` hooks.
- Graph store
  - `apps/web/src/agentStage/graph/store.ts` — Converts FlowDoc to React Flow nodes/edges, graph hygiene (dedupe triggers, autowire domain-like HTTP nodes), runtime issues.
- APIs (App Router)
  - Planner: `/api/agent/plan`, `/api/agent/confirm`, `/api/agent/generate` (E2E stubs when `NEXT_PUBLIC_E2E_HOOKS=1`).
  - Conversational: `/api/chat/continue` — rules for structured quickActions and non-navigation inline connect.
  - Patch generation: `/api/agent/patch` — implements `add_research_pipeline` into a fully wired scheduled pipeline.
  - Connections/Providers: `/api/providers/status`, Admin providers CRUD/credentials.
  - Tasks/Runs: `/api/runs`, `/api/runs/[id]/steps`, and `run/stream` (SSE simulation for testing).
- Security & middleware
  - `apps/web/src/middleware.ts` — Rate limiting headers and minimal security headers; CSP scoped to API routes (key to avoid breaking Next page scripts).
  - `apps/web/next.config.mjs` — Security headers without CSP (CSP handled in middleware for APIs only).
- Testing & automation
  - `apps/web/playwright.config.ts` — Cross-browser setup, project scoping, managed `webServer` with E2E hooks.
  - E2E Tests: `apps/web/tests/*` including planner, console, axe, tasks, SSRF tests.
  - Batch script: `scripts/sprint-batch.mjs` — Builds, runs a stable subset, optionally pushes.


User Experience (UX) and Accessibility
--------------------------------------
- Modes parity: Quick and Conversational both generate valid, fully wired workflows and present diffs before apply.
- Conversational “Starter ideas”: panel visible on a fresh thread, hides after first action unless pinned, state persists.
- Inspector right pane: context-open logic (node/issue/connection), pinnable, Testing gating with Connect/Skip tiles.
- Accessibility improvements:
  - Inspector inputs and selects labeled with `aria-label` and `htmlFor` pairing.
  - `AnchorPlus` made non-focusable (`tabIndex={-1}`, `aria-hidden`), avoiding nested-interactive violations.
  - Canvas nodes not focusable (`nodesFocusable={false}`).
  - Pages include `<title>` where needed.


LLM & Planning
---------------
- Planner chain (mock-first under E2E): `/api/agent/plan → /confirm → /generate`.
- Conversational rules in `/api/chat/continue`:
  - Use quickActions for structured changes (e.g., kind:"preview" + patchInstruction/patchParams).
  - Inline connect via `kind:"connect"` — never navigate away from the builder.
  - When goal implies trends (e.g., “Tweet daily AI trends”), propose 3–5 sources and provide structured patch preview.
- Patch generator `/api/agent/patch` implements `add_research_pipeline` (daily schedule → http fetches → summarize → compose → tweet).
- Provider fallback & JSON repair present in helpers; OpenAI Responses API is optional, Chat Completions is default for schema prompts (env: `OPENAI_USE_RESPONSES`).


Security Model
--------------
- Rate Limiting (middleware): Adds `X-RateLimit-*` and `RateLimit-Policy`; bypass blocking in E2E while emitting headers.
- Security Headers (middleware): `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- CSP: Applied to API routes only to avoid Next page script blocking; includes per-request nonce. Page-level CSP intentionally not set to preserve Next behavior.
- SSRF/Egress: Private IP/loopback blocked via `ensureHostAllowed`; covered by E2E tests.
- Secrets: AES-GCM encryption (key selection unified) for `/api/secrets` and provider credentials APIs; logs redacted by utility.


Testing Strategy
----------------
- Playwright E2E
  - Desktop Chromium runs full functional subset; Firefox/WebKit limited to stabilized tags (`@smoke|@security-headers|@planner|@axe|@console`).
  - E2E hooks enabled under `NEXT_PUBLIC_E2E_HOOKS=1`:
    - `window.convoApi` (send, build, selectQuick, openPanel, applyPending, hasPending)
    - `window.quickApi` (resetCanvas, generate, openPanel, applyPending, hasPending)
    - `window.inspectorApi` (openTesting, openInspector, connect, skip)
  - Tests avoid flaky mobile overlays with programmatic hooks.
- Accessibility (axe-core): agent/tasks pages return no serious violations.
- Security headers: Rate-limit and common headers present; CSP checked on API routes where applicable.
- SSRF: Private/loopback hosts are blocked.
- CI automation: `sprint-batch.mjs` builds and runs the stable subset and pushes if green.


Environments & Feature Flags
----------------------------
- `.env.local` in `apps/web` for provider keys. Common flags:
  - `NEXT_PUBLIC_AGENT_BUILD=1` — enable agent builder.
  - `NEXT_PUBLIC_E2E_HOOKS=1` — enable deterministic stubs and hooks for tests/demos.
  - `OPENAI_USE_RESPONSES=1` — opt-in to OpenAI Responses API (default uses Chat Completions for schema prompts).
  - `COMPUTER_USE_ENABLED=1` — enable “browser” node testing hints in Inspector.


Runbooks
--------
Development (Dev server)
1) Install deps: `npm install`
2) Start: `npm -w @flowpuppy/web run dev`
   - Optional E2E hooks for stable demos: `NEXT_PUBLIC_AGENT_BUILD=1 NEXT_PUBLIC_E2E_HOOKS=1 npm -w @flowpuppy/web run dev`

Production-like start
1) Build: `npm -w @flowpuppy/web run build`
2) Start: `npm -w @flowpuppy/web run start:3001`
3) Visit: `http://localhost:3001/agent`

E2E tests (subset)
1) `NEXT_PUBLIC_AGENT_BUILD=1 NEXT_PUBLIC_E2E_HOOKS=1 npm -w @flowpuppy/web run e2e -- --project=chromium --workers=1 --grep "@planner|@console|@tasks-e2e|@axe|@egress-ssrf"`

Sprint batch (build + tests + push)
1) `npm run sprint:batch` (configured to push to remote `gpt5`/`main`)


Current Status by Backlog ID (DoD mapping)
------------------------------------------
Completed
- AB-011 — Security headers + API-scoped CSP + nonce + frame-ancestors (middleware) with tests.
- AB-305 — SSRF egress deny/allow with tests.
- AB-306 — Log redaction pipeline (secrets redacted in structured logs).
- AB-312/AB-313 — Provider Registry Zod schema and admin CRUD validation and errors.
- AB-403 — Tasks page reflects runs and steps; polling active; E2E verified.

In progress / Outstanding
- AB-401 — Runtime join/race/mapLoop validations: scaffolded runtime validator exists; finalize rule coverage and unit tests.
- AB-404 — Live/mock toggles per provider (feature flags + UI).
- AB-405 — Integration tests in mock mode for core providers.
- AB-601 — Storybook visual snapshots and CI gate (not gating yet).
- AB-602 — Performance budgets and CI checks.
- AB-603 — Keyboard traversal E2E across Builder/Tasks.


Known Gaps (outside strict DoD)
-------------------------------
- OAuth/full live connections UX: inline OAuth experiences to replace demo-only connect/skip flows.
- DB-backed runs (Supabase): E2E uses stubs; full SSE persistence path (runs + steps) to complete with retry policies.
- Page-level CSP: optional; requires careful allowance of Next chunks/inline scripts. Current strategy confines CSP to API routes to avoid breakage.
- Performance baselines: budgets, regressions dashboard and alarms.
- Visual snapshot coverage: link component tokens and Node/Decision cards to snapshots; make non-gating CI optional gate later.
- Keyboard navigation: across Builder/Tasks (tab order, focus rings, escape behavior) beyond current a11y fixes.


Important Implementation Details
--------------------------------
Diff-Apply flow
- Both Quick and Conversational compute diffs vs current FlowDoc, preview them in a floating panel with counts, apply on approval, and record undo. Post-apply, the Testing tab is opened when connections are required.

Graph hygiene and orphan handling
- After applying changes, the store deduplicates triggers, removes stray orphans, and autowires HTTP nodes that look like domains to the first input. Validation errors suggest “Auto-wire sources.”

Inline connections & gating
- Required providers derived from FlowDoc (`data.provider`, `data.secrets[]`). Testing tab blocks Run until connected or explicitly skipped. E2E uses hooks to set state programmatically.

Accessibility measures
- Canvas nodes not focusable; the plus anchor hidden from a11y tree; all Inspector controls labeled; `<title>` on key pages. Axe checks are green.

Console & CSP stability
- Global page CSP removed from `next.config.mjs`; middleware sets CSP only on API responses. This eliminated console errors from blocked Next chunks and inline scripts. E2E noise filters updated accordingly.

LLM routes and E2E stubs
- Planner and conversational routes include deterministic E2E stubs when `NEXT_PUBLIC_E2E_HOOKS=1`, ensuring stable CI without external latency.

Feature flags & localStorage keys
- Flags: `NEXT_PUBLIC_AGENT_BUILD`, `NEXT_PUBLIC_E2E_HOOKS`, `OPENAI_USE_RESPONSES`, `COMPUTER_USE_ENABLED`.
- Common localStorage: `fp-build-mode`, `fp-conn-status`, `fp-convo-*`, `fp-universal-flowdoc`, `fp-next-flowdoc`, right pane open/pinned.


How to Extend (Playbook)
------------------------
1) Implement AB-401 rules in `apps/web/src/lib/orchestrator/validate.ts`; add unit tests.
2) Add provider Live/Mock toggle (AB-404):
   - Extend provider registry and UI to mark providers as mock/live; plumb flag into calls.
   - Add E2E covering both modes; make default mock in CI.
3) Add integration tests (AB-405): embed deterministic mock responses for core providers and cover end-to-end flows.
4) Add Storybook snapshots (AB-601): NodeCard, DecisionCard, Add-Action, ConnectionTile, Canvas with bands, token sheet. Keep non-gating initially.
5) Add perf budgets (AB-602): route-level and component-level budgets with CI checks and trend reporting.
6) Keyboard traversal tests (AB-603): cover left/right panes and Canvas node focus rings, shortcuts, and escape flows.


Troubleshooting Guide
---------------------
- CSP console errors on pages: ensure `next.config.mjs` does not set page CSP; CSP must be API-only in middleware. Rebuild after changing headers.
- E2E hooks not found (`window.convoApi`/`quickApi`): confirm `NEXT_PUBLIC_E2E_HOOKS=1` and that `AppShell` attaches early stubs (it does), and that hydrated page is `/agent`.
- 401 from APIs: run with E2E hooks or provide valid auth for protected routes; planner/generate stubs mitigate CI dependence.
- Mobile tap interception in tests: prefer programmatic hooks instead of clicking over overlays.
- React Flow warnings: 002 warnings ignored; others indicate node/edge type registration bugs.
- Dev server port conflicts: kill `next dev/start` on 3000/3001 before Playwright runs.


Repository & Branching
----------------------
- Private repo: `jawaddxb/Flowpuppy-GPT5` (pushed). Current branch: `main`.
- CI cadence is script-based via `scripts/sprint-batch.mjs`.


Appendix: Key Routes and Panels for Visual QA
---------------------------------------------
- `/agent` — Builder (Left: Quick/Conversational, Center: Canvas, Right: Inspector/Testing/Tasks).
- `/tasks` — Runs list and step timelines.
- Inspector → Testing — required connections gating, Run/Skip, log and history.
- Conversational diff panel — data-testid: `convo-diff-panel`, apply button `convo-diff-apply`.


Acceptance Snapshot
-------------------
At time of handover, the green E2E subset includes:
- `@planner` (planner endpoints + DSL generation mocks)
- `@console` (no console errors on pages)
- `@tasks-e2e` (runs/steps visible with polling)
- `@axe` (no serious a11y violations)
- `@egress-ssrf` (private networks blocked)


