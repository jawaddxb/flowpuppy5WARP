# Unified Brain — Quick & Conversational (DoD Plan)

Reference: `docs/agent-build-master.md` (v2.0), `docs/STATUS-AGENT-BUILD.md`

Scope: Unify Quick Setup and Conversational flows on one AI pipeline, one FlowDoc source of truth, and one Diff-Apply UX.

## 1. Logic & Protocol

1) FlowDoc is the single source of truth. Canvas is a projection; no direct canvas mutations.
2) One pipeline for both modes: Plan → Confirm → Generate (JSON-only, strict schemas, repair+fallback).
3) Conversational protocol: server returns `flowId` on first turn; client echoes `flowId` and `step`; server returns `nextStep`. Quick auto-selects defaults but uses the same pipeline.
4) Diff-first edits: proposals render a floating Diff with counts; Apply writes to FlowDoc and records one Undo snapshot.
5) Connections: derive from FlowDoc (`data.provider`, `data.secrets[]`); gate Test until connected or explicitly skipped; placeholders require consent and are workflow-scoped.
6) Structured outputs: prefer JSON Schema/tool-use; single retry; then fallback chain.

## 2. Deliverables

1) Planner/LLM: strict schemas for `/api/agent/plan|confirm|generate`; provider routing (OpenAI-first); tool-use where available; telemetry per call.
2) Diff-Apply: counts (add/remove/change) + details; Apply → Undo snapshot.
3) Canvas: lane bands (toggle, auto-show at zoom ≥ 0.8), X-quantization ≈300px; anchors “+”; decision chips “+”; email event pills “+”; insertion rule Y≈+80, autowire, X snap; curved edges + centered label chips; primary vs secondary styling.
4) Conversational UI: Plan Summary, Build Progress feed, Connector chips, suggestion chips, Proceed checkpoint before mutation.
5) Inspector & Test: schema-driven Inspector writes to FlowDoc; Save-before-Test; SSE step streaming with per-step retry; persist `workflow_runs`/`run_steps`; `/tasks` UI.
6) Connections & Secrets: tiles, connect/skip/refresh; SSRF allowlist; redaction.
7) QA: golden prompts (≥25); visual snapshots (token sheet + NodeCard/DecisionCard/Add-Action/ConnectionTile/Canvas); E2E paths; telemetry dashboards.

## 3. Flows

- Quick: Prompt → Plan (defaults) → Confirm → Generate → Diff → Apply → Connections → Test (SSE) → `/tasks`.
- Conversational: Clarify → Plan → Confirm → Build → Diff → Apply → Refine via Patch → Connections → Test → `/tasks`.

## 4. Outstanding tasks (numbered DoD)

1) AB-102: Lane bands + toggle; X-quantization polish.
2) AB-103: Bottom “+” anchors; Add-Action; Y≈+80, autowire; X snap.
3) AB-104: Decision chips with mini “+”; branch label validation.
4) AB-105: Email event pills (“After sent/received”) with “+”.
5) AB-106: Curved edges with centered label chips; primary vs secondary styling.
6) AB-108: Beginner/Pro toggle (persist per user; Pro dense Y=32).
7) AB-109: Narrative overlay (Plan bullets ↔ canvas selection); Back-to-Chat button.
8) AB-206: Diff counts + single-level Undo recorded in both modes.
9) AB-110: Conversational protocol — persist/echo `flowId`; strict `step/nextStep` semantics on quick actions.
10) AB-301/302/303: Derive Connections from FlowDoc; strict Test gating; explicit Skip (Simulated) banner.
11) AB-207/307/402: Test SSE with per-step retry; persist `workflow_runs`/`run_steps`; `/tasks` list+detail.
12) AB-201/202/203: Planner reliability — OpenAI-first; add tool-use fallback; attach telemetry; expand repair.
13) AB-205: Golden prompts (≥25) producing valid FlowDoc previews.
14) AB-601..604: Visual snapshots, a11y keyboard traversal, perf budgets, telemetry dashboards.
15) AB-901..904: Publish mini-apps (manifest, host, stream, embed).

## 5. Execution order (thin slices)

1) Routing/protocol: OpenAI-first; prototype `flowId`; telemetry hooks.
2) Diff counts + Undo parity; connections derivation + Test gating.
3) Canvas primitives (anchors/chips/pills/curved edges/lane bands) + toggle.
4) Inspector/Test SSE + `/tasks` persistence.
5) Golden prompts + visual snapshots + perf/a11y.
6) Publish (flagged) + telemetry dashboards.

## 6. Acceptance

- CI: mocked E2E green (Quick + Conversational); live conversational run green; snapshots locked; golden prompts suite green; `/tasks` persists runs.
- UX: lanes, anchors/chips/pills, curved edges; Beginner/Pro toggle; narrative overlay.
- Data: Save-before-Test; SSE stream with per-step retry; runs/steps persisted; secrets secure.

Owner: Agent Build
