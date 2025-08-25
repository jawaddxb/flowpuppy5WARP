# Cursor Rules — Agent Build (v2.0)

You are working on backlog item **<ID>** from `/docs/LOCKED_BACKLOG.md`.

**Authoritative spec:** `/docs/agent-build-master.md` (v2.0).  
Do not use any other document for acceptance criteria.

## Process (closed loop)
- Begin every cycle with **DESCRIBE → PREDICT → EDIT → VERIFY**.
- Implement **only** the DoD for **<ID>**. Touch **≤ 6 files** per cycle.
- After edits, **print a QA plan (commands only)** I can run. If any fail, fix and re-print.
- When all green, output **CHECKPOINT READY FOR VISUAL** and list exact routes/panels to open.
- **Stop conditions**: stop immediately if (a) visual checkpoint reached, (b) touched 6 files, or (c) more than 40 changed lines across UI tokened components (to avoid drift).

## Hard requirements pulled from the master spec
- **Source of truth:** edit **FlowDoc**; React Flow is a projection. No direct canvas mutations.
- **Three panes:** Left=Chat, Center=Canvas, Right=Inspector/Test.
- **Lanes:** Input → Transform → Decision → Output. X snaps to ≈300px columns. **Lane bands OPTIONAL** and only show at `zoom ≥ 0.8` or when toggled.
- **Anchors:** bottom “+” on nodes; **decision chips on the node** (with mini “+”); **email event pills** (“After email sent/received”) each with “+”.
- **Insertion rule:** place new node at `Y = sourceY + ~80`, autowire from anchor; X snaps by catalog tab/kind.
- **Edges:** **curved** with centered **label chips**; support **primary path** styling vs secondary faint.
- **Decision conventions:** **Left=No/False**, **Right=Yes/True**; auto-label **Yes/No** for boolean; validate labels ∈ `branches`.
- **Beginner/Pro toggle:** Beginner = expanded labels/help; Pro = compact & dense Y=32. Toggle never changes FlowDoc.
- **Narrative overlay:** Plan bullets ↔ canvas selection are linked (hover highlight, click to zoom).
- **Ask-AI helpers (Inspector):** for Condition/Agent Step/Email body → preview → Apply writes to FlowDoc only.
- **Planner pipeline:** `/api/agent/plan → /confirm → /generate` JSON-only + Zod validation + repair/fallback.
- **Diff-Apply:** show counts; Apply then record **Undo**.
- **Connections required:** compute from FlowDoc (`data.provider`, `data.secrets[]`); show tiles; `/api/providers/status`; block Test until connected or explicitly skipped.
- **Save-before-Test:** mandatory. Test streams via SSE; per-step retry; failing step focuses node + opens Inspector.
- **SSE → persistence:** insert `workflow_runs` on start; upsert `run_steps` per streamed step; finalize with status/duration. `/tasks` reflects runs in <1s.
- **Tokens (must match):** left 360px, lane 300px, gutter 24, canvas padding 24, radius 12, border `#e2e8f0`, title 15/#0f172a, sub 12/#475569, band `rgba(241,245,249,.35)`, focus ring 2px #2563eb, chips 12px (20–22px high), event pills 26px.
- **Visual snapshots (CI-blocking):** NodeCard (Beginner/Pro), DecisionCard (chips), Add-Action (tabs in exact order), ConnectionTile, Canvas with lane bands, Token sheet.

## Output format
- **Edits:** patch files with minimal diff.
- **QA plan:** only shell commands to run (e.g., `npm run typecheck && npm test`, Playwright grep, curl tests).
- **Checkpoint:** `CHECKPOINT READY FOR VISUAL` then list e.g.:
  - `/agent` (Builder)
  - Open Left Chat → “Proposed Workflow” block
  - Canvas (zoom 0.9 to see lane bands)
  - Inspector → Test tab (run a sample)
  - `/tasks` → open newest run

## Safety rails
- Obey the spec even if tests are green (no token drift).
- If JSON validation fails: attempt repair, then switch provider fallback. If still failing, print the error and pause for visual check.

## CI/QA gating policy (non-interactive)
- Functional and perf tests are CI-blocking. Visual snapshots run on-demand and are not gating by default.
- DB-optional: when the database is not configured or errors, API routes must return deterministic stub data so e2e never blocks on infra.
- E2E hooks are forced in CI to ensure mock-first behavior and deterministic flows.
- LLM calls use schema-first prompts with auto-repair and provider fallback order. Structured logging is emitted on failure; no human prompts in CI.
- Secrets: AES-GCM encryption + vault-read shim for dev/CI; logs are always redacted; tests never depend on live vault.
- Tests use stable selectors and scoped timeouts; no human confirmations; no snapshot/baseline prompts in CI.
