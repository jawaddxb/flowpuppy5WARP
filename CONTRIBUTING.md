# Contributing to FlowPuppy GPT5

Thanks for contributing! This guide summarizes local setup, conventions, and CI expectations.

## Getting started
- Node 20.x
- Install: `npm ci`
- Run dev: `npm -w @flowpuppy/web run dev`
- Stable demo flags (deterministic stubs):
  - `NEXT_PUBLIC_AGENT_BUILD=1 NEXT_PUBLIC_E2E_HOOKS=1`
- E2E (stable subset, Chromium):
  - `NEXT_PUBLIC_AGENT_BUILD=1 NEXT_PUBLIC_E2E_HOOKS=1 npm -w @flowpuppy/web run e2e -- --project=chromium --workers=1 --grep "@planner|@console|@tasks-e2e|@axe|@egress-ssrf"`

## Branching & commits
- Use conventional commits when possible (feat:, fix:, chore:, docs:, test:, ci:)
- Keep PRs scoped; include screenshots for UI changes

## Linting & type checking
- Typecheck: `npm run typecheck`
- Lint is run within Next build; please address React hooks warnings where feasible
- Prefer fixing dependencies arrays for `react-hooks/exhaustive-deps`; if a dependency causes churn, wrap mutable refs or use stable callbacks. Only disable the rule inline when justified and add a comment explaining why.

## Testing
- Unit: packages may add Vitest tests
- E2E: Playwright tests live in `apps/web/tests`. Tag tests appropriately (`@planner`, `@console`, `@tasks-e2e`, `@axe`, `@egress-ssrf`, `@visual`, `@perf`). Stable subset runs in CI.

## Security & headers
- CSP is applied to API routes via middleware. Do not add page-level CSP in `next.config.mjs`.
- Keep SSRF protections intact; tests must remain green.

## Roadmap pointers
- AB-401: runtime join/race/mapLoop validations + unit tests
- AB-404: Live/Mock toggles per provider (UI + plumbing)
- AB-405: Integration tests with deterministic mocks
- AB-601/602/603: Visual snapshots, performance budgets, keyboard traversal

## Opening PRs
- Ensure: `npm ci && npm run typecheck && npm run build` pass
- For E2E-affecting changes, run the stable subset locally with the flags above

Happy building!

