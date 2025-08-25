## FlowPuppy Engineering Reference (v1)

This document consolidates core engineering practices, system architecture, and DoD-aligned execution policies. It supersedes ad‑hoc execution/status/checkpoint notes. The master product/UX spec remains `/docs/agent-build-master.md`.

### 1. Architecture overview
- Next.js App Router; React components with Zustand stores.
- Core artifacts:
  - FlowDoc v1.1 (Zod schema) as the canonical source; projections to React Flow (canvas) and runtime DSL.
  - Planner pipeline: `/api/agent/(plan|confirm|generate)`; LLM providers with fallback and JSON repair.
  - Runs/Tasks: `/api/runs`, `/api/runs/:id/steps`, `/api/run/stream` (SSE), with DB stub fallback.

### 2. Reliability and providers (AB-204)
- Unified helper enforces: provider fallback → JSON repair → Zod validation → logs with attempt outcomes.
- Low temperature for structured endpoints; debug artifacts saved in E2E when enabled.

### 3. FlowDoc validation (AB-001)
- Stricter rules: duplicates, lane validity, start nodes, no orphans, decision branches and labels, cycles.
- UI surfacing in Right Inspector with warnings (soft) and errors (strict).

### 4. Canvas interaction
- Lane quantization, snap-to-align, decision chips, event pills, anchors for Add-Action, Undo snapshot.
- Node draggability with Y persistence and lane/rank updates.

### 5. Secrets and providers (AB-304/319)
- AES-GCM encryption in app; rotation stub; redaction expectations.
- Vault/KMS integration planned (flags) with envelope encryption (AB-420).

### 6. Security and headers
- Middleware sets security headers; rate limiting and correlation IDs planned.

### 7. Testing strategy
- CI runs in production mode (`next build && next start`) with E2E hooks for deterministic seeds.
- Gates: functional flows, console cleanliness, perf budgets, admin providers, tasks.
- Visual tests optional; focus on functional/perf by policy.

### 8. Operational modes
- DB stubs for CI/default; optional ephemeral DB matrix for realism.
- E2E auth bypass for admin in CI only; disabled in prod.

### 9. Backlog linkage
- Active and completed AB items are tracked in PR descriptions and code comments; use AB IDs in commits and tests.

### 10. References
- Master spec: `/docs/agent-build-master.md`
- Cursor rules: `/docs/cursor-rules.md`
- Security: `/docs/reference/SECURITY.md`

— End —


