import { z } from 'zod'

// Universal Workflow DSL (v1.1) — single source of truth for Story, Swimlane, Graph modes

export type UUID = string

export type ViewMode = 'story' | 'swimlane' | 'graph'
export type LaneDomain = 'input' | 'blockchain' | 'decision' | 'discord' | 'transform' | 'output' | 'other'
export type NodeType = 'input' | 'action' | 'web3Action' | 'decision' | 'macro' | 'output'
export type Guard = 'yes' | 'no' | 'default' | 'custom'

export interface FlowDoc {
  version: '1.0'
  id: UUID
  title: string
  meta?: {
    description?: string
    createdAt?: string
    author?: string
    tags?: string[]
  }
  view?: {
    defaultMode: ViewMode
    beginnerHints?: boolean
    showLanes?: boolean
    colorTokens?: Partial<Record<LaneDomain, string>>
    labelDensity?: 'beginner' | 'pro'
  }
  lanes: Lane[]
  phases?: Phase[]
  nodes: UNode[]
  edges: UEdge[]
  subflows?: SubflowDef[]
  glossary?: Record<string, string>
  narrative?: Narrative
}

export interface Lane {
  id: UUID
  domain: LaneDomain
  title: string
  order: number
}

export interface Phase {
  id: UUID
  title: string
  order: number
  nodeIds?: UUID[]
}

export interface PortHint {
  yesSide?: 'right' | 'bottom'
  noSide?: 'left' | 'bottom'
}

export interface UNode {
  id: UUID
  type: NodeType
  title: string
  description?: string
  laneId: UUID
  phaseId?: UUID
  provider?: 'discord' | 'ethereum' | 'api' | 'system' | 'transform' | string
  icon?: string
  data?: Record<string, any>
  ports?: { in?: string[]; out?: string[] }
  decision?: {
    expression?: string
    branches?: Array<{ guard: Guard; label?: string }>
    portHint?: PortHint
  }
  macroRef?: { subflowId: UUID; collapsedByDefault?: boolean }
  exec?: { retry?: number; timeoutMs?: number; secrets?: string[] }
  io?: { inputSchema?: Record<string, any>; outputSchema?: Record<string, any> }
  ui?: { stepNumber?: number; emphasis?: 'low' | 'normal' | 'high'; sampleData?: Record<string, any>; density?: 'beginner' | 'pro' }
}

export interface UEdge {
  id: UUID
  source: { nodeId: UUID; port?: string }
  target: { nodeId: UUID; port?: string }
  label?: string
  guard?: Guard
  condition?: string
  style?: 'normal' | 'dashed' | 'highlight'
  isPrimaryPath?: boolean
  bundleKey?: string
  priority?: number
}

export interface SubflowDef {
  id: UUID
  title: string
  nodes: UNode[]
  edges: UEdge[]
  lanes?: Lane[]
  phases?: Phase[]
}

export interface Narrative {
  overview?: string
  steps: Array<{ stepNumber: number; title: string; text: string; linkTo?: { nodeId?: UUID; edgeId?: UUID } }>
}

// Zod schema
const zUUID = z.string().min(1)
const zViewMode = z.enum(['story', 'swimlane', 'graph'])
const zLaneDomain = z.enum(['input', 'blockchain', 'decision', 'discord', 'transform', 'output', 'other'])
const zNodeType = z.enum(['input', 'action', 'web3Action', 'decision', 'macro', 'output'])
const zGuard = z.enum(['yes', 'no', 'default', 'custom'])

export const ZLane = z.object({
  id: zUUID,
  domain: zLaneDomain,
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
})

export const ZPhase = z.object({
  id: zUUID,
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  nodeIds: z.array(zUUID).optional(),
})

const ZPortHintBase = z.object({ yesSide: z.enum(['right', 'bottom']).optional(), noSide: z.enum(['left', 'bottom']).optional() })
export const ZPortHint = ZPortHintBase.optional()

