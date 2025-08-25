# Conversational Builder: AI-Driven Workflow Creation (Reference)

Purpose: The authoritative reference for FlowPuppy’s AI-first conversational builder. Use this to align behavior, debug issues, and verify acceptance criteria.

## Core Principles
- AI-only orchestration: No hardcoded flows, no code fallbacks. If providers fail, return structured errors (no silent defaults).
- Multi-step conversation: Clarify → Plan → Confirm → Build → Refine. Never skip straight to the end without user confirmation.
- Diff-first edits: LLM proposes changes as diffs; user Apply/Dismiss before committing to canvas.
- Connections are guided: User can connect real providers or approve workflow-scoped placeholders/test data to continue. Placeholders are isolated to the current workflow and only applied after explicit consent.

## Environment and Providers
- Keys (at least one required):
  - `OPENROUTER_API_KEY` (recommended fallback), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `MISTRAL_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `QWEN_API_KEY`.
- Location: `apps/web/.env.local` (restart dev server after changes).
- Routing: `getProviderOrder(purpose)` returns a prioritized list; `routeProviders()` builds the chain and executes attempts in order.

## API Endpoints (LLM-driven)
- Conversation: `POST /api/chat/continue`
  - Request: `{ prompt?: string, context?: object, step?: number, action?: any, isFollowUp?: boolean }`
  - Response (strict JSON): `{ message: string, quickActions?: {label,value}[], primaryAction?: {label,action}, secondaryActions?: {label,value}[], nextStep: number, context: object }`
  - Behavior: Orchestrates the next conversational turn only; never constructs a full workflow directly.

- Planner: `POST /api/agent/plan`
  - Request: `{ prompt?: string, answers?: Record<string,any> }`
  - Response JSON only: `{ options: { plan: {text}[], questions?:[], discoveries?:[], pipelines?:[], connectionsRequired?: string[] }, defaults?:{}, nextQuestions?:[] }`

- Confirm: `POST /api/agent/confirm`
  - Request: `{ selections: Record<string,string>, prompt?: string }`
  - Response: `{ agentSpec: {...validated...} }` (see `ZAgentSpec`)

- Generate: `POST /api/agent/generate`
  - Request: `{ agentSpec }`
  - Response: `{ flowDoc }` (normalized and convertible to canvas via Diff-Apply)

- Patch (edits/feedback loop): `POST /api/agent/patch`
  - Request: `{ instruction: string, context?: any }`
  - Response: `{ diff: { nodesAdded: {id,type,label?}[], nodesRemoved: string[], edgesAdded: {source,target,label?}[], edgesRemoved: {source,target,label?}[] } }`
  - Behavior: LLM translates a natural-language edit into a diff. UI shows Diff Preview with Apply/Dismiss.

## UI Contract (apps/web)
- Conversational panel displays:
  - Assistant `message` text.
  - `quickActions` (chips), `primaryAction` (CTA), `secondaryActions` (light CTAs).
  - When an edit is proposed, a Diff Preview appears with summary counts and a visual view (DiffPreview component). Apply commits to the canvas; Dismiss clears the proposal.
- Quick actions can trigger `PATCH` proposals (via `/api/agent/patch`) when they imply edits.
- Canvas is always editable manually; Diff-Apply is additive and does not block direct edits.

## Connections & Placeholders (Guided)
- The system surfaces `connectionsRequired` from `plan` or derived heuristics.
- The assistant asks to connect now or proceed with placeholders. If the user approves placeholders, they are stored in workflow context and used only for this workflow.
- Users can convert placeholders to real secrets later without rebuilding the flow.

## Error Handling
- If all providers fail, APIs return `{ error: 'All providers failed', details: string[] }` with `502`.
- The UI shows clear error messages in-thread (never silent or mocked behavior). The user can retry or switch providers/keys.

## Sample Multi-Step Conversation (Happy Path)
1) User: “Make a flow which researches top cooking hacks and posts it on Instagram daily with an AI-generated voiceover and video.”
2) Assistant: Offers choices (sources/schedule/format/voice/tone), primary action “Begin research,” asks to connect Instagram or simulate.
3) User: Picks trending sources, 9:00 schedule, 1080×1920 reel, subtitles, Neutral female, and “Connect Instagram” (or Simulate).
4) Assistant: Presents Plan (steps 1–7) with `connectionsRequired`. Primary action “Build plan.”
5) User: Clicks “Build plan.”
6) Assistant: Shows Diff Preview (adds nodes and edges) → user Apply.
7) Assistant: Clarifies hashtags and sources (exclude Reddit?), proposes a patch via `/api/agent/patch`. Diff Preview → Apply.
8) Assistant: Offers to simulate next run or show sample script/audio. After approval, builds final FlowDoc and applies to canvas.

## Operational Notes
- Restart dev server after changing `.env.local`.
- Expect higher latencies for first calls while models warm up.
- E2E paths:
  - Conversational: `/agent` → chat → multi-step build → Diff-Apply
  - Quick Setup: prompt → plan → auto-confirm (defaults) → generate → Diff-Apply

## Non-Mock Guarantee
- No code-generated flows for production paths.
- No mock provider outputs when keys are missing; endpoints return structured errors.
- Any placeholder/test data is explicitly approved by the user in conversation and scoped to the current workflow.


