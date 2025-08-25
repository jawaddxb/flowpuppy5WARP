"use client"
import { create } from 'zustand'

export type NodeStatus = 'idle' | 'running' | 'ok' | 'error'

type SimState = {
  active: boolean
  demoMode: boolean
  speed: number
  paused: boolean
  activeNodeId?: string
  nodeStatus: Record<string, NodeStatus>
  pulsingEdges: Map<string, 'success'|'error'|'guarded'|'unknown'>
  stepLog: Array<{ nodeId: string; status: 'ok'|'error'; output?: any; durationMs?: number }>
  start: (nodes: Array<{ id: string }>, edges: Array<{ id?: string; source: string; target: string }>) => void
  step: (ev: { nodeId: string; status: 'ok'|'error'; output?: any; durationMs?: number }, edges: Array<{ id?: string; source: string; target: string }>) => void
  end: () => void
  setDemo: (v: boolean) => void
  setSpeed: (v: number) => void
  pause: () => void
  play: () => void
}

function demoOutput(nodeId: string, output: any): any {
  // Simple demo mapper; if output present return it
  if (output) return output
  return { id: nodeId, ok: true, preview: 'demo' }
}

export const useSimStore = create<SimState>((set, get) => ({
  active: false,
  demoMode: false,
  speed: 0.1,
  paused: false,
  activeNodeId: undefined,
  nodeStatus: {},
  pulsingEdges: new Map<string, 'success'|'error'|'guarded'|'unknown'>(),
  stepLog: [],
  setDemo: (v) => set({ demoMode: v }),
  setSpeed: (v) => set({ speed: Math.max(0.25, Math.min(3, v)) }),
  pause: () => set({ paused: true }),
  play: () => {
    set({ paused: false })
  },
  start: (nodes) => {
    const ns: Record<string, NodeStatus> = {}
    for (const n of nodes) ns[n.id] = 'idle'
    set({ active: true, nodeStatus: ns, pulsingEdges: new Map(), stepLog: [], paused: false, activeNodeId: undefined })
  },
  step: (ev, edges) => {
    const { demoMode, paused, speed } = get()
    if (paused) {
      // buffer is implicit via stepLog; we still append but do not set statuses
      set((prev) => ({ stepLog: [...prev.stepLog, { ...ev, output: demoMode ? demoOutput(ev.nodeId, ev.output) : ev.output }] }))
      return
    }
    // Immediate: mark node as running
    set((prev) => {
      const ns: Record<string, NodeStatus> = { ...prev.nodeStatus, [ev.nodeId]: 'running' }
      const log = [...prev.stepLog, { ...ev, output: demoMode ? demoOutput(ev.nodeId, ev.output) : ev.output }]
      const pulsing = new Map(prev.pulsingEdges)
      for (const e of edges) {
        if (e.source === ev.nodeId) {
          const id = (e.id || `${e.source}->${e.target}`) as string
          const typ = (e as any)?.data?.type as 'success'|'error'|'guarded'|undefined
          pulsing.set(id, typ || 'unknown')
        }
      }
      // schedule: finalize status to ok/error and clear pulses
      const finalizeDelay = get().demoMode
        ? Math.max(500, Number(ev.durationMs || 3000))
        : Math.max(1400, Math.round((Number(ev.durationMs || 3000)) / Math.max(0.25, Math.min(3, speed)) ))
      const toClear = Array.from(pulsing.keys())
      setTimeout(() => {
        set((cur) => {
          const ns2: Record<string, NodeStatus> = { ...cur.nodeStatus, [ev.nodeId]: (ev.status === 'ok' ? 'ok' : 'error') }
          const next = new Map(cur.pulsingEdges)
          toClear.forEach(id=> next.delete(id))
          const activeNodeId = cur.activeNodeId === ev.nodeId ? undefined : cur.activeNodeId
          return { nodeStatus: ns2, pulsingEdges: next, activeNodeId }
        })
      }, finalizeDelay)
      return { nodeStatus: ns, stepLog: log, pulsingEdges: pulsing, activeNodeId: ev.nodeId }
    })
  },
  end: () => set({ active: false }),
}))


