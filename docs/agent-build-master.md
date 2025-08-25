Here’s the **fully merged, no-gaps** master spec with all patches integrated. You can drop this in as `/docs/agent-build-master.md`.

---

# Agent Build — Master Specification (v2.0, AI-Driven)

> **MASTER SPEC — SOURCE OF TRUTH**
>
> This document supersedes and replaces the following legacy documents:
>
> * `docs/agent-build-DoD.md`
> * `docs/agent-build-spec.md`
>
> **Effective:** 2025-08-15
> **Status:** Authoritative. All implementation, reviews, and QA **MUST** reference this document.
> **Note:** The legacy docs are retained in `docs/archive/` for historical reference only and **must not be edited**.

---

## 0) Invariants (must always hold)
<!-- AB-001, AB-002 -->

### 0.0) Process & execution policy (Cursor)

All engineering work MUST follow `/docs/cursor-rules.md` (Cursor Rules — Agent Build v2.0). Key requirements:

* Work only the DoD for the targeted backlog **<ID>** from `/docs/LOCKED_BACKLOG.md`; touch ≤ 6 files per cycle.
* Cycle: **DESCRIBE → PREDICT → EDIT → VERIFY**; after edits, print a **QA plan (commands only)**. If any command fails, fix and re-print.
* Stop immediately when a visual checkpoint is reached, file limit is hit, or tokened UI diffs exceed 40 lines.
* Output a **CHECKPOINT READY FOR VISUAL** section indicating exact routes/panels to open for review.
* Safety rails: obey spec even if tests are green; strict JSON schemas; on validation failure attempt repair → provider fallback → surface user-visible error.

These rules are normative and part of acceptance criteria; PRs must cite the specific spec sections and backlog IDs they satisfy.

* **Single source of truth:** The Builder edits a versioned **FlowDoc** JSON. Canvas (React Flow) and the runtime DSL are *projections of FlowDoc*. No direct canvas edits bypass FlowDoc.
* **Three panes:** **Left** = Builder Chat (with Plan Summary & Connections), **Center** = Canvas, **Right** = Inspector + Test.
* **Phases/Lanes:** Four conceptual phases: **Input → Transform → Decision → Output**.

  * **X quantization is always on** (≈300px columns).
  * **Lane bands are optional UI:** hidden by default; auto-show at `zoom ≥ 0.8` or via a toggle.
* **Add-Action catalog (tab order is exact):** **Top, Apps, Chat, AI, Logic, Scrapers, By FlowPuppy**.
* **Design tokens (global & enforced):**

  * Layout: left panel **360px**, lane column **300px** (±20), gutter **24**, canvas outer padding **24**
  * Cards: radius **12**, border `#e2e8f0`, soft two-layer shadow, hover-lift
  * Typography: title **15px / #0f172a**, subtitle **12px / #475569**
  * Lane band tint: `rgba(241,245,249,.35)`
  * Animations: **100–120ms**; focus rings **2px #2563eb**; hit targets **≥36×36**
* **Save-before-Test:** Test actions are disabled when FlowDoc is dirty or required connections are missing.
  * Mock-first: If live keys are absent or mock mode is enabled, Test may proceed after user selects **Skip (Simulated)**. Simulated runs must use deterministic, prompt-aware mock data with a visible banner.

### 0.1) Beginner / Pro display modes

* **Beginner (default for new users):** Expanded node labels (title + subtitle), helper copy in Inspector, connector hints in Left/Chat, branch chip tooltips; edge label chips show full guard text (e.g., “has NFT”, “no NFT”).
* **Pro (toolbar toggle):** Compact node cards (title only), minimal chip text, subtler lane bands, fewer helper callouts; canvas density can use **dense Y 32** rhythm.
* **Persistence:** Mode is per-user and never changes FlowDoc.

---

## 1) Glossary
<!-- AB-001 -->

