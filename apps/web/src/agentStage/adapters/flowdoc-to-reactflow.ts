import type { FlowDoc } from '@/lib/flowdoc/schema'
import type { Node, Edge } from 'reactflow'

const LANE_ORDER: Array<'input'|'transform'|'decision'|'output'> = [
  'input', 'transform', 'decision', 'output',
]

export type FlowToRFOptions = {
  laneColWidth?: number
  gutter?: number
  yStep?: number
}

export function flowDocToReactFlow(flow: FlowDoc, opts: FlowToRFOptions = {}): { nodes: Node[]; edges: Edge[] } {
  const laneColWidth = opts.laneColWidth ?? 300
  const gutter = opts.gutter ?? 24
  const yStep = opts.yStep ?? 120

  // Map FlowDoc lanes to normalized domains in fixed order
  const laneIdToDomain = new Map<string, 'input'|'transform'|'decision'|'output'>()
  for (const lane of flow.lanes) {
    const id = String(lane.id).toLowerCase()
    const title = String(lane.title || '').toLowerCase()
    if (id.includes('input') || title.includes('input')) laneIdToDomain.set(lane.id, 'input')
    else if (id.includes('decision') || title.includes('decision')) laneIdToDomain.set(lane.id, 'decision')
    else if (id.includes('output') || title.includes('output')) laneIdToDomain.set(lane.id, 'output')
    else laneIdToDomain.set(lane.id, 'transform')
  }

  const laneDomainToRank = new Map<string, number>()
  const laneDomainToCount = new Map<string, number>()
  LANE_ORDER.forEach((d, i) => { laneDomainToRank.set(d, i); laneDomainToCount.set(d, 0) })

  const nodes: Node[] = flow.nodes.map((n) => {
    const domain = laneIdToDomain.get(n.laneId) || 'transform'
    const laneIndex = laneDomainToRank.get(domain) ?? 1
    const idxInLane = laneDomainToCount.get(domain) ?? 0
    laneDomainToCount.set(domain, idxInLane + 1)

    const x = laneIndex * (laneColWidth + gutter)
    const y = 80 + idxInLane * yStep

    const kind = normalizeKind(n.type)
    const title = n.title || prettyTitle(kind)
    const subtitle = buildSubtitle(kind, n)

    return {
      id: n.id,
      type: 'agentNode',
      position: { x, y },
      data: {
        kind, // input | fetch | decision | output | ai | loop | condition
        title,
        subtitle,
        provider: n.provider,
        raw: n,
      },
    } as Node
  })

  const edges: Edge[] = flow.edges.map((e, i) => ({
    id: e.id || `e${i}`,
    source: e.source.nodeId,
    target: e.target.nodeId,
    type: 'default',
    label: e.label,
    animated: false,
  }))

  return { nodes, edges }
}

function normalizeKind(t: string): 'input'|'fetch'|'decision'|'output'|'ai'|'loop'|'condition'|'transform' {
  const s = String(t || '').toLowerCase()
  if (s.includes('trigger') || s.includes('input') || s.includes('webhook') || s.includes('schedule')) return 'input'
  if (s.includes('decision') || s.includes('switch')) return 'decision'
  if (s.includes('email') || s.includes('slack') || s.includes('output')) return 'output'
  if (s.includes('agent') || s.includes('ai') || s.includes('llm')) return 'ai'
  if (s.includes('loop')) return 'loop'
  if (s.includes('condition')) return 'condition'
  if (s.includes('http') || s.includes('fetch') || s.includes('api')) return 'fetch'
  return 'transform'
}

function prettyTitle(kind: string): string {
  switch (kind) {
    case 'input': return 'Trigger'
    case 'fetch': return 'Fetch'
    case 'decision': return 'Decision'
    case 'output': return 'Send'
    case 'ai': return 'Agent Step'
    case 'loop': return 'Enter Loop'
    case 'condition': return 'Condition'
    default: return 'Step'
  }
}

function buildSubtitle(kind: string, n: any): string {
  if (kind === 'fetch') {
    const method = (n?.data?.method || 'GET').toString().toUpperCase()
    const endpoint = (n?.data?.url || n?.data?.endpoint || '').toString()
    if (endpoint) return `${method} ${truncate(endpoint, 48)}`
    return method
  }
  if (kind === 'ai') {
    const model = n?.data?.model || n?.provider || 'Model'
    return `AI · ${model}`
  }
  return ''
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, Math.max(0, n - 1)) + '…'
}



