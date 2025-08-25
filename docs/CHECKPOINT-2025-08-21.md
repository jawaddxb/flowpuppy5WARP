## Agent Build — Checkpoint (2025-08-21)

### Scope
- Unified, AI-driven workflow builder across Quick and Conversational modes
- Diff-Apply UX with Undo, narrative overlay, lane bands, anchors, curved edges
- Planner pipeline hardening with structured JSON and retries/fallbacks
- Test gating: Save-before-Test, connection tiles, SSE runner + persistence
- Security: egress allowlist and output redaction
- Admin providers (incl. MCP actions), runs timeline (`/tasks`), token sheet (`/tokens`)

### Backlog mapping (status)
- AB-110 flowId persistence; strict step/nextStep echo: DONE
- AB-206 Diff counts; single-level Undo in Quick+Convo: DONE
- AB-102 Lane bands; X-quantization ≈300px: DONE
- AB-103 Bottom “+” anchors; Y≈+80 insertion; autowire; X snap: DONE
- AB-104 Decision chips with mini “+”; Yes/No conventions: DONE
- AB-105 Email event pills with “+” and child insertion: DONE
- AB-106 Curved edges; centered label chips; primary vs secondary: DONE
- AB-108 Beginner/Pro toggle (persist; Pro Y=32): DONE
- AB-109 Narrative overlay + Back to Chat: DONE
- AB-201/202/203 Planner reliability: OPEN (OpenAI+Claude structured, more tool-use pending)
- AB-205 Golden prompts (≥25): DONE (25 passing)
- AB-301/302/303 Connections derivation; Connect/Skip; Save-before-Test: DONE
- AB-304/305/306 SSRF allowlist/egress; secret redaction/scoping: PARTIAL (allowlist + redaction DONE; scoping OPEN)
- AB-207/307/402/403 SSE per-step retry; runs persistence; /tasks UI: DONE
- AB-601..604 Visual snapshots; a11y; perf budgets; telemetry: PARTIAL (snapshots added; baseline pending)
- AB-901..904 Mini‑apps publish/manifest/embed: OPEN

### What changed (highlights)
- AI planner routes `/api/agent/plan → /confirm → /generate` use strict JSON schemas, repair, retry-once, and provider fallback. OpenAI Responses API with `json_schema` where available; Claude schema-hinted via system prompts.
- Quick and Conversational share the same AgentSpec → FlowDoc → Diff-Apply pipeline; Conversational “Build” wired; zero‑diff UX handled.
- Floating Diff panel: counts; Apply; Refresh preview; Dismiss; Undo (single-level) in Convo; Quick parity.
- Canvas: lane bands and ~300px quantization; bottom anchors; decision chips; email event pills; curved edges with label chips; primary/secondary styling; Beginner/Pro density.
- Narrative overlay: text↔canvas selection; “Back to Chat”.
- Test gating in Right Inspector and Test Sheet: derives required providers from FlowDoc; calls `/api/providers/status`; disables Run until connected or explicitly skipped; Save-before-Test enforced; Skip (Simulated) available.
- SSE run via `/api/run/stream`: per-step retry (exponential backoff), node focus on error, runs persisted to `workflow_runs`/`run_steps`; new `/tasks` page lists runs and step timelines.
- Egress allowlist: new `@/lib/egress.ts` with `safeFetch` and HTTPS+public DNS enforcement; applied to AI providers and integrations; executor HTTP node host-allowlist tightened; output redaction via `@/lib/redact` on streamed inputs/outputs.
- Admin providers UI: MCP add + tools discovery actions; provider registry hooks present.
- Golden prompts: 25 prompts added with a Quick-mode sweep test (all passing).
- Token sheet `/tokens` + visual snapshot tests scaffolding (baseline generation required on first run).

### Acceptance criteria vs master spec
- Source of truth: FlowDoc edits only; React Flow is a projection: OK
- Three panes layout: Left=Chat, Center=Canvas, Right=Inspector/Test: OK
- Lanes, anchors, decision chips, event pills, edges styling: OK
- Insertion rule and X/Y snapping: OK
- Beginner/Pro toggle (density only): OK
- Narrative overlay: OK
- Planner JSON-only, Zod validations, repair/fallback: OK (expand tool-use next)
- Diff-Apply counts; Apply records Undo: OK
- Connections required; status endpoint; block Test until ready: OK
- Save-before-Test; SSE with per-step retry; persistence; `/tasks` <1s reflect: OK
- Tokens: left 360px, lane 300px, gutter 24, padding 24, radius 12, border `#e2e8f0`, title 15/#0f172a, sub 12/#475569, band rgba(241,245,249,.35), focus ring 2px #2563eb, chips 12px (20–22px), event pills 26px: OK
- Visual snapshots (CI-blocking): PARTIAL (tests added; baseline pending)