* **FlowDoc:** Versioned JSON describing lanes, nodes, and edges; the canonical representation of a workflow/agent.
* **AgentSpec:** Deterministic, higher-level plan that the generator turns into FlowDoc.
* **Planner pipeline:** `/api/agent/plan → /api/agent/confirm → /api/agent/generate` (JSON only).
  * Mock-first: when live keys are absent or mock mode is enabled, endpoints must return deterministic, prompt-aware mock data that validates schemas and supports visual previews without secrets.
* **Diff-Apply:** Preview changes (nodes/edges added/removed/changed) before mutating FlowDoc, with a single-step **Undo**.
* **Runs/Tasks:** Persistent execution logs (`workflow_runs` + `run_steps`) surfaced at `/tasks`.
* **By FlowPuppy:** House label used in UI where a provider/category is “ours”.

---

## 2) FlowDoc (source of truth)
<!-- AB-001, AB-002, AB-003 -->

### 2.1 JSON shape (v1.1)

```json
{
  "version": "1.1",
  "meta": { "name": "My Agent", "createdAt": 0, "updatedAt": 0 },
  "lanes": [
    { "id": "lane-input", "title": "Input", "order": 1 },
    { "id": "lane-transform", "title": "Transform", "order": 2 },
    { "id": "lane-decision", "title": "Decision", "order": 3 },
    { "id": "lane-output", "title": "Output", "order": 4 }
  ],
  "nodes": [
    {
      "id": "n-trigger",
      "type": "input",
      "title": "Hourly trigger",
      "laneId": "lane-input",
      "data": { "kind": "schedule", "cron": null, "interval": "hourly", "tz": "UTC" }
    },
    {
      "id": "n-fetch",
      "type": "action",
      "title": "Get Prices",
      "laneId": "lane-transform",
      "data": { "provider": "http", "method": "GET", "url": "https://...", "headers": {}, "body": null, "timeoutMs": 10000 }
    },
    {
      "id": "n-route",
      "type": "decision",
      "title": "Route",
      "laneId": "lane-decision",
      "data": { "branches": ["CHARGE","SELL","HOLD"], "forceSelect": true }
    },
    {
      "id": "n-emailOK",
      "type": "output",
      "title": "Email: CHARGE",
      "laneId": "lane-output",
      "data": {
        "provider": "gmail",
        "eventPills": [
          {"id":"afterSent","label":"After email sent"},
          {"id":"afterReply","label":"After reply received"}
        ],
        "to": "", "cc": "",
        "subjectTpl": "Action: Charge",
        "bodyMode": "promptAI", "body": "",
        "attachments": []
      }
    }
  ],
  "edges": [
    { "id":"e1","source":{"nodeId":"n-trigger"},"target":{"nodeId":"n-fetch"} },
    { "id":"e2","source":{"nodeId":"n-fetch"},"target":{"nodeId":"n-route"} },
    { "id":"e3","source":{"nodeId":"n-route"},"target":{"nodeId":"n-emailOK"},"label":"CHARGE" }
  ]
}
```

### 2.2 Validation rules

* No orphan nodes (all except inputs must be reachable from at least one input).
* Decision nodes must have **≥1 outgoing** edge; **edge labels** must match the node’s `branches`.
* Required secrets unresolved ⇒ **warning** (blocks Test unless user overrides).
* Loops well-formed: non-negative `maxCycles`/`maxConcurrent`; `gather` optional.
* Canvas DAG discipline (runtime may parallelize but canvas remains acyclic).

### 2.3 Guard & decision conventions

* **Ports:** For binary decisions, **Left = No/False**, **Right = Yes/True** (visual orientation and keyboard traversal).
* **Auto-labeling:** Boolean decisions auto-label chips and `edge.label` as **Yes/No**. Multi-way decisions use explicit branch strings (e.g., CHARGE/SELL/HOLD).
* **Validation:** Warn if a decision is boolean-semantic but lacks Yes/No labels, or if edge labels don’t match `data.branches`.