export const ZNode = z.object({
  id: zUUID,
  type: zNodeType,
  title: z.string().min(1),
  description: z.string().optional(),
  laneId: zUUID,
  phaseId: zUUID.optional(),
  provider: z.string().optional(),
  icon: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
  ports: z
    .object({
      in: z.array(z.string()).optional(),
      out: z.array(z.string()).optional(),
    })
    .optional(),
  decision: z
    .object({
      expression: z.string().optional(),
      branches: z.array(z.object({ guard: zGuard, label: z.string().optional() })).optional(),
      portHint: ZPortHintBase.optional(),
    })
    .optional(),
  macroRef: z
    .object({
      subflowId: zUUID,
      collapsedByDefault: z.boolean().optional(),
    })
    .optional(),
  exec: z
    .object({ retry: z.number().int().nonnegative().optional(), timeoutMs: z.number().int().positive().optional(), secrets: z.array(z.string()).optional() })
    .optional(),
  io: z.object({ inputSchema: z.record(z.string(), z.any()).optional(), outputSchema: z.record(z.string(), z.any()).optional() }).optional(),
  ui: z
    .object({ stepNumber: z.number().int().positive().optional(), emphasis: z.enum(['low', 'normal', 'high']).optional(), sampleData: z.record(z.string(), z.any()).optional(), density: z.enum(['beginner', 'pro']).optional() })
    .optional(),
})

export const ZEdge = z.object({
  id: zUUID,
  source: z.object({ nodeId: zUUID, port: z.string().optional() }),
  target: z.object({ nodeId: zUUID, port: z.string().optional() }),
  label: z.string().optional(),
  guard: zGuard.optional(),
  condition: z.string().optional(),
  style: z.enum(['normal', 'dashed', 'highlight']).optional(),
  isPrimaryPath: z.boolean().optional(),
  bundleKey: z.string().optional(),
  priority: z.number().optional(),
})

export const ZSubflow = z.object({ id: zUUID, title: z.string().min(1), nodes: z.array(ZNode), edges: z.array(ZEdge), lanes: z.array(ZLane).optional(), phases: z.array(ZPhase).optional() })

export const ZNarrative = z.object({
  overview: z.string().optional(),
  steps: z.array(z.object({ stepNumber: z.number().int().positive(), title: z.string(), text: z.string(), linkTo: z.object({ nodeId: zUUID.optional(), edgeId: zUUID.optional() }).optional() })),
})

export const ZFlowDoc = z.object({
  version: z.literal('1.0'),
  id: zUUID,
  title: z.string().min(1),
  meta: z.object({ description: z.string().optional(), createdAt: z.string().optional(), author: z.string().optional(), tags: z.array(z.string()).optional() }).optional(),
  view: z
    .object({ defaultMode: zViewMode, beginnerHints: z.boolean().optional(), showLanes: z.boolean().optional(), colorTokens: z.record(z.string(), z.string()).optional(), labelDensity: z.enum(['beginner', 'pro']).optional() })
    .optional(),
  lanes: z.array(ZLane).min(1),
  phases: z.array(ZPhase).optional(),
  nodes: z.array(ZNode).min(1),
  edges: z.array(ZEdge),
  subflows: z.array(ZSubflow).optional(),
  glossary: z.record(z.string(), z.string()).optional(),
  narrative: ZNarrative.optional(),
})