### Security posture
- Egress allowlist (SSRF mitigation):
  - File: `apps/web/src/lib/egress.ts` with `ensureHostAllowed()` and `safeFetch()`
  - Denies private IPv4/IPv6 and `localhost` by default; HTTPS enforced unless `HTTP_ALLOW_HTTP=1`
  - Default allowlist covers: `api.openai.com, api.anthropic.com, openrouter.ai, slack.com, hooks.slack.com, discord.com, sheets.googleapis.com, api.notion.com, api.airtable.com`
  - Applied in: `lib/providers.ts`, `lib/executorIntegrations.ts`; executor HTTP node also has an internal allowlist check.
- Redaction: `@/lib/redact` applied to streamed run inputs/outputs in `/api/run/stream` for step persistence.
- Secrets: stored encrypted; decrypted at run time; scoping/least‑privilege tracking is OPEN.

### E2E status
- Mocked suites: PASS
- Interactive suites (Quick + Conversational): PASS
- Golden prompts (25): PASS
- Visual snapshots: first run writes actuals; baseline required

### QA plan (commands only)
```bash
# 0) Kill any dev servers on 3000/3001 and start a clean server on 3001
pkill -f "next dev -p 3001" || true; pkill -f "next dev -p 3000" || true;
lsof -i :3000 -sTCP:LISTEN -n -P | awk 'NR>1 {print $2}' | xargs -r kill -9;
lsof -i :3001 -sTCP:LISTEN -n -P | awk 'NR>1 {print $2}' | xargs -r kill -9;
cd apps/web && PORT=3001 NEXT_PUBLIC_E2E_HOOKS=1 npm run dev
```
```bash
# 1) Mocked CI flows
cd /Users/jawad/Documents/Flowpuppyv4 && E2E_TEST_FILES='tests/e2e-mocked.spec.ts tests/e2e-mocked-convo.spec.ts' node scripts/e2e-run.mjs
```
```bash
# 2) Interactive (Quick + Conversational)
cd /Users/jawad/Documents/Flowpuppyv4 && E2E_TEST_FILES='tests/ai-interactive.spec.ts tests/quick-interactive.spec.ts' node scripts/e2e-run.mjs
```
```bash
# 3) Golden prompts sweep (25)
cd /Users/jawad/Documents/Flowpuppyv4 && E2E_TEST_FILES='tests/golden-quick.spec.ts' node scripts/e2e-run.mjs
```
```bash
# 4) Visual snapshots — first run creates baseline (or update when intentional changes)
cd /Users/jawad/Documents/Flowpuppyv4/apps/web && npx --yes playwright test tests/visual-snapshots.spec.ts --update-snapshots
# then validate
cd /Users/jawad/Documents/Flowpuppyv4/apps/web && npx --yes playwright test tests/visual-snapshots.spec.ts
```
```bash
# 5) Provider health checks (optional)
curl -s http://127.0.0.1:3001/api/providers/status | jq
```

### Visual checkpoint (open these)
- `/agent` (Builder)
  - Left Chat → “Proposed Workflow” block
  - Canvas (zoom ≈0.9 to see lane bands)
  - Right Inspector → Testing: verify Connect/Skip gating, Save-before-Test, Run streaming
- `/tasks` → open newest run; expand step timeline
- `/tokens` → verify token values and lane swatches

### Environment
- Required keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (optional fallbacks: `OPENROUTER_API_KEY`, etc.)
- Test hooks: `NEXT_PUBLIC_E2E_HOOKS=1`
- Egress: `HTTP_ALLOWLIST` (comma-separated), optional `HTTP_ALLOW_HTTP=1` for explicit HTTP opt-in

### Known issues and mitigations
- Occasional 4xx/5xx from upstream LLMs: mitigated with retry-once and provider fallback; debug dumps enabled in E2E.
- Visual drift breaks snapshots: re-run with `--update-snapshots` when changes are intentional; otherwise treat as regression.
- Secrets scoping by workflow/step remains OPEN; current redaction prevents leakage in persisted logs.

### Next steps (priority)
1) Planner reliability: add Anthropic tool-use + broader provider set; attach per-turn telemetry
2) Secrets scoping and masked previews in UI (Connection tiles + Testing)
3) Visual snapshots: expand coverage (NodeCard, DecisionCard, Add-Action, ConnectionTile, Canvas states) and gate in CI
4) A11y keyboard traversal and perf budgets; dashboards
5) MCP provider registry polish: tool counts, per-org secrets UI; mini‑apps publish path

CHECKPOINT READY FOR VISUAL
- `/agent` (Builder)
- Left Chat → “Proposed Workflow” block
- Canvas (zoom 0.9 to see lane bands)
- Right Inspector → Test tab (run a sample)
- `/tasks` → open newest run
- `/tokens` → design token sheet


