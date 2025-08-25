import type { WorkflowDsl } from '@/lib/dsl'
import type { FlowDoc } from './schema'

const BASE_LANES = [
  { id: 'lane-input', title: 'Input', order: 1 },
  { id: 'lane-transform', title: 'Transform', order: 2 },
  { id: 'lane-decision', title: 'Decision', order: 3 },
  { id: 'lane-output', title: 'Output', order: 4 },
]

function laneForType(type: string, label?: string): string {
  const t = String(type||'').toLowerCase()
  const lbl = String(label||'').toLowerCase()
  if (t==='trigger' || t==='input' || t==='webhook' || t==='schedule' || lbl.includes('trigger') || lbl.includes('schedule')) return 'lane-input'
  if (t==='decision' || t==='switch' || lbl.includes('decision') || lbl.includes('if ')) return 'lane-decision'
  if (t==='email' || t==='slack' || t==='output' || lbl.includes('email') || lbl.includes('slack')) return 'lane-output'
  return 'lane-transform'
}

export function dslToFlowDoc(dsl: WorkflowDsl): FlowDoc {
  const lanes = [...BASE_LANES]
  const nodes = (dsl.nodes || []).map((n:any) => ({
    id: String(n.id),
    type: String(n.type||'action'),
    title: String(n?.config?.label || n.type || 'Step'),
    laneId: laneForType(String(n.type||''), String(n?.config?.label||'')),
    provider: (n?.config?.provider ? String(n.config.provider) : undefined),
    data: n?.config ? { ...n.config } : undefined,
  }))
  const edges = (dsl.edges || []).map((e:any, i:number) => ({
    id: String(e.id || `e${i}`),
    source: { nodeId: String(e.source) },
    target: { nodeId: String(e.target) },
    label: e.label ? String(e.label) : undefined,
  }))
  return { version: '1.1', lanes, nodes, edges } as any
}



