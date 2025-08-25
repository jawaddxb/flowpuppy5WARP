### Locked Backlog

This backlog is locked for the next two sprints and maps directly to the phase spec. Each item has acceptance criteria and test artifacts to produce.

## Sprint A (close gaps in Phases 1, 2, 3, 4)

- **Phase 1 polish (a11y/shortcuts/UX edges)**
  - Add aria labels/roles to palette and canvas actions; ensure focus trap inside modals; keyboard-only navigation QA.
  - Acceptance: Keyboard navigation walkthrough doc; axe rules pass on core pages; unit tests for palette kb nav.
- **Phase 2 hardening (planner/routing)**
  - Provider fallback breadth (order: Claude → OpenAI → Mistral → Gemini → DeepSeek → Qwen → fallback).
  - Improve JSON recovery and error messaging in planner; add test prompts set (≥25) with golden checks.
  - Acceptance: All prompts produce valid DSL v2.1; tests green; admin usage logging populated or safely no-op.
- **Phase 3 persistence + safety**
  - Implement `/api/runs` and `/api/runs/:id/steps` (GET list, GET details) backed by DB; wire `RunHistory` to it.
  - Add SSRF allowlist to `execHttp` (host allow + method whitelist + max body size) and unit tests.
  - Sandbox transform execution (isolated runner with time/CPU cap) for server runtime; tests for limits.
  - Acceptance: E2E for run stream + persisted history; security unit tests cover SSRF block cases; transform timeouts enforced.
- **Phase 4 integrations E2E + docs**
  - Live-or-mock toggles per integration via env presence; document envs and examples.
  - Add mock integration adapters for CI; write integration tests for Slack, Email, Discord, Notion, Sheets, Airtable.
  - Acceptance: CI runs integration tests in mock mode; manual live checklists documented; examples runnable.

## Sprint B (Phases 5, 6 foundations; Phase 0/10 infra)

- **Phase 5 Templates (50)**
  - Curate 50 templates across categories (CRM, Ops, Marketing, Support, DevOps, Finance, HR).
  - Implement gallery import UX; fixtures with anonymized data.
  - Acceptance: 50 templates load and validate; install/import flows covered by e2e.
- **Phase 6 Multitenancy + Billing (Stripe)**
  - RLS policies across tables; org invites/roles; Stripe subscription skeleton (customer + price + portal) in test mode.
  - Acceptance: RLS tests; role-based access tests; Stripe webhooks handled and reflected in plan column.
- **Phase 0/10 Infra & Security**
  - CI/CD with typecheck, lint, unit, integration (mock), e2e gates; preview deploy.
  - CSP and security headers; basic observability hooks; perf budgets in build.
  - Acceptance: CI green with gates; security headers present; perf budget report generated.

## New: Hosted Mini‑Apps (Embeddable)

- **Goal**: Package any workflow as a hosted mini‑app on this site (no extra deployment) with instant publish, and an embeddable widget.
- **Deliverables**
  - App Manifest (name, slug, icon, inputs schema/overrides, result cards, theme, visibility/quotas)
  - Routes: `GET /a/[slug]` (hosted web app), `GET /apps/[slug]/manifest`, `POST /apps/[slug]/run`, `GET /apps/[slug]/stream`
  - Web Component served from this app: `GET /widget/v1.js` (renders via manifest + stream)
  - Publish from Builder (one‑click), share link + embed snippet
  - Theming + a11y; anonymous quotas; per‑origin allowlist for embeds
  - Docs: embed, API, security, quotas
- **Acceptance**
  - Publish a workflow and access it instantly at `/a/example`
  - Embed on a test page using the snippet; runs succeed with SSE visuals
  - Inputs validated server‑side; secrets never exposed; quotas enforced

## Cross-cutting deliverables

- **Docs**: Reference for AI chat-to-workflow, integrations, security model, phase acceptance.
- **Tests**: Unit + integration (mock) + e2e where applicable.
- **Feature flags**: Guard risky integrations; default off unless keys provided.


## Completed (to date)

- **Chat-to-Workflow v1**
  - Conversational Create screen with assistant chat bubbles, quick replies, and auto-scroll.
  - Parallel Explain + Generate: narrative streams while a valid DSL is produced as early as possible; `[[DSL]]` chunks parsed and applied.
  - Heuristic narrative→DSL builder to keep the Live Sketch responsive if planner is slow.
  - Live Sketch panel renders the current DSL using ELK layered layout (top-down) and safe fit.
  - Accept Plan converts DSL→graph, applies top-down layout, and opens Builder.
  - Persistent chat: thread + DSL + view state survive navigation; Builder adds “Back to Chat” for round-trips and further refinement.
  - Planner output constrained to JSON-only; raw JSON filtered from chat UI.

- **Canvas UX updates**
  - Top-down ELK layout available in Builder and auto-applied on Accept; layout action exposed in toolbar/commands.
  - Improved navigation: pan on scroll, zoom on scroll/pinch, space-to-pan preserved.
  - Alignment guides, frames (group/ungroup), selection ops, edge labels/guards, keyboard shortcuts, viewport persistence.