---

## 3) Conversational Builder (revised methodology)
<!-- AB-101, AB-102, AB-103, AB-104, AB-105, AB-106, AB-107, AB-108, AB-109, AB-110 -->

### 3.1 State machine

`idle → clarifying → planning → confirming → generating → preview → connecting → testing → publishing`

* **idle:** new/loaded agent; composer visible.
* **clarifying:** system asks up to N numbered questions (chips/forms).
* **planning:** model proposes **options** (cards) with sensible defaults.
* **confirming:** user picks options → deterministically builds **AgentSpec**.
* **generating:** convert AgentSpec → **FlowDoc preview**; **validate** + compute **Diff**.
* **preview:** show **Plan Summary** (numbered with sub-steps) and **Diff Preview**; ask **Proceed?**
* **connecting:** render **Connect {Provider}** chips inline; connect or skip with warning.
* **testing:** run; stream steps to chat + right panel; persist runs/steps.
* **publishing:** (optional) create a hosted mini-app.

### 3.2 Left panel (Builder Chat) — required behaviors

* **MessageList** supports streaming assistant tokens and *structured messages*:

  * **Plan block:** “Proposed Workflow” as a **numbered list** with **sub-steps** (`4a`, `4ai`), step titles **bold**, and `[Provider • Action]` tags.
  * **Updated Workflow** on refinements, same format.
  * **Build Progress Feed**: tick/cross lines (e.g., `✓ Getting actions for Timer`, `✗ Provider missing`), then `✓ Update Agent`.
  * **Connector Chips**: rounded, with icons; clicking launches OAuth/API-key sheet; status updates live.
  * **“Build Agent / Go to Agent”** card with a **“Viewing current agent”** status pill once applied.
* **Composer:** Enter sends; Shift+Enter newline; suggestion **chips** appear after assistant turns (e.g., “Add Condition”, “Connect Gmail”).
* **Proceed checkpoint:** Before mutating FlowDoc, user taps **Proceed** (or types “proceed”). Show a **brief Diff**, then **Apply** automatically; record an **Undo** snapshot.

### 3.3 Planner pipeline (contracts)

All endpoints **return JSON only** and **must validate** against Zod schemas.

* **POST `/api/agent/plan`** → returns `{ options, defaults, nextQuestions }`
* **POST `/api/agent/confirm` { selections }** → `{ "agentSpec": { … } }` (deterministic; no prose)
* **POST `/api/agent/generate` { agentSpec }** → `{ "flowDoc": { … } }` (validated; warnings if outputs/guards added)

### 3.4 LLM orchestration & reliability

* **Provider fallback:** Claude → OpenAI → Mistral → Gemini → DeepSeek → Qwen → **JSON repair heuristic**.
* **Temperatures:** low (0–0.3) for plan/confirm/generate.
* **Logging:** provider, prompt id, tokens, repair reasons—attached to the chat turn (diagnostics hidden by default).
* **Strict schemas:** If validation fails: repair → fallback → user-visible error with retry.

### 3.5 Diff-Apply contract

```ts
type Diff = {
  nodesAdded: Array<{id:string; title:string; type:string; laneId:string}>;
  nodesRemoved: string[];
  nodesChanged: Array<{id:string; before:any; after:any}>;
  edgesAdded: Array<{source:string; target:string; label?:string}>;
  edgesRemoved: Array<{source:string; target:string}>;
};
```

* Display concise counts + drill-down details.
* **Apply** merges preview → FlowDoc, re-layout (see §4.3), record **Undo** (one level).

### 3.6 Narrative overlay & chat linking

* Hovering a **Plan** bullet highlights the corresponding node(s)/edge(s) on the canvas; clicking zooms/scrolls to fit.
* Selecting a canvas node highlights the matching bullet in the latest **Plan/Updated Workflow** block in chat.
* A **“Back to Chat”** button appears in Builder toolbar when the left panel is scrolled away from the chat view.

