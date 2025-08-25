# Runbook: OAuth, SSE, A11y, Performance Budgets

This document summarizes setup and operational guidance for recent platform features.

## 1) OAuth (Admin Providers)

Endpoints:
- POST /api/admin/providers/[id]/oauth/init?org={orgId}
- GET  /api/admin/providers/[id]/oauth/callback?org={orgId}&state=...&code=...
- POST /api/admin/providers/[id]/oauth/disconnect?org={orgId}

Schema:
- supabase/migrations/0016_oauth_states.sql — tracks OAuth state during flows
- org_provider_settings.secrets — stores tokens per provider/org; presence implies connected

Local dev:
- Without Supabase env, init returns mock authUrl/state; UI will call callback automatically in tests.
- With Supabase, real state is stored; callback upserts secrets with a mock token.

UI:
- Admin Providers shows Connected/Not connected per provider with Connect/Disconnect actions.

## 2) SSE Persistence (Run Streams)

Endpoint:
- POST /api/run/stream — emits SSE with ids (id: n), start/end include runId when created.

Behavior:
- Best-effort insert into workflow_runs (even when workflowId missing).
- run_steps rows are inserted per step with IO redacted and timestamps approximated by durationMs.
- /api/runs/[id]/steps returns items (id, run_id, node_id, name, started_at, finished_at, duration_ms, status, error, input_json, output_json).

Testing:
- @sse @persistence test validates SSE ids and runId presence.

## 3) Accessibility (Admin Providers)

- Regions marked with role="region" and aria-labels.
- Buttons and inputs now have accessible names and aria-pressed for toggles.
- Axe checks run via @axe tests.

## 4) Performance Budgets

Tests in apps/web/tests/perf-budgets.spec.ts:
- time-to-preview ≤ 2000ms
- add-node latency ≤ 250ms
- Bundle-size budgets at /agent: JS ≤ 1600KB, CSS ≤ 500KB, Total ≤ 3500KB (transfer)

Playwright config updates:
- Dedicated "perf" project with stricter timeouts to avoid lockups.
- Dedicated "visual" project to keep snapshot suite isolated.

Running perf-only locally:
- PLAYWRIGHT_PROJECT=perf npm -w apps/web run e2e -- --reporter=list

## 5) Visual Snapshots

- visual-admin-providers.spec.ts captures Admin Providers list and row state.
- visual-components.spec.ts and visual-snapshots.spec.ts cover tokens and canvas/components.

## 6) CI Notes

- Run perf project to gate budgets; adjust thresholds conservatively if environment is slower.
- Ensure DB migrations applied (0016_oauth_states.sql) for runId and connected badges to behave consistently.

