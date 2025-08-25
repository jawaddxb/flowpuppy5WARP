// Orchestrator type contracts (Phase 0)
// These interfaces are stable so UI/planner can build against them before runtime ships.

export type TaskStatus = 'pending' | 'running' | 'ok' | 'error' | 'canceled'
export type StepStatus = 'idle' | 'running' | 'ok' | 'error' | 'canceled'

export type JoinPolicy = 'all' | 'any' | { count: number } | { deadlineMs: number }
export type CancelPolicy = 'downstream' | 'block' | 'none'
export type BackoffKind = 'const' | 'linear' | 'expo'

export interface RetryPolicy {
  max: number
  backoff: BackoffKind
  baseMs?: number
  jitter?: boolean
  on?: Array<'timeout' | '5xx' | '4xx' | 'network'>
}

export interface ResourcePolicy {
  concurrency?: number
  rateLimitPerSec?: number
  budgetUSD?: number
  providerPool?: string
}

export interface ArtifactRef {
  name: string
  contentType: string
  size?: number
  url?: string // link to blob storage if large
  inline?: unknown // small JSON payloads can be inlined
}

export interface StepCounters {
  attempts: number
  durationMs?: number
  startedAt?: string
  finishedAt?: string
  running?: number
  success?: number
  failed?: number
  canceled?: number
}

export interface StepCosts {
  httpRequests?: number
  llmTokensIn?: number
  llmTokensOut?: number
  computeMs?: number
  usdApprox?: number
}

export interface StepTrace {
  id: string
  title?: string
  type?: string
  status: StepStatus
  counters: StepCounters
  costs?: StepCosts
  input?: ArtifactRef
  output?: ArtifactRef
  error?: ArtifactRef
  artifacts?: ArtifactRef[]
  children?: StepTrace[]
}

export interface TaskTrace {
  id: string
  status: TaskStatus
  createdAt: string
  updatedAt?: string
  root: StepTrace
}

export interface RunOptions {
  // global resource guard
  budgetUSD?: number
}

// The orchestrator entry point signature (implementation added later in Phase 4)
export async function run(flowDoc: unknown, input: unknown, opts?: RunOptions): Promise<TaskTrace> {
  // Placeholder to satisfy imports during UI/planner work. Throws until runtime ships.
  throw new Error('orchestrator.run not implemented yet (Phase 4)')
}