### 3.7 Conversational Flow Mode (flowId + quick actions)

To support a guided “conversational” build UX, the chat flow maintains a persistent flow identity and deterministic step progression.

Requirements:

* The server returns a `flowId` string on the first turn (derived from the initial prompt), and the client MUST echo it back on subsequent turns (including quick actions). Example values: `"aiTweets"`, `"healthTweets"`, `"slackDigest"`.
* Flow selection order: If the initial `prompt` matches a known flow, set `flowId` accordingly; otherwise default to a generic flow. On subsequent turns, `flowId` takes precedence over prompt heuristics.
* Quick actions include the current `step` index and the `flowId`. The server responds with `nextStep` equal to the index of the next step (increment by 1 only). Clients must not double-increment.
* The server MUST include `flowId` in the returned `context` so clients can persist it between turns.

Example request/response (illustrative):

```json
// Request (quick action)
{
  "flowId": "aiTweets",
  "step": 1,
  "action": "simulated",
  "context": { "flowId": "aiTweets", "mode": "simulated" }
}

// Response
{
  "message": "Do you want to add a short 2‑reply thread and a compact source citation?",
  "quickActions": [
    { "label": "Add 2‑reply thread", "value": "add-thread" },
    { "label": "Add citation", "value": "add-citation" },
    { "label": "Skip for now", "value": "skip" }
  ],
  "nextStep": 2,
  "context": { "flowId": "aiTweets", "mode": "simulated" }
}
```

Notes:

* This conversational mode is a UI helper and does not alter the Planner pipeline contracts (§3.3). It should ultimately produce `AgentSpec` selections and invoke `/confirm` and `/generate` as usual.

---

## 4) Canvas interaction & visuals
<!-- AB-101, AB-102, AB-103, AB-104, AB-105, AB-106 -->

### 4.1 Anchors (“+” everywhere)

* **Bottom “+”** on every node (opens Add-Action at that anchor).
* **Decision branch chips on the node** (e.g., CHARGE/SELL/HOLD) with a mini “+”; inserted node inherits the branch label on its incoming edge.
* **Event pills** under Email outputs: **“After email sent”** and **“After reply received”**, each with a mini “+”.
* **Insertion rule:** place at `Y = sourceY + ~80`, **autowire** from anchor; X snaps to lane column derived from catalog tab/kind.

### 4.2 Edges

* **Curved (Bezier) edges** with centered **label chips** (guard text).
* Optional **primary path** styling (higher contrast) vs. secondary faint.

### 4.3 Layout

* Lanes: columns (≈300px) with 24px gutter; lane headers 32 high; band tint per tokens.
* Y rhythm **48** (dense **32**); branch siblings separated **≥96**; children start under chip row.
* Minimap bottom-right; Fit and zoom controls; Fit on `F`.
* A11y: hitboxes **≥36×36**; keyboard traversal: nodes → anchors → chips → pills → modal.

### 4.4 Visual tokens — headers, chips, ghost route

* **Lane headers:** 12px uppercase, color `#334155`; height **32px**; bands tinted `rgba(241,245,249,.35)` across the column.
* **Chips & pills:** branch/edge chips font **12px**, min height **20–22px**, horizontal padding **8px**, radius **9999px**; event pills height **26px**, inner “+” hit target **≥20px**.
* **Primary path / ghost route:** When a primary path is flagged (or inferred as longest), its edges use stroke `#94a3b8` at full opacity; secondary edges at **\~60–70%**. Minimap shows a faint ghost route of the primary path.

---

## 5) Inspector & Test (right panel)
<!-- AB-107, AB-303 -->

