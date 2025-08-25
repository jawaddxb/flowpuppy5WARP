"use client"
import { create } from "zustand"
import { MarkerType } from "reactflow"
import { validateFlowDoc } from '@/lib/flowdoc/validate'
import { validateFlowDocStrict } from '@/lib/flowdoc/schema'
import type { Edge, Node } from "reactflow"

type Anchor =
  | { kind: "node"; nodeId: string; ui?: { x: number; y: number } }
  | { kind: "branch"; nodeId: string; label: string; ui?: { x: number; y: number } }
  | { kind: "pill"; nodeId: string; pillId: string; ui?: { x: number; y: number } }
  | { kind: "canvas"; ui: { x: number; y: number } }

export type FlowDoc = {
  version: '1.1'
  meta?: Record<string, any>
  lanes: { id: string; title?: string; order: number }[]
  nodes: any[]
  edges: any[]
}

type CatalogKind = "Logic"|"AI"|"Apps"|"Chat"|"Scrapers"|"By FlowPuppy"
export type NodeRunStatus = 'idle'|'running'|'ok'|'error'

interface GraphState {
  flow: FlowDoc
  rfNodes: Node[]
  rfEdges: Edge[]
  issues: Array<{ kind: 'error'|'warning'; code: string; message: string; nodeId?: string; edgeId?: string }>
  strictIssues: string[]
  anchor?: Anchor
  activeNodeId?: string | null
  uiMode: 'beginner' | 'pro'
  hoverNodeId?: string | null
  nodeStatus: Record<string, NodeRunStatus>
  runHistory: Array<{ id: string; startedAt: number; lines: string[] }>
  dirty: boolean
  undoStack: FlowDoc[]
  openAdd(anchor: Anchor): void
  closeAdd(): void
  addNodeAndWire(kind: CatalogKind, label: string): void
  updateNodeData(nodeId: string, patch: any): void
  setFlow(flow: FlowDoc): void
  setActiveNode(id: string | null): void
  setUiMode(mode: 'beginner'|'pro'): void
  setHoverNode(id: string | null): void
  markSaved(): void
  pushUndo(): void
  undo(): void
  renameBranch(nodeId: string, oldLabel: string, newLabel: string): void
  setBranches(nodeId: string, branches: string[]): void
  setNodeStatus(nodeId: string, status: NodeRunStatus): void
  resetStatus(): void
  pushRun(lines: string[]): void
  clearRuns(): void
}

const laneIndex = (flow: FlowDoc, laneId: string) =>
  flow.lanes.slice().sort((a,b)=>a.order-b.order).findIndex(l => l.id === laneId)

const laneForKind = (kind: CatalogKind) =>
  kind === "Logic" ? "lane-decision"
  : kind === "AI" ? "lane-transform"
  : (kind === "Apps" || kind === "Chat") ? "lane-output"
  : "lane-transform"

const NEW_ID = (p:string)=> `${p}-${Math.random().toString(36).slice(2,7)}`

const TOKENS = { laneColWidth: 300, gutter: 24 }

