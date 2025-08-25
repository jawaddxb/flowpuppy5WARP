# FlowPuppy GPT5

FlowPuppy GPT5 is a Next.js (App Router) web app for building AI-powered workflows in two modes:
- Quick: guided setup that generates a workflow and presents a diff for apply.
- Conversational: chat-first orchestration that proposes structured changes (diff previews) with inline connections and testing.

Source-of-truth is a typed FlowDoc. The React Flow canvas renders a projection of FlowDoc and never mutates state directly. The system uses schema-first prompts, JSON repair, Zod validation, and deterministic E2E stubs for reliable CI.

## Monorepo layout
- apps/web — Next.js 14 app (React 18 + Tailwind), APIs, UI, tests
- packages/shared — shared types and utils
- packages/database — DB helpers (Supabase)
- scripts — batch and QA scripts (sprint, providers, planner, QA pipeline)

## Quickstart
Prereqs: Node 20.x

1) Install
- npm ci

2) Environment (apps/web/.env.local)
Add at least one API key (OpenRouter is a good fallback). Optional Supabase keys for local dev.

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
MISTRAL_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
QWEN_API_KEY=
OPENROUTER_API_KEY=

# Optional Supabase (local dev)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional integrations used in some DSLs
TWITTER_BEARER=

3) Run dev server
- npm -w @flowpuppy/web run dev
- Optional stable demo flags:
  - NEXT_PUBLIC_AGENT_BUILD=1 NEXT_PUBLIC_E2E_HOOKS=1 npm -w @flowpuppy/web run dev
- Visit: http://localhost:3000/agent

4) Production-like
- npm -w @flowpuppy/web run build
- npm -w @flowpuppy/web run start:3001
- Visit: http://localhost:3001/agent

## E2E tests (stable subset)
Run with deterministic stubs:
- NEXT_PUBLIC_AGENT_BUILD=1 NEXT_PUBLIC_E2E_HOOKS=1 \
  npm -w @flowpuppy/web run e2e -- --project=chromium --workers=1 --grep "@planner|@console|@tasks-e2e|@axe|@egress-ssrf"

## Security
- API-scoped CSP via middleware to avoid blocking Next page scripts
- Security headers: X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- SSRF protections for egress
- Secrets encryption and log redaction

## Docs & Handover
- Handover: warphandover.md
- Master spec: docs/agent-build-master.md
- Engineering reference: docs/reference/ENGINEERING_REFERENCE.md

## CI
- Build & unit: .github/workflows/ci.yml (Node 20)
- E2E (stable subset): .github/workflows/e2e.yml (Node 20 + Playwright)

## Roadmap (high level)
- AB-401: Complete runtime join/race/mapLoop validator + unit tests
- AB-404: Live/Mock toggles for providers
- AB-405: Integration tests (mocked) for core providers
- AB-601/602/603: Visual snapshots, performance budgets, keyboard traversal E2E