* **Inspector (schema-driven):** Basics, Provider/Config, **AI Params (Ask-AI)**, Decision branches, Postconditions, Validation messages. **All fields write back to FlowDoc**.
* **Test (side-sheet/tab):**

  * Save-before-Test enforced.
  * Trigger picker; **SSE streaming** step cards with status, duration, excerpts.
  * Per-step **Retry**; clicking a failing step **focuses the node** and opens Inspector.

**SSE sample:**

```
event: step
data: {"id":"fetchPrices","status":"running"}

event: step
data: {"id":"fetchPrices","status":"ok","durationMs":420}

event: log
data: {"message":"HTTP 200"}

event: done
data: {"status":"ok"}
```

### 5.4 Ask-AI field helpers

* For **Condition**, **Agent Step prompt**, **Email body**, provide an inline **Ask-AI** action seeded with upstream context and goal.
* The result is previewed and, on **Apply**, persisted to the node’s `data` in FlowDoc.
* Ask-AI edits are local; they **do not** invoke plan/confirm/generate.

---

## 6) Connections & Secrets
<!-- AB-301, AB-302, AB-303, AB-304, AB-305, AB-306 -->

* **Connections required (left panel)**: compact tiles with icon, name, status chip (Connected/Missing/Error), actions (Connect/Skip/Refresh).
* **Providers v2.0:** Gmail/Google, OpenWeather, WebScrape provider, Slack/Sheets/Drive, Browserless (for screenshot/computer-use).
* **Flows:** OAuth for Google/Slack/Drive; API-key forms for OpenWeather/WebScrape/Browserless.
* **Status API:** `/api/providers/status` map; **Test** blocked until required connected or explicitly skipped with warning.
* **Security:** secrets at rest AES-GCM; per-tenant scoping; **SSRF allowlist + denylist**; outbound egress filtered; **redaction** (no secrets in logs/artifacts).

### 6.4 Deriving “Required Connections”

* Determine required connectors by scanning FlowDoc:

  * Any node with `data.provider` ∈ {`gmail`, `slack`, `sheets`, `drive`, `openweather`, `webscrape`, `browserless`, …}.
  * Any node listing `data.secrets[]`.
* Render the set as **Connections required** tiles; statuses come from `/api/providers/status`.
* Clicking **Connect** runs OAuth/API-key inline; refresh statuses on success.

---

## 7) Runtime & semantics (v1.1)
<!-- AB-401 -->

* **Parallel:** `join(all|any|count|deadline)`; **race** cancels losers; **mapLoop** supports `maxConcurrent` and `gather`.
* **Policies per node:** `retry/backoff`, `timeout`, `idempotencyKey`, `cancelPolicy`, resource caps.
* **Compensation hooks** (saga) via subflow.
* **Observability:** per-step artifacts (input/output/error), counters, **cost**; exposed via `/api/tasks/{id}`.

---

## 8) Tasks (persistent runs)
<!-- AB-307, AB-402, AB-403 -->

### 8.1 API & persistence

* **GET `/api/runs`** — list runs with filters (status, date range, agentId).
* **GET `/api/runs/:id/steps`** — step timeline with artifacts, retries, IO excerpts.
* **Test integration:** when Test starts, **insert** into `workflow_runs`; as steps stream, **insert** into `run_steps`; on done, **update** run status/duration.

### 8.2 Supabase (local dev)

