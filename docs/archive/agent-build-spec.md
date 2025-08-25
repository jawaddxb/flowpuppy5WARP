# Agent Build – Functional Specification (v1.0)

References
- Lindy Quickstart — https://docs.lindy.ai/start-here/quickstart
- Lindy 101 – Introduction — https://docs.lindy.ai/fundamentals/lindy-101/introduction
- Lindy Docs Landing — https://docs.lindy.ai/

---

## 0) Goals and non‑goals

Goals
- Guided “Agent Build” conversation → options → confirmation → runnable workflow.
- Contextual connections checklist and one‑click fixes; clear preview.
- Single source of truth (FlowDoc) that renders Story/Swimlane/Graph and generates an executable DSL.

Non‑goals (v1)
- Multi‑agent orchestration; advanced permissions; full template marketplace.

Success
- Prompt → runnable agent in ≤ 5 minutes [Quickstart].

---

## 1) Primitives (aligned with Lindy)

- Agent, Workflow, Steps (Triggers, Actions, Agent Steps, Integrations, Conditions, Looping), Memory, Tasks [Lindy 101].

---

## 2) Journeys

A. Idea → Clarify → Plan → Confirm → Preview → Connect → Test → Publish
- Clarify with question cards; propose defaults; user confirms; flow renders; connections show; save→test; deploy.

B. “+” everywhere
- Under any node/branch chip, a “+” opens Add Action catalog (Logic, Apps, Chat, AI, Scrapers, By FlowPuppy); selecting inserts and autowires.

---

## 3) IA & layout

- Left panel (320–360px): Agent Builder (chat, plan summary, connections).
- Center: Flow canvas (lanes always: Input→Transform→Decision→Output). Top‑down.
- Right (360–420px): Inspector & Test.
- Top bar: Settings | Flow Editor | Tasks; Share, Test, Deploy.

---

## 4) Visual system

- Node title 14–15px semibold #0f172a; subtitle 12px #475569; lane header 12px uppercase #334155.
- Node card: white, radius 12, border #e2e8f0, soft shadows; selected ring teal.
- Lane bands: rgba(241,245,249,0.35) behind canvas.
- Micro‑interactions: hover lift; “+” fades in; menus scale+fade (120ms).

---

## 5) Left panel details

- Header: “Agent Builder”, “Update Agent ▾”, “Go to Agent”.
- Plan summary: numbered; mirrors graph.
- Connections required: small cards (icon, name, status; Connect/Skip/Refresh). OAuth modal or inline API‑key form to `/api/secrets`.
- Clarify chat: options chips; Ask‑AI; Proceed.

---

## 6) Canvas details

