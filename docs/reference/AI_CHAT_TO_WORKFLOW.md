### AI Chat → Workflow (Planner) Reference

## Overview

- UI: `Create` page (conversational plan + live sketch) and `ChatPanel` (Builder → Testing). Buttons: Generate (creates DSL), Explain (SSE narrative), Refine (append hints), Accept/Apply (merge to graph).
- API: `POST /api/ai/generate-workflow` calls `generateWorkflowDslFromPrompt()` with provider routing.
- Providers: Routed via `aiRouting.ts` → `providers.ts` (Claude, OpenAI, others). If no keys, returns mock text and the planner falls back to a minimal valid DSL.

## Environment Variables

Set in `apps/web/.env.local` (Next.js automatically loads):

```
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
# Optional additional providers (placeholders supported):
MISTRAL_API_KEY=...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
QWEN_API_KEY=...
```

No restart needed during `npm run dev`, but a refresh may be required.

## Flow Details

1) User prompts → `POST /api/ai/generate-workflow`.
2) Planner composes a structured prompt with DSL v2.1 schema and rules.
3) Provider order (org override → global) resolved, then attempts in sequence.
4) Response parsed as JSON; strict validation; normalization (e.g., switch case labels). Missing secrets inferred.
5) Returns `{ dsl, rationale, confidence, missingSecrets }`.
6) UI shows DiffPreview; Apply replaces graph; missing secrets helper enables quick secret creation.

## Known Limitations (current)

- SSE Explain streams narrative, with concurrent planner call. Narrative→DSL heuristic may still be simplistic.
- If no provider returns valid JSON, planner provides a deterministic fallback DSL.

## Roadmap (Sprint A tasks)

- Unify Explain SSE with planner status events (single stream with rationale + partial DSL deltas).
- Expand fallback matrix and tests (≥25 prompts golden tests).
- Provider-level timeouts/backoff surfaced in planner metrics; better error messages to UI.

## Manual QA

- Create → Conversation: enter a prompt and click Explain; watch steps appear and Live Sketch update top-down.
- Accept Plan → Builder: canvas opens with top-down layout; use Back to Chat to iterate further; ensure conversation persists.
- Builder → Testing → Chat (optional): Generate and Apply; simulate runs.