Environment for `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Tables:

```sql
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text,
  duration_ms int,
  meta jsonb
);
create table run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references workflow_runs(id) on delete cascade,
  idx int,
  node_id text,
  title text,
  status text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  duration_ms int,
  input jsonb,
  output jsonb,
  error jsonb,
  logs jsonb
);
```

### 8.3 `/tasks` UI

* List with **status filters**, search, pagination.
* Clicking a run opens **detail timeline** (nested subtasks for loops), artifacts/IO, retries.

### 8.4 SSE → persistence contract

* **On Test start:** insert `workflow_runs` `{status:"running", agent_id, meta}`.
* **For each streamed step:** upsert `run_steps` by `(run_id, idx)` with `status`, `duration_ms`, `input/output/error/logs`.
* **On done:** set `finished_at`, `status: "ok"|"error"`, `duration_ms`.
* `/tasks` must reflect new runs within **<1s** (live subscription or poll).

---

## 9) Hosted mini-apps (publish)
<!-- AB-901, AB-902, AB-903, AB-904 -->

* One-click **Publish** from Builder into a hosted mini-app; embeddable widget supported.
* **Routes/manifest:**

  * `GET /apps/[slug]/manifest`
  * `GET /a/[slug]` (hosted UI)
  * `POST /apps/[slug]/run` and `GET /apps/[slug]/stream`
  * `GET /widget/v1.js` (embed script)
* Inputs validated server-side; secrets never exposed; quotas/rate limits enforced.

Note (interim): Implementations MAY proxy publish runs to a platform runtime endpoint (e.g., `POST /api/run/stream`) while `/apps/[slug]/run|stream` are being wired. When both exist, the publish routes should delegate to the runtime endpoint.

---

## 10) Testing & quality gates (evidence-based)
<!-- AB-205, AB-601, AB-602, AB-603, AB-604 -->

* **Golden prompts (≥25)** across intents: linear, 3-way decision, loop (concurrency), parallel majority (count=2), race (cancel losers), Computer-use, KB crawl.
* **Unit:** FlowDoc schema, AgentSpec schema, adapters, classifier, JSON repair & provider fallback.
* **Integration:** `/plan|/confirm|/generate` return valid JSON; generate can auto-insert outputs/guards with warnings; providers/status; secrets APIs; SSRF allowlist.
* **E2E (Playwright):**

  * Chat: **Describe → Plan → Confirm → Generate → Preview → Proceed → Apply** (Diff visible).
  * Anchors: node bottom, **branch chip**, **event pill** → Add-Action → autowire at Y+\~80.
  * Decision node shows chips; edges are **curved**; labels centered.
  * Inspector writes to FlowDoc; **Test streams**, focuses failing node.
  * `/tasks` shows persisted runs and step timelines.
* **Visual snapshots:** Token snapshot (fonts, radii, borders, band tint, spacing) + components (NodeCard, DecisionCard, Add-Action, ConnectionTile, Canvas).
* **Performance:** time-to-preview **< 2s**; add-node **< 150ms**; **60fps** pan/zoom @ 50 nodes.
* **A11y:** keyboard traversal (chips/pills/anchors/menus/Inspector/Test), focus states, axe passes.
* **Telemetry:** events: `plan_opened`, `plan_confirmed`, `flow_generated`, `connection_prompted/completed`, `saved`, `test_started/step_ok/step_err/done`, `published`; metrics: `time_to_preview`, `connects_completed`, `test_success_rate`, `retries_count`.

### 10.6 Visual snapshot catalog (CI-blocking)

* **NodeCard** (Beginner & Pro), **DecisionCard** (chips visible), **Add-Action Modal** (tabs: Top/Apps/Chat/AI/Logic/Scrapers/By FlowPuppy), **ConnectionTile**, **Canvas (lane bands on)**, **Token sheet** asserting:

  * left **360px**, lane **300px**, gutter **24**, title **15/#0f172a**, sub **12/#475569**, border **#e2e8f0**, band **rgba(241,245,249,.35)**, chip sizes per §4.4.

---

## 11) Feature flags & rollout
<!-- AB-CC3 -->

* Flags: `agentBuild` (UI), `agentBuild.curvedEdges`, `layout.elkY`, `theme.tokens.strict`, per-provider `mockMode`.
* Rollout: internal → beta → GA. Existing flows render unchanged.
* If any flag is off, fallback to classic builder (read-only conversion from FlowDoc).

---

## 12) Definition of Done (per phase)
<!-- AB-001..AB-611, AB-901..AB-904 -->

**Phase 0 — Foundations**
FlowDoc schema (Zod), adapters (AgentSpec↔FlowDoc↔DSL), fixtures (linear/decision/parallel/race/mapLoop), Storybook for NodeCard/BranchChip/EventPill/ConnectionTile.
**Exit:** schemas pass fixtures; Storybook visible.

**Phase 1 — Builder UX**
Left chat with structured messages; Plan Summary; Connection tiles; Add-Action anchored everywhere; Decision **chips on node**; Email **event pills**; **curved labeled edges**; Inspector forms write to FlowDoc.
**Plus:** **Beginner/Pro toggle** implemented; **Narrative overlay** links Plan bullets ↔ Canvas selection.
**Exit:** Playwright *visual + token snapshots* pass.

**Phase 2 — Planner pipeline**
`/plan|/confirm|/generate` wired to chat; **golden prompts** pass; **generate validates** and inserts warnings for missing outputs/guards.
**Plus:** **Guard/Decision conventions enforced** (Left=No, Right=Yes; auto Yes/No labeling when boolean).
**Exit:** all golden prompts produce valid FlowDoc previews.

**Phase 3 — Connections & Secrets**
OAuth/API-key flows; `/providers/status` live; Save-before-Test gating; SSRF allowlist; redaction.
**Exit:** can run a gated Test only after connections are green (or explicitly skipped with warning).

**Phase 4 — Runtime (v1.1)**
join/race/mapLoop + policies (retry/backoff, timeout, idempotency, compensation); **artifacts/counters/costs**.
**Exit:** E2E flows covering parallel majority and race; `/tasks` displays persisted traces.

**Phase 5 — Power nodes**
Hardened Code node sandbox; KB crawl; Computer Use; Phone (behind flags).
**Exit:** smoke tests + guardrails (timeouts, screenshots recording if applicable).

**Phase 6 — QA, A11y, Perf**
Perf budgets, keyboard traversal, telemetry dashboards.
**Exit:** all budgets & a11y checks pass in CI.

---

## 13) Acceptance snapshot (what “done” looks like)
<!-- AB-205, AB-601, AB-602, AB-603 -->

1. User types a goal. Chat asks clarifying Qs, proposes **option cards**; user confirms.
2. **Generate** returns FlowDoc preview + **Diff**. User hits **Proceed** → **Apply**; **Build Progress** logs appear, then **Build Agent / Go to Agent** card + status pill.
3. **Connector chips** show (Gmail/OpenWeather/WebScrape/etc.); user connects.
4. Canvas: **four lanes** (bands hidden until zoom ≥ 0.8), **Decision chips on node**, **curved labeled edges**, **Email event pills with “+”**.
5. Inspector changes persist to FlowDoc. **Test** streams steps, focuses failing node.
6. `/tasks` lists the new run with step timeline and artifacts.
7. User says: “add Instagram after SELL” → **Updated Workflow** in chat → **Proceed?** → Apply; canvas updates; Test again.

---

## 14) Superseded Documents & Change Control
<!-- AB-CC1 -->

**Superseded:**

* `docs/agent-build-DoD.md` → folded into **§10 Testing & quality gates** and **§12 Definition of Done**.
* `docs/agent-build-spec.md` → folded into **§0–9 (spec)** and **Appendices**.

**Why consolidated:** One source of truth unifying UX, AI pipeline, FlowDoc, runtime, QA, and rollout—removing contradictions and drift.

**Link hygiene:**

* Update any internal links that referenced the old docs to point at `/docs/agent-build-master.md`.
* New PRs must cite **specific section numbers** in this master spec for acceptance criteria.

**Archive policy:** The legacy docs remain in `docs/archive/` and **must not be edited**.

---

### Appendix A — Chat message structures (UI)

```ts
type ChatTurn =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text?: string;
      plan?: PlanBlock;
      updatedPlan?: PlanBlock & { askProceed: true };
      build?: BuildEvent[];
      connectors?: ConnectorChip[];
      chips?: string[];
      card?: { kind: "buildAgent"; url?: string };
    };

