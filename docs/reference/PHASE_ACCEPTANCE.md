### Phase Acceptance Criteria

- **Phase 0**: Turborepo; Supabase config/migrations; CI/CD pipeline with typecheck, lint, unit, integration (mock), e2e; PWA skeleton.
- **Phase 1**: Canvas UX (align/distribute, frames, shortcuts, persistence); schema-driven Inspector; Node Palette with favorites + kb nav; Validation Summary; Undo/Redo; DSL v2.1 import/export; a11y pass.
- Status: COMPLETE (plus: pan-on-scroll/zoom, ELK top-down layout, frames HUD, viewport persistence)
- **Phase 2**: Planner API with strict JSON; threaded chat refine + diff/patch; Provider routing (global→org), health checks, usage logging; ≥25 planner tests; fallback matrix documented.
- Status: PARTIAL (strict JSON planner integrated; chat explain/generate wired with persistence; fallback routing in place; test suite ongoing)
- **Phase 3**: Async executor with retries/backoff, timeouts, try/catch/switch; SSE streaming; Runs persisted with steps; Secrets CRUD + injection/redaction; HTTP SSRF guard; transform sandbox.
- Status: PARTIAL (executor retries/backoff/timeouts done; SSE streaming for run/testing; RunHistory UI wired; secrets CRUD UI; SSRF/sandbox items pending)
- **Phase 4**: Integrations (Slack, Email, Discord, Notion, Sheets, Airtable) with live-or-mock; integration tests; docs with examples.
- Status: PARTIAL (env toggles/docs created; node types render in Live Sketch/Builder; mock/live adapters and tests in progress)
- **Phase 5**: 50 curated templates; gallery picker; import flow; validation on load.
- **Phase 6**: Org RLS policies; invites/roles; Stripe subscription test-mode + webhooks; plan reflected.
- **Phase 7**: Hosted Mini‑Apps & Embed SDK
  - Hosted pages at `/a/[slug]`; manifest + run/stream routes; one‑click publish from Builder
  - Web Component served from app; instant embed without extra deployment
  - PWA manifest/SW for standalone mobile shell
- **Phase 8**: Admin analytics/health dashboards; drill-downs; usage aggregation.
- **Phase 9**: VanarChain contracts + wallet adapters; NFT-gated access; IPFS storage docs.
- **Phase 10**: Perf budgets; CSP/sandboxing; observability hooks; release checklist.