export function validateFlowDoc(input: unknown): { ok: true; value: FlowDoc } | { ok: false; errors: string[] } {
  const res = ZFlowDoc.safeParse(input)
  if (!res.success) {
    return { ok: false, errors: res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
  }
  const flow = res.data as FlowDoc
  const errors: string[] = []
  const laneIds = new Set(flow.lanes.map((l) => l.id))
  const phaseIds = new Set((flow.phases || []).map((p) => p.id))
  const nodeIds = new Set(flow.nodes.map((n) => n.id))

  // Lanes must cover all nodes
  for (const n of flow.nodes) {
    if (!laneIds.has(n.laneId)) errors.push(`node ${n.id} laneId not found: ${n.laneId}`)
    if (n.phaseId && !phaseIds.has(n.phaseId)) errors.push(`node ${n.id} phaseId not found: ${n.phaseId}`)
    if (n.macroRef) {
      const has = (flow.subflows || []).some((s) => s.id === n.macroRef!.subflowId)
      if (!has) errors.push(`node ${n.id} macroRef.subflowId not found: ${n.macroRef.subflowId}`)
    }
  }

  // Edge refs must exist
  for (const e of flow.edges) {
    if (!nodeIds.has(e.source.nodeId)) errors.push(`edge ${e.id} source node not found: ${e.source.nodeId}`)
    if (!nodeIds.has(e.target.nodeId)) errors.push(`edge ${e.id} target node not found: ${e.target.nodeId}`)
  }

  // Decision checks: at least one yes/no branch OR explicit branches defined
  const outgoingByNode: Record<string, UEdge[]> = {}
  for (const e of flow.edges) {
    ;(outgoingByNode[e.source.nodeId] ||= []).push(e)
  }
  for (const n of flow.nodes) {
    if (n.type === 'decision') {
      const outs = outgoingByNode[n.id] || []
      const hasYes = outs.some((e) => e.guard === 'yes' || (e.label || '').toLowerCase() === 'yes')
      const hasNo = outs.some((e) => e.guard === 'no' || (e.label || '').toLowerCase() === 'no')
      const hasBranches = (n.decision?.branches || []).length > 0
      if (!(hasBranches || (hasYes && hasNo))) {
        errors.push(`decision ${n.id} must have yes/no edges or branches`)
      }
    }
  }

  // Orphans: ignore macros; ensure others have at least one incident edge
  const incident = new Set<string>()
  for (const e of flow.edges) {
    incident.add(e.source.nodeId)
    incident.add(e.target.nodeId)
  }
  for (const n of flow.nodes) {
    if (n.type === 'macro') continue
    if (!incident.has(n.id)) errors.push(`orphan node: ${n.id}`)
  }

  if (errors.length) return { ok: false, errors }
  return { ok: true, value: flow }
}

// Example document (NFT → Discord role)
export const EXAMPLE_NFT_DISCORD: FlowDoc = {
  version: '1.0',
  id: 'flow-role-assign-001',
  title: 'Assign Discord Holder Role from NFT',
  view: {
    defaultMode: 'swimlane',
    beginnerHints: true,
    showLanes: true,
    colorTokens: { input: '#1f77b4', blockchain: '#7e57c2', decision: '#f0ad4e', discord: '#4b5bdc', transform: '#3ba37b', output: '#2ca02c' },
  },
  lanes: [
    { id: 'lane-input', domain: 'input', title: 'Input', order: 1 },
    { id: 'lane-chain', domain: 'blockchain', title: 'Blockchain', order: 2 },
    { id: 'lane-decision', domain: 'decision', title: 'Decision', order: 3 },
    { id: 'lane-discord', domain: 'discord', title: 'Discord', order: 4 },
    { id: 'lane-output', domain: 'output', title: 'Output', order: 5 },
  ],
  phases: [
    { id: 'phase-intake', title: 'Intake', order: 1 },
    { id: 'phase-verify', title: 'Verify Ownership', order: 2 },
    { id: 'phase-assign', title: 'Assign Role', order: 3 },
  ],
  nodes: [
    { id: 'n-inputWallet', type: 'input', title: 'Wallet Address', description: 'User provides an EVM wallet address.', laneId: 'lane-input', phaseId: 'phase-intake', provider: 'system', icon: 'input', ui: { stepNumber: 1, sampleData: { wallet: '0xabc…1234' } } },
    { id: 'n-checkNFT', type: 'web3Action', title: 'Check NFT ownership', description: 'Query contract to check ownership/balance.', laneId: 'lane-chain', phaseId: 'phase-verify', provider: 'ethereum', icon: 'ethereum', data: { network: 'mainnet', contractAddress: '0xDEAD...BEEF', method: 'balanceOf' }, ui: { stepNumber: 2 } },
    { id: 'n-decision', type: 'decision', title: 'Has NFT?', laneId: 'lane-decision', phaseId: 'phase-verify', provider: 'system', icon: 'decision', decision: { expression: '${n-checkNFT.balance > 0}', branches: [{ guard: 'yes', label: 'has NFT' }, { guard: 'no', label: 'no NFT' }], portHint: { yesSide: 'right', noSide: 'left' } }, ui: { stepNumber: 3 } },
    { id: 'n-lookupDiscord', type: 'action', title: 'Resolve Discord user', description: 'Map wallet → Discord user via account link service.', laneId: 'lane-discord', phaseId: 'phase-assign', provider: 'api', icon: 'api', data: { endpoint: 'GET /user/by-wallet' }, ui: { stepNumber: 4 } },
    { id: 'n-assignRole', type: 'action', title: 'Assign Holder role', laneId: 'lane-discord', phaseId: 'phase-assign', provider: 'discord', icon: 'discord', data: { roleName: 'Holder', guildId: '1234567890' }, ui: { stepNumber: 5 } },
    { id: 'n-confirm', type: 'action', title: 'Confirm role assigned', laneId: 'lane-discord', phaseId: 'phase-assign', provider: 'api', icon: 'check', ui: { stepNumber: 6 } },
    { id: 'n-success', type: 'output', title: 'Success', description: 'Friendly success message.', laneId: 'lane-output', phaseId: 'phase-assign', provider: 'system', icon: 'success', ui: { stepNumber: 7 } },
    { id: 'n-failure', type: 'output', title: 'Failure', description: 'Friendly failure message.', laneId: 'lane-output', phaseId: 'phase-verify', provider: 'system', icon: 'failure', ui: { stepNumber: 8 } },
  ],
  edges: [
    { id: 'e1', source: { nodeId: 'n-inputWallet' }, target: { nodeId: 'n-checkNFT' }, isPrimaryPath: true },
    { id: 'e2', source: { nodeId: 'n-checkNFT' }, target: { nodeId: 'n-decision' }, isPrimaryPath: true },
    { id: 'e3', source: { nodeId: 'n-decision' }, target: { nodeId: 'n-lookupDiscord' }, label: 'has NFT', guard: 'yes', isPrimaryPath: true },
    { id: 'e4', source: { nodeId: 'n-lookupDiscord' }, target: { nodeId: 'n-assignRole' }, isPrimaryPath: true },
    { id: 'e5', source: { nodeId: 'n-assignRole' }, target: { nodeId: 'n-confirm' }, isPrimaryPath: true },
    { id: 'e6', source: { nodeId: 'n-confirm' }, target: { nodeId: 'n-success' }, isPrimaryPath: true },
    { id: 'e7', source: { nodeId: 'n-decision' }, target: { nodeId: 'n-failure' }, label: 'no NFT', guard: 'no' },
  ],
  narrative: {
    overview: 'Assign a Discord role to users who hold a specific NFT.',
    steps: [
      { stepNumber: 1, title: 'Provide wallet', text: 'User enters their wallet address.', linkTo: { nodeId: 'n-inputWallet' } },
      { stepNumber: 2, title: 'Verify NFT', text: 'We call the contract to check ownership.', linkTo: { nodeId: 'n-checkNFT' } },
      { stepNumber: 3, title: 'Decision: Has NFT?', text: 'If balance > 0, proceed; else show a friendly failure.', linkTo: { nodeId: 'n-decision' } },
      { stepNumber: 4, title: 'Resolve Discord user', text: 'Map wallet to the linked Discord account.', linkTo: { nodeId: 'n-lookupDiscord' } },
      { stepNumber: 5, title: 'Assign role', text: 'Grant the Holder role in the target guild.', linkTo: { nodeId: 'n-assignRole' } },
      { stepNumber: 6, title: 'Confirm', text: 'Verify the role assignment succeeded.', linkTo: { nodeId: 'n-confirm' } },
      { stepNumber: 7, title: 'Success', text: 'Show a friendly success message.', linkTo: { nodeId: 'n-success' } },
      { stepNumber: 8, title: 'Failure path', text: 'If no NFT, show a friendly failure message.', linkTo: { nodeId: 'n-failure' } },
    ],
  },
}