type PlanBlock = { title: string; steps: PlanStep[] };
type PlanStep  = { n: string; title: string; tag?: string; children?: PlanStep[] }; // n="1" | "4a" | "4ai"

type BuildEvent = { kind:"progress"; text:string; ok?:boolean };
type ConnectorChip = { id:string; name:string; icon:string; status:"connected"|"missing"|"error" };
```

### Appendix B — Provider registry (example)

```json
{
  "google": { "name": "Google", "icon": "google", "kind": "oauth", "scopes": ["gmail.send","gmail.read"], "required": ["gmail"] },
  "openweather": { "name": "OpenWeather", "icon": "weather", "kind": "apiKey", "envKey": "OPENWEATHER_API_KEY" },
  "webscrape": { "name": "WebScrape", "icon": "scraper", "kind": "apiKey", "envKey": "WEBSCRAPE_API_KEY" },
  "browserless": { "name": "Browserless", "icon": "browser", "kind": "apiKey", "envKey": "BROWSERLESS_KEY" }
}
```

### Appendix C — Minimal Zod stubs (illustrative)

```ts
const Edge = z.object({
  id: z.string(),
  source: z.object({ nodeId: z.string() }),
  target: z.object({ nodeId: z.string() }),
  label: z.string().optional()
});
const Node = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  laneId: z.string(),
  data: z.record(z.any()).optional()
});
export const FlowDoc = z.object({
  version: z.literal("1.1"),
  meta: z.record(z.any()).optional(),
  lanes: z.array(z.object({ id: z.string(), title: z.string(), order: z.number() })),
  nodes: z.array(Node),
  edges: z.array(Edge)
});
```

### Appendix D — Supabase SQL (local dev)

*(see §8.2; included again here for convenience)*

```sql
-- workflow_runs / run_steps as defined above
```

### Appendix E — Plan Summary ↔ Canvas mapping

* **Main path first:** Plan Summary enumerates the **primary** path (flagged by generator or inferred as longest by edge count), then sibling branches as suffixes (`4a`, `4b`, …) and nested details (`4ai`, `4aii`, …).
* Each Plan step stores hidden `nodeIds[]`/`edgeIds[]` to enable highlight/zoom on click.
* After Diff-Apply, regenerate Plan Summary to reflect the updated main path.

### Appendix F — Layout algorithm (deterministic Y with branch separation)

* **Base Y rhythm:** **48px** (Beginner), **32px** (Pro dense).
* **Insertion:** place a new node at `sourceY + ~80`.
* **Branch separation:** keep siblings **≥96px** apart to avoid chip/label collisions.
* **Decision children:** align under the decision’s chip row.
* **ELK option:** `layout.elkY` flag can enable ELK-layered Y; ELK receives lane-pinned X and per-lane padding while preserving **≥96px** branch separation.

### Appendix G — Conversational flow protocol (draft)

Minimal fields for a guided conversation that persists flow identity and step progression:

```ts
type ConvoRequest = {
  prompt?: string;            // present on first turn or free-form follow-ups
  isFollowUp?: boolean;       // true when user types a custom message during the flow
  action?: string;            // quick action value selected by the user
  step?: number;              // current step index (0-based)
  flowId?: string;            // required after first turn; server should also return it in context
  context?: Record<string, unknown>; // accumulated flow context
}

type ConvoResponse = {
  message: string;
  quickActions?: Array<{ label: string; value: string }>;
  primaryAction?: { label: string; action: string } | null;
  secondaryActions?: Array<{ label: string; value: string }>;
  nextStep: number;           // index of next step (no double increment)
  context: Record<string, unknown> & { flowId?: string };
}
```

Flows are free to define their own step content but MUST obey the `flowId` persistence and `nextStep` semantics above.

---

**End of `/docs/agent-build-master.md`.**