- Lanes: Input | Transform | Decision | Output (Other hidden by default).
- Nodes: provider/logic icon; title; subtitle; badges (step#, warnings); optional footer event pills (e.g., After email sent).
- Types: Trigger/Input (tinted header), Fetch/API (method+endpoint), Decision (branch chips), Output (brand icon, email/slack).
- Edges: curved with guard chips; primary darker.
- Add‑Action menus under nodes/branch chips; tabs: Top | Apps | Chat | AI | Logic | Scrapers | By FlowPuppy.

---

## 7) Inspector & Test

Inspector
- Basics; Provider/Config; AI Params (Ask‑AI); Decision (branches); Postconditions; Validation issues.

Test
- Save‑before‑test; pick input; stream per‑step cards (duration+excerpt); Retry per step; missing connections prompt with Connect/Skip.

---

## 8) Behavior rules

Classification
- Input: type ∈ {input, trigger, webhook, schedule, timer} or label ∈ {webhook, trigger, schedule, repeat, interval, every, cron}.
- Transform: type ∈ {transform, http, httpRequest, api, action, function, web3Action, notion, sheets, airtable, scraper, weather}.
- Decision: type ∈ {switch, trycatch, decision} or label contains {if, decide, has}.
- Output: type ∈ {email, emailSend, slack, output} or label contains {email}.

Layout
- ELK layered for Y; snap X to lane columns (≈ 280–320px width).

Autowiring
- Inserted node wires from source; placed at Y+80; branch chip wires from that edge.

Validation
- No orphans; decisions have ≥1 outgoing guard; outputs exist; secrets unresolved → warning.

---

## 9) Data contracts

### AgentSpec

```json
{
  "name": "Energy Optimizer",
  "inputs": { "schedule": { "type": "interval", "value": "hourly" } },
  "sources": {
    "prices": { "type": "api", "endpoint": "https://api.energymarket.com/prices" },
    "weather": { "type": "openweather", "location": "Dubai" }
  },
  "analysis": { "merge": true, "computeSavings": true },
  "decision": {
    "rules": [
      { "when": "price < 0.10 || highSolar", "action": "CHARGE" },
      { "when": "price > 0.25 && batterySoc > 0.6", "action": "SELL" },
      { "when": "else", "action": "HOLD" }
    ]
  },
  "actions": {
    "controlStorage": { "type": "http", "method": "POST", "endpoint": "https://api.energystorage.com/control" },
    "notification": { "type": "email", "to": "user@example.com", "subjectTpl": "Energy Optimizer Action" }
  }
}
```

### FlowDoc (universal)
- Lanes: Input, Transform, Decision, Output
- Nodes: Schedule → Get Prices → Get Weather → Analyze → Calculate Savings → Decision → Control Storage → Compose Email → Send Email
- Edges: decision branches CHARGE/SELL/HOLD (primary flagged)

---

## 10) APIs

- POST `/api/agent/plan` → { options, defaults, nextQuestions }
- POST `/api/agent/confirm` { selections } → { agentSpec }
- POST `/api/agent/generate` { agentSpec } → { flowDoc }
- POST `/api/providers/connect` { provider, oauthResult|apiKey } → { status }
- GET `/api/providers/status` → { providerStatuses }
- `/api/secrets` GET/POST/DELETE
- POST `/api/test/run` { flowDoc, input } → SSE stream of step events

---

## 11) Connectors map

- Gmail → Google connection
- OpenWeather → API key
- Webscrape (labels or source) → Webscraping provider
- Slack/Sheets/Drive → respective OAuth scopes

---

## 12) Node types & fields (selection)

- Schedule: interval|cron; timezone
- Webhook: path, method, sample payload
- HTTP Request: method, url, headers, body, timeout; Test
- Weather: apiKey, location, units
- Analyze & Decide (AI): model, prompt (Ask‑AI), outputs decision+rationale
- Route Decision: branches with labels and conditions
- Control Storage (HTTP): endpoint, payload template, auth
- Compose Email: subject template, body (Auto/Manual)
- Send Email (Gmail): to/cc/bcc/thread/attachments
- Condition: text area “Go down this path if …” (Ask‑AI)
- Enter Loop: items source, max cycles, max concurrent
- Agent Step: prompt, skills, ask‑for‑confirmation, exit condition
- Search KB: source Website/Files, crawl URL

---

## 13) Testing & monitoring

- Save is required before Test; right panel runs stream; Tasks lists history with per‑step timing and outputs.

---

## 14) Acceptance (energy optimizer)

- Lanes: Input | Transform | Decision | Output.
- Nodes placed correctly with branch chips CHARGE/SELL/HOLD.
- Left shows Connect Webscraping/OpenWeather/Google with live status.
- “+” menus insert nodes/logic correctly; inspector shows Ask‑AI fields.
- Test prompts to connect missing items; rerun succeeds after connection.

---

## 15) Security & privacy

- Secrets encrypted (AES‑GCM); SSRF guard; redaction in logs.

---

## 16) Phases

- MVP: stepper + connections + lanes + inspector (Trigger/HTTP/Decision/Email) + Test SSE + Tasks.
- Delight: Add‑Action catalog, branch chips, event pills, Knowledge Base crawl, Ask‑AI helpers, Loop/Agent Step.
- Scale: templates, analytics, publishing mini‑apps.

---

## 17) Wireframe notes (textual)

### A. Agent Builder (left)
- Header row with kebab menu + close. Under it, a large “Build Agent” card with “Go to Agent” link.
- Section: “Here’s the workflow” numbered 1–6 (or more), matching canvas nodes.
- Section: “Connections required” with 3–6 compact tiles (icon, name, status chip, Connect button).
- Section: Clarify chat (question cards, chips, Proceed button).

### B. Flow Editor (center)
- Four columns labeled INPUT, TRANSFORM, DECISION, OUTPUT; nodes snap under headers.
- Decision node shows three branch chips (e.g., CHARGE, SELL, HOLD) placed along the branch edges.
- Under email nodes, two event pills (After email sent / After reply received) each with a “+”.

### C. Add Action menu
- Modal/dropover with tabs. “Top” tab lists 8–12 most relevant items. Each item has icon, title, short subtitle.
- Selecting inserts node at Y+80 and autowires from the click source.

### D. Inspector (right)
- Title bar with node icon/name; status pill.
- Sections: Basics, Provider/Config, AI Params, Decision, Postconditions, Validation.
- Buttons: Validate, Save changes. Warnings inline with field focus on click.

### E. Test & Tasks
- Right panel switches to run log (cards per step); Retry buttons; “Connect” prompts inline.
- Tasks tab lists past runs with status filters; clicking opens a detail timeline.

---

## 18) API examples

### /api/agent/plan (request)
```json
{ "prompt": "Build an energy optimizer...", "answers": { "schedule": "hourly", "system": "solar+battery" } }
```
(response)
```json
{
  "options": {
    "priceSource": ["PJM API","Utility API","Web Scraping"],
    "weather": ["OpenWeather","Meteomatics"],
    "decision": [
      { "when": "price < 0.10 || highSolar", "action": "CHARGE" },
      { "when": "price > 0.25 && batterySoc > 0.6", "action": "SELL" },
      { "when": "else", "action": "HOLD" }
    ]
  },
  "defaults": { "priceSource": "Web Scraping", "weather": "OpenWeather" },
  "nextQuestions": ["Confirm thresholds?", "Target email address?"]
}
```

### /api/agent/confirm
```json
{ "selections": { "priceSource": "Web Scraping", "weather": "OpenWeather", "email": "user@example.com" } }
```
(response)
```json
{ "agentSpec": { /* see AgentSpec */ } }
```

### /api/agent/generate
```json
{ "agentSpec": { /* see AgentSpec */ } }
```
(response)
```json
{ "flowDoc": { "version": "1.0", "lanes": [/* Input, Transform, Decision, Output */], "nodes": [/* ... */], "edges": [/* ... */] } }
```

### /api/test/run (SSE events)
```
:ok

event: step

data: {"id":"fetchPrices","status":"running"}


event: step

data: {"id":"fetchPrices","status":"ok","durationMs":420}


event: log

data: {"message":"HTTP 200"}


event: done

data: {"status":"ok"}
```

### /api/providers/status (example)
```json
{ "google": {"connected": false}, "openweather": {"connected": false}, "webscrape": {"connected": true} }
```

---

## 19) Sample FlowDoc (energy optimizer)
```json
{
  "version": "1.0",
  "lanes": [
    { "id": "lane-input", "title": "Input", "order": 1 },
    { "id": "lane-transform", "title": "Transform", "order": 2 },
    { "id": "lane-decision", "title": "Decision", "order": 3 },
    { "id": "lane-output", "title": "Output", "order": 4 }
  ],
  "nodes": [
    { "id": "n-schedule", "type": "input", "title": "Hourly trigger", "laneId": "lane-input" },
    { "id": "n-prices", "type": "action", "title": "Get Power Prices", "laneId": "lane-transform", "provider": "http", "data": {"method":"GET","url":"https://api.energymarket.com/prices"}},
    { "id": "n-weather", "type": "action", "title": "Get Weather Data", "laneId": "lane-transform", "provider": "openweather" },
    { "id": "n-analyze", "type": "action", "title": "Analyze & Decide", "laneId": "lane-transform", "provider": "ai" },
    { "id": "n-route", "type": "decision", "title": "Route Decision", "laneId": "lane-decision" },
    { "id": "n-email-charge", "type": "output", "title": "Email CHARGE Action", "laneId": "lane-output", "provider": "gmail" },
    { "id": "n-email-sell", "type": "output", "title": "Email SELL Action", "laneId": "lane-output", "provider": "gmail" },
    { "id": "n-email-hold", "type": "output", "title": "Email HOLD Action", "laneId": "lane-output", "provider": "gmail" }
  ],
  "edges": [
    { "id": "e1", "source": {"nodeId": "n-schedule"}, "target": {"nodeId": "n-prices"} },
    { "id": "e2", "source": {"nodeId": "n-prices"}, "target": {"nodeId": "n-weather"} },
    { "id": "e3", "source": {"nodeId": "n-weather"}, "target": {"nodeId": "n-analyze"} },
    { "id": "e4", "source": {"nodeId": "n-analyze"}, "target": {"nodeId": "n-route"} },
    { "id": "e5", "source": {"nodeId": "n-route"}, "target": {"nodeId": "n-email-charge"}, "label": "CHARGE" },
    { "id": "e6", "source": {"nodeId": "n-route"}, "target": {"nodeId": "n-email-sell"}, "label": "SELL" },
    { "id": "e7", "source": {"nodeId": "n-route"}, "target": {"nodeId": "n-email-hold"}, "label": "HOLD" }
  ]
}
```

---

## 20) QA test matrix

Unit (Vitest)
- Lane classifier maps labels/types correctly: schedule/webhook→Input; http/api→Transform; decision phrases→Decision; email/slack→Output.
- Decision branch chips render with labels; primary path flagged.
- Autowiring adds nodes and edges correctly from node and from branch chip.

E2E (Playwright)
- Journey: prompt → clarify → confirm → preview → connect (OAuth/API-key) → save → test → deploy; no blockers.
- Accessibility: keyboard navigation works for “+”, menus, Connect, Retry; focus rings visible; roles present.
- Visual: lanes always visible; nodes in correct columns; edge chips readable.

Performance
- Time to first preview < 2s on typical prompts; zoom/pan 60fps on 50 nodes; add-node latency < 150ms.

Security
- Secrets redaction verified; SSRF guard rejects disallowed hosts; logs never contain secrets.

---

## 21) Telemetry (opt‑in)
- Events: plan_opened, plan_confirmed, flow_generated, connection_prompted, connection_completed, saved, test_started, test_step_ok/err, test_done, deployed.
- Metrics: time_to_preview, connects_completed, test_success_rate, retries_count.

---

## 22) Future iterations
- Template library and “Start from template” in left panel.
- Agent Step with skills marketplace and memory configuration.
- Publish as mini‑app; embed widget.
- Multi‑agent compositions.

---

# v1.1 Delta — Runtime semantics & advanced nodes (drop‑in patch)

## 8.1 Execution semantics (new)
- DAG rule: a node runs when all inbound guard conditions are met.
- Join policy: `"all" | "any" | { "count": n } | { "deadlineMs": n }`.
- Race: first success wins; cancel losers per `cancelPolicy`.
- Retry: `{ "max": n, "backoff": "const"|"linear"|"expo", "baseMs": 250, "jitter": true, "on": ["timeout","5xx","4xx"] }`.
- Timeout: `timeoutMs` on any node.
- Idempotency: `idempotencyKey` per invocation (engine is at‑least‑once).
- Compensation: `compensateWith: <subflowId>` (saga rollback).
- Resources: `{ concurrency, rateLimitPerSec, budgetUSD, providerPool }`.
- Cancellation: `cancelPolicy: "downstream" | "block" | "none"`.

Validation add: detect cycles across `parallel/mapLoop`, ensure `join.count ≤ children.length`.

## 12) Node types & fields (extend)

### New block types
```json
{ "id":"blk-verify","type":"parallel","title":"Verify via 3 providers",
  "laneId":"lane-decision","children":["n-a","n-b","n-c"],
  "joinPolicy":{"count":2},"cancelPolicy":"downstream",
  "resource":{"concurrency":3},"compensateWith":"sub-rollback-verify" }

{ "id":"blk-fastest","type":"race","title":"Fastest fetch",
  "laneId":"lane-transform","contenders":["n-ipfs","n-arweave","n-filecoin"],
  "cancelPolicy":"downstream" }

{ "id":"blk-download","type":"mapLoop","title":"Download assets",
  "laneId":"lane-transform","itemsExpr":"${n-list.urls}",
  "bodySubflowId":"sub-download-one","maxConcurrency":8,
  "gather":{"reducer":"array","successPolicy":{"minSuccess":10}},
  "retry":{"max":3,"backoff":"expo","baseMs":300},"timeoutMs":60000 }
```

### New action types
```json
{ "id":"n-code","type":"action","title":"Transform payload",
  "laneId":"lane-transform","provider":"code",
  "data":{"language":"js","inputs":{"payload":"${prev.out}"},"code":"/* JS here */","outputs":{"result":"any"}} }

{ "id":"n-computer","type":"action","title":"Browser session",
  "laneId":"lane-transform","provider":"computerUse",
  "data":{"sessionId":"auto","steps":[{"click":"#login"},{"type":"#user","text":"${user}"},{"screenshot":true}]},
  "timeoutMs":90000 }

{ "id":"n-call","type":"action","title":"Call customer",
  "laneId":"lane-output","provider":"phone",
  "data":{"number":"+15551234567","voice":"female","language":"en","transferTo":null,"record":true} }
```

### Per‑node runtime (available on any node)
```json
"retry": { "max": 2, "backoff": "expo" },
"timeoutMs": 15000,
"idempotencyKey": "assignRole:${discordUserId}",
"compensateWith": "sub-revoke-role",
"resource": { "concurrency": 5, "rateLimitPerSec": 4, "budgetUSD": 0.25, "providerPool": "discord" }
```

## 9) Data contracts (extend)

Variables/Memory
```json
"vars": { "read": ["user","prices"], "write": ["decision","result"] }
```

Output schemas (shape checking)
```json
"outputs": { "schema": { "type":"object","properties":{"decision":{"type":"string"}},"required":["decision"] } }
```

Knowledge base sources
```json
"kb": { "sources":[{"type":"website","url":"https://docs.example.com","scope":"site"}] }
```

Thread linking (long‑lived channels)
```json
"channelLink": { "type":"email","threadIdRef":"${n-email.threadId}" }
```

## 10) APIs (extend)
- POST `/api/run/cancel` { taskId } — cooperative cancellation (propagate with `cancelPolicy`).
- GET `/api/tasks/{id}` — full trace (inputs, outputs, artifacts, screenshots).
- POST `/api/compute/sessions` { action: start|stop, options } — Computer Use lifecycle.
- GET/POST `/api/phone/numbers` — buy/list numbers; configure webhook targets.

## 13) Testing & monitoring (extend)
- Capture artifacts per step: `input.json`, `output.json`, `error.json`, `screenshot.png` (for Computer Use).
- Show live counters for blocks: `running/success/failed/canceled`.
- Persist cost & retries per node for post‑mortems.

## 15) Security & privacy (extend)
- Egress allowlist for HTTP/Computer Use; SSRF guard already noted.
- Rate‑limit shields per provider; backpressure when bursts occur.
- Redaction map for logs (fields: Authorization, apiKey, Set‑Cookie).

## 19) Sample FlowDoc (advanced snippets)
```json
{ "id":"blk-kyc","type":"parallel","title":"KYC majority","laneId":"lane-decision",
  "children":["n-sumsub","n-rekognition","n-db"],"joinPolicy":{"count":2} }
{ "id":"blk-src","type":"race","title":"Fastest CDN","laneId":"lane-transform",
  "contenders":["n-ipfs","n-arweave","n-filecoin"],"cancelPolicy":"downstream" }
```

## 20) QA (additions)
- Parallel joins: all/any/count/deadline produce expected readiness of downstream nodes.
- Race cancellation: losers canceled; no side‑effects run; compensation not triggered on canceled paths.
- Retry/backoff: attempts = `max+1`, backoff schedule honored.
- Idempotency: duplicate triggers don’t duplicate side‑effects.
- Resource caps: with `concurrency=2`, ensure only 2 run concurrently.
- Computer Use: session persists cookies; screenshots recorded.
- Phone: call connects; reply/DTMF events route correctly.

**One‑liner acceptance add**
> A complex flow with parallel majority join, race, mapLoop(8), per‑node retry/timeout, idempotency, compensation, and resource caps runs deterministically and is fully inspectable (artifacts, counters, costs).

---

## Appendix A — Canvas visual contract (precise)

Layout grid
- Columns (lanes): 4 fixed — INPUT, TRANSFORM, DECISION, OUTPUT.
- Column width: 300px target (range 280–320px responsive). Gutter between columns: 48px.
- Lane bands: height 100%; tint rgba(241,245,249,0.35); header label in left gutter of each band; header height 32px.
- Canvas margins: 24px outer padding.

Snap rules
- Each lane has a centerline; nodes snap their X to lane centerline.
- Vertical rhythm: 48px default spacing between vertically adjacent nodes (top/bottom edge gap). Dense mode: 32px.
- Branch spacing: siblings under a decision separated by ≥ 96px horizontally; child nodes aligned directly under their branch chip.

Node metrics
- Card min width: 240px (Transform/Output), 260px (Trigger/Input), 280px (Decision). Max width: 360px.
- Card height: auto; min 64px; large cards (with subtitle) ~ 84–96px.
- Radius: 12px; border: 1px #e2e8f0; shadow: 0 1px 1px rgba(0,0,0,.04), 0 2px 6px rgba(15,23,42,.05).
- Typography: title 15px/1.25 semibold #0f172a; subtitle 12px/1.3 #475569.
- Badges: step # 16×16, rounded 8px; warning dot 8×8 amber.
- Trigger tint: header strip 8px teal-50; brand icons (e.g., Gmail) 18×18 left.

Edges & chips
- Routing: orthogonal with 16px corner radius; stroke 1.25px; primary path #94a3b8, secondary #cbd5e1.
- Chips: 12px font, 20px height, 12px horizontal padding; radius 12px; bg #f1f5f9; text #475569; thin border #e2e8f0.
- Chip placement: centered along outgoing edge, 24px below decision node.

Controls
- “+” control under node: circular 24px, blue (#3b82f6), white glyph; placed center-bottom, 16px below card.
- “+” control on branch chip: 20px, same style; placed 24px below chip.
- Event outlet pills (e.g., After email sent/After reply received): 26px height gray pill directly beneath output nodes with their own “+”.

Minimap & zoom
- Bottom-right; minimap 180×120; controls: +, −, Fit; keyboard: +/−; fit (F).

Animation timings
- Node hover lift: 100ms ease-out; selection ring fade-in 120ms.
- Add Action menu: scale 0.96→1.0 + fade (120ms cubic-bezier(0.2,0.8,0.2,1)).

Accessibility
- Focus rings 2px #2563eb with 2px offset on nodes, chips, and “+”.
- Chip text contrast ≥ 4.5:1; interactive hitboxes ≥ 36×36.