export const useGraph = create<GraphState>((set, get) => ({
  flow: { version: '1.1', lanes: [], nodes: [], edges: [] },
  rfNodes: [], rfEdges: [],
  issues: [],
  strictIssues: [],
  anchor: undefined,
  activeNodeId: null,
  uiMode: (()=>{ try { return (localStorage.getItem('fp-ui-mode') as any) || 'beginner' } catch { return 'beginner' } })(),
  hoverNodeId: null,
  nodeStatus: {},
  dirty: false,
  undoStack: [],
  runHistory: (()=>{ try { const raw = localStorage.getItem('fp-agent-runs'); return raw ? JSON.parse(raw) : [] } catch { return [] } })(),
  openAdd: (anchor)=> set({ anchor }),
  closeAdd: ()=> set({ anchor: undefined }),
  setActiveNode: (id) => set({ activeNodeId: id }),
  setUiMode: (mode) => { try { localStorage.setItem('fp-ui-mode', mode) } catch {}; set({ uiMode: mode }) },
  setHoverNode: (id) => set({ hoverNodeId: id }),
  setFlow: (flow)=> set({ ...(sync(flow)), nodeStatus: {}, dirty: true }),
   pushUndo: () => {
    const cur = get().flow
    const stack = get().undoStack || []
    const nextStack = [structuredClone(cur), ...stack].slice(0, 20)
    set({ undoStack: nextStack })
  },
  undo: () => {
    const stack = get().undoStack || []
    if (!stack.length) return
    const [head, ...rest] = stack as [FlowDoc, ...FlowDoc[]]
    set({ ...(sync(head)), undoStack: rest, dirty: true })
  },
  updateNodeData: (nodeId, patch) => {
    const flow = structuredClone(get().flow)
    const n = flow.nodes.find((n:any)=>n.id===nodeId)
    if (n) n.data = { ...(n.data||{}), ...patch }
    set({ ...sync(flow), dirty: true })
  },
  renameBranch: (nodeId, oldLabel, newLabel) => {
    const flow = structuredClone(get().flow)
    const n = flow.nodes.find((m:any)=> m.id===nodeId)
    if (n) {
      const arr = Array.isArray(n.data?.branches) ? [...n.data.branches] : []
      const idx = arr.findIndex((b:any)=> String(b)===String(oldLabel))
      if (idx >= 0) arr[idx] = newLabel
      n.data = { ...(n.data||{}), branches: arr }
    }
    for (const e of flow.edges) {
      if (e?.source?.nodeId === nodeId && String(e.label||'') === String(oldLabel)) {
        e.label = newLabel
      }
    }
    set(sync(flow))
  },
  setBranches: (nodeId, branches) => {
    const flow = structuredClone(get().flow)
    const n = flow.nodes.find((m:any)=> m.id===nodeId)
    if (n) n.data = { ...(n.data||{}), branches: [...branches] }
    set(sync(flow))
  },
  setNodeStatus: (nodeId, status) => {
    const cur = get().nodeStatus || {}
    set({ nodeStatus: { ...cur, [nodeId]: status } })
  },
  resetStatus: () => set({ nodeStatus: {} }),
  pushRun: (lines) => {
    const prev = get().runHistory || []
    const next = [{ id: NEW_ID('r'), startedAt: Date.now(), lines: [...lines] }, ...prev].slice(0, 25)
    set({ runHistory: next })
    try { localStorage.setItem('fp-agent-runs', JSON.stringify(next)) } catch {}
  },
  clearRuns: () => { set({ runHistory: [] }); try { localStorage.setItem('fp-agent-runs', JSON.stringify([])) } catch {} },
  addNodeAndWire: (kind, label) => {
    const { flow, anchor } = get(); if (!anchor) return
    const f = structuredClone(flow)
    const sourceId = (anchor as any).nodeId

    const laneId = laneForKind(kind)
    const newId = NEW_ID("n")
    // Compute rank for insert below source if same lane; else append to target lane
    let desiredRank: number = 0
    const src = f.nodes.find((n:any)=> n.id===sourceId)
    if (src && src.laneId === laneId) {
      const laneNodes = f.nodes.filter((n:any)=> n.laneId === laneId)
      const getRank = (n:any, idx:number)=> (typeof n?.data?.rank === 'number' ? n.data.rank : idx)
      const srcIdx = laneNodes.findIndex((n:any)=> n.id===sourceId)
      const srcRank = getRank(laneNodes[srcIdx], srcIdx)
      desiredRank = srcRank + 1
      // shift ranks >= desiredRank
      for (const n of laneNodes) {
        const idx = laneNodes.findIndex((m:any)=> m.id===n.id)
        const r = getRank(n, idx)
        if (r >= desiredRank) {
          n.data = { ...(n.data||{}), rank: r + 1 }
        }
      }
    } else {
      const laneNodes = f.nodes.filter((n:any)=> n.laneId === laneId)
      const maxRank = laneNodes.reduce((mx:number, n:any, i:number)=> {
        const r = typeof n?.data?.rank === 'number' ? n.data.rank : i
        return Math.max(mx, r)
      }, -1)
      desiredRank = maxRank + 1
    }
    // Determine semantic type/provider based on catalog selection
    let newType = "action" as string
    let provider: string | undefined
    if (kind === 'Logic' && /condition/i.test(label)) { newType = 'decision' }
    if (kind === 'Logic' && /loop/i.test(label)) { newType = 'loop' }
    if ((kind === 'Apps' || kind === 'Chat') && /gmail/i.test(label)) provider = 'gmail'
    if ((kind === 'Apps' || kind === 'Chat') && /slack/i.test(label)) provider = 'slack'
    if (kind === 'By FlowPuppy' && /http/i.test(label)) provider = 'http'
    if (kind === 'AI') provider = (provider || 'ai')
    const nodeObj: any = { id: newId, type: newType, title: label, laneId, data: { icon: "🧩", rank: desiredRank } }
    if (provider) nodeObj.provider = provider
    // AB-207: Default boolean branches to No/Yes for new decisions
    if (newType === 'decision' && !nodeObj.data.branches) nodeObj.data.branches = ['No','Yes']
    if (/kbase/i.test(label)) { nodeObj.type = 'agent'; nodeObj.provider = 'ai'; nodeObj.data = { ...(nodeObj.data||{}), kbase: { url: '', mode: 'Auto' } } }
    f.nodes.push(nodeObj)

    if (anchor.kind !== 'canvas') {
      const edgeId = NEW_ID("e")
      const e: any = { id: edgeId, source: { nodeId: sourceId }, target: { nodeId: newId } }
      if (anchor.kind === "branch") e.label = (anchor as any).label
      if (anchor.kind === 'pill') e.label = (anchor as any).pillId === 'sent' ? 'After email sent' : ((anchor as any).pillId === 'reply' ? 'After reply received' : undefined)
      f.edges.push(e)
    }

    set({ ...sync(f), dirty: true })
    set({ anchor: undefined })
  },
  markSaved: () => set({ dirty: false }),
}))

