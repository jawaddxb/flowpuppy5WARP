# API Contracts (Phase 1)

## POST /api/ai/generate-workflow
- Request: JSON { prompt: string, orgId?: string }
- Response (200): { dsl: WorkflowDsl, rationale: string, confidence: number, missingSecrets: string[] }
- Notes: Logs usage in ai_usage_events when Supabase is configured (providerName, latencyMs, tokens).

## POST /api/run/stream (SSE)
- Request: JSON { workflowId?: string, dsl: WorkflowDsl, input?: any }
- Response: text/event-stream with events
  - start: { type: 'start', at, nodes, edges }
  - step: { type: 'step', nodeId, name?, status: 'ok'|'error', input?, output?, error?, durationMs? }
  - end:   { type: 'end', at, ok, durationMs?, error? }
- Persistence: inserts workflow_runs on start (if workflowId), appends run_steps for each step, updates workflow_runs on finish.

## GET /api/workflow-versions?workflowId=UUID
- Returns versions list for a workflow

## GET /api/workflow-versions/:id
- Returns { id, version, graph_json, created_at }

## Admin
- GET /api/admin/providers/health → { items: [{ name, ok, latencyMs? }] }
- GET /api/admin/routes?purpose=... → { items: [{ id, org_id?, purpose, priority_json: [{ type, model? }] }] }
- POST /api/admin/routes { purpose, priority_json }
- PATCH /api/admin/routes { id, priority_json }
- GET /api/admin/usage → aggregates last 24h usage by provider