export function toReactFlow(flow: FlowDoc) {
  const orderedLanes = flow.lanes.slice().sort((a,b)=>a.order-b.order)
  const order: Record<string,number> = Object.fromEntries(orderedLanes.map((l,i)=>[l.id,i]))
  const yStep = 140

  // Compute per-lane ordering by data.rank (fallback to stable index)
  const laneToOrderedIds = new Map<string, string[]>()
  for (const lane of orderedLanes) {
    const laneNodes = (flow.nodes || []).filter((n:any)=> String(n.laneId)===lane.id)
    const withRank = laneNodes.map((n:any, idx:number)=> ({ id: String(n.id), rank: (typeof n?.data?.rank === 'number' ? Number(n.data.rank) : idx) }))
    withRank.sort((a,b)=> a.rank - b.rank)
    laneToOrderedIds.set(lane.id, withRank.map(x=> x.id))
  }
  const idToIndexInLane: Record<string, number> = {}
  laneToOrderedIds.forEach((ids, laneId)=> { ids.forEach((id, idx)=> { idToIndexInLane[id] = idx }) })

  function computePrimaryEdgeIds(): Set<string> {
    const primary = new Set<string>()
    const inputs = (flow.nodes || []).filter((n:any)=> ['input','trigger','webhook','schedule'].includes(String(n.type||'').toLowerCase()))
    if (!inputs.length) return primary
    const start = String(inputs[0].id)
    const outBySrc = new Map<string, any[]>()
    for (const e of (flow.edges || []) as any[]) {
      const s = String(e?.source?.nodeId||''); if (!s) continue
      const arr = outBySrc.get(s) || []; arr.push(e); outBySrc.set(s, arr)
    }
    const seen = new Set<string>()
    let cur = start
    let guard = 0
    while (guard++ < 256) {
      if (seen.has(cur)) break
      seen.add(cur)
      const outs = outBySrc.get(cur) || []
      if (!outs.length) break
      const e = outs[0]
      if (e?.id) primary.add(String(e.id))
      cur = String(e?.target?.nodeId || '')
      if (!cur) break
    }
    return primary
  }
  const primaryEdgeIds = computePrimaryEdgeIds()

  const nodes: Node[] = flow.nodes.map((n:any) => {
    const laneId: string = String(n.laneId)
    const indexInLane = (Object.prototype.hasOwnProperty.call(idToIndexInLane, String(n.id))
      ? (idToIndexInLane as any)[String(n.id)]
      : 0) as number
    const isDecision = String(n.type||"").toLowerCase()==='decision'
    const provider = String(n.provider||'')
    const isOutput = String(n.type||"").toLowerCase()==='output' || provider.toLowerCase()==='gmail' || provider.toLowerCase()==='slack'
    // Show email-specific event pills only for Gmail outputs
    const eventPills = (provider.toLowerCase()==='gmail') ? (n.eventPills || [ { id:'sent', label:'After email sent' }, { id:'reply', label:'After reply received' } ]) : undefined
    const t = String(n.type||'').toLowerCase()
    const kind: 'input'|'fetch'|'decision'|'output'|'ai'|'loop'|'condition'|'transform' =
      (t==='trigger'||t==='input'||t==='webhook'||t==='schedule') ? 'input'
      : (t==='decision') ? 'decision'
      : (t==='loop') ? 'loop'
      : (provider==='gmail'||provider==='slack'||t==='output') ? 'output'
      : (provider==='ai') ? 'ai'
      : (provider==='http'||(n?.data?.url)) ? 'fetch'
      : 'transform'
    let subtitle: string | undefined = undefined
    if (kind==='fetch') {
      const method = String((n?.data?.method||'GET')).toUpperCase()
      const url = String(n?.data?.url||n?.data?.endpoint||'')
      if (url) subtitle = `${method} ${url}`
      else subtitle = method
    }
    const xPos = 24 + (order[laneId]||0)*(TOKENS.laneColWidth+TOKENS.gutter)
    const yPos = (typeof n?.data?.y === 'number') ? Number(n.data.y) : (80 + indexInLane * yStep)
    return {
      id: n.id,
      type: isDecision ? "decisionCard" : "nodeCard",
      position: { x: xPos, y: yPos },
      data: {
        title: n.title,
        subtitle: subtitle || n.subtitle || n.description,
        icon: n.icon,
        eventPills,
        branches: n.data?.branches,
        kind,
        provider,
      }
    } as Node
  })

  const edges: Edge[] = flow.edges.map((e:any)=> ({
    id: e.id,
    source: e.source.nodeId,
    target: e.target.nodeId,
    type: "chipEdge",
    label: e.label,
    data: { primary: primaryEdgeIds.has(String(e.id)) },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } as any,
  }))

  return { nodes, edges }
}

function sync(flow: FlowDoc) {
  const { nodes, edges } = toReactFlow(flow)
  try { localStorage.setItem('fp-universal-flowdoc', JSON.stringify(flow)) } catch {}
  // Compute validation issues (light and strict) for UI surfacing
  let issues: Array<{ kind: 'error'|'warning'; code: string; message: string; nodeId?: string; edgeId?: string }> = []
  let strictIssues: string[] = []
  try {
    const v = validateFlowDoc(flow as any)
    issues = Array.isArray(v?.issues) ? v.issues : []
  } catch {}
  try {
    const e2e = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
    if (!(e2e==='1' || e2e==='true')) {
      const s = validateFlowDocStrict(flow as any)
      if (!s.ok) strictIssues = Array.isArray(s.issues) ? (s.issues as string[]) : ['invalid flow']
    }
  } catch {}
  try {
    const { validateRuntimeSemantics } = require('@/lib/orchestrator/validate')
    const r = validateRuntimeSemantics(flow as any)
    if (!r.ok && Array.isArray(r.errors)) strictIssues = [...strictIssues, ...r.errors]
  } catch {}
  return { flow, rfNodes: nodes, rfEdges: edges, issues, strictIssues }
}


