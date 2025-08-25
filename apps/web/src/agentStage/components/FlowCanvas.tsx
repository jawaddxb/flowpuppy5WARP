"use client"
import React from 'react'
import ReactFlow, { Background, Controls, MiniMap, applyNodeChanges, type NodeChange } from 'reactflow'
import 'reactflow/dist/style.css'
import { useGraph } from '@/agentStage/graph/store'
import NodeCard from '@/agentStage/components/NodeCard'
import DecisionCard from '@/agentStage/components/DecisionCard'
import { ChipEdge } from '@/agentStage/components/ChipEdge'
import { isPrimaryPathStylingEnabled } from '@/lib/flags'
import { LaneBands } from '@/agentStage/components/LaneBands'
import InspectorSheet from '@/agentStage/components/InspectorSheet'
import ContextMenu from '@/agentStage/components/ContextMenu'
import { useGraph as useGraphStore } from '@/agentStage/graph/store'

export default function AgentFlowCanvas({ showLanes }: { showLanes: boolean }) {
  const { rfNodes, rfEdges, flow } = useGraph(s=>({ rfNodes: s.rfNodes, rfEdges: s.rfEdges, flow: s.flow }))
  const hoverNodeId = useGraph(s=> s.hoverNodeId)
  const [zoom, setZoom] = React.useState(1)
  const [menu, setMenu] = React.useState<{x:number;y:number}|null>(null)
  const [hoverEdge, setHoverEdge] = React.useState<string | null>(null)
  const hoverTargetId = React.useMemo(()=> {
    if (!hoverEdge) return null
    const e = (rfEdges as any[]).find((ed:any)=> ed.id===hoverEdge)
    return e?.target || null
  }, [hoverEdge, rfEdges])
  const nodesWithHover = React.useMemo(()=> (rfNodes as any[]).map((n:any)=> {
    const isHover = hoverTargetId===n.id || hoverNodeId===n.id
    const isDim = !!(hoverNodeId && hoverNodeId!==n.id)
    return { ...n, data: { ...(n.data||{}), hover: isHover, dim: isDim } }
  }), [rfNodes, hoverTargetId, hoverNodeId])
  const edgesWithHover = React.useMemo(()=> (rfEdges as any[]).map((e:any)=> ({ ...e, data: { ...(e.data||{}), hovered: hoverEdge===e.id } })), [rfEdges, hoverEdge])
  const nodeTypes = React.useMemo(() => ({ nodeCard: NodeCard as any, decisionCard: DecisionCard as any }), [])
  const edgeTypes = React.useMemo(() => ({ chipEdge: ChipEdge as any }), [])
  const persistViewportRef = React.useRef<number | null>(null)
  function persistViewport(rf: any) {
    if (!rf) return
    if (persistViewportRef.current) cancelAnimationFrame(persistViewportRef.current)
    persistViewportRef.current = requestAnimationFrame(() => {
      try { const v = rf.getViewport(); localStorage.setItem('fp-viewport', JSON.stringify(v)) } catch {}
    })
  }
  React.useEffect(() => {
    // Minimal API to support ChatPanel quickAdd in tests (@chat-chips)
    const api = {
      quickAdd: (item: { type: string; label: string; defaults?: Record<string, any> }) => {
        try {
          const get = (useGraphStore as any).getState
          const st = get?.(); if (!st) return
          const flow = structuredClone(st.flow || { version: '1.1', lanes: [], nodes: [], edges: [] })
          const ensureLane = (id: string, title: string, order: number) => {
            if (!(flow.lanes||[]).some((l:any)=> String(l.id)===id)) (flow.lanes||[]).push({ id, title, order } as any)
          }
          ensureLane('lane-input','Input',0)
          ensureLane('lane-transform','Transform',1)
          ensureLane('lane-decision','Decision',2)
          ensureLane('lane-output','Output',3)
          const id = `n-${Math.random().toString(36).slice(2,7)}`
          const t = String(item?.type||'').toLowerCase()
          const title = String(item?.label || item?.type || 'Step')
          let laneId = 'lane-transform'
          let nodeType = 'action'
          let provider: string | undefined
          if (t.includes('gmail')) { laneId = 'lane-output'; provider = 'gmail'; nodeType = 'output' }
          else if (t.startsWith('http') || t.includes('.http')) { laneId = 'lane-transform'; nodeType = 'action' }
          else if (t.includes('decision') || t.includes('switch')) { laneId = 'lane-decision'; nodeType = 'decision' }
          const laneNodes = (flow.nodes||[]).filter((n:any)=> String(n.laneId)===laneId)
          const maxRank = laneNodes.reduce((mx:number, n:any, i:number)=> {
            const r = typeof n?.data?.rank === 'number' ? n.data.rank : i
            return Math.max(mx, r)
          }, -1)
          const rank = maxRank + 1
          const nodeObj: any = { id, type: nodeType, title, laneId, data: { icon: '🧩', rank, ...(item?.defaults||{}) } }
          if (provider) nodeObj.provider = provider
          // Default Yes/No branches for decisions to satisfy guard conventions
          if (nodeType === 'decision' && !nodeObj.data.branches) nodeObj.data.branches = ['No','Yes']
          ;(flow.nodes||[]).push(nodeObj)
          st.setFlow(flow)
        } catch {}
      }
    }
    try { (window as any).flowCanvasApi = { ...(window as any).flowCanvasApi, ...api } } catch {}
  }, [])
  return (
    <div className="relative w-full h-full z-10 pointer-events-auto">
      <ReactFlow
        nodes={nodesWithHover as any}
        edges={edgesWithHover as any}
        nodeTypes={nodeTypes as any}
        edgeTypes={edgeTypes as any}
        proOptions={{ hideAttribution: true }}
        nodesFocusable={false}
        nodesDraggable
        elementsSelectable
        fitView
        onMove={(evt, vp)=> { setZoom(vp.zoom); try { persistViewport((window as any).__rf) } catch {} }}
        onInit={(rf)=> { (window as any).__rf = rf; setZoom(rf.getViewport().zoom); try { const raw = localStorage.getItem('fp-viewport'); if (raw) { const v = JSON.parse(raw); rf.setViewport(v) } } catch {} }}
        onNodeClick={(_, n)=> { try { useGraph.getState().setActiveNode(String(n.id)); const el = document.querySelector(`[data-nodeid="${String(n.id)}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) } catch {} }}
        onNodesChange={(changes: NodeChange[]) => {
          try {
            const cur = (useGraph as any).getState?.().rfNodes || []
            const next = applyNodeChanges(changes as any, cur as any)
            ;(useGraph as any).setState?.({ rfNodes: next })
          } catch {}
        }}
        onNodeDragStop={(_, nd)=> {
          try {
            const rf: any = (window as any).__rf
            const nodesNow: any[] = rf?.getNodes?.() || []
            const sortedLanes = (useGraph as any).getState?.().flow?.lanes?.slice()?.sort?.((a:any,b:any)=> (a.order||0)-(b.order||0)) || []
            const colW = 300, gutter = 24, span = colW + gutter
            const clamp = (x:number, lo:number, hi:number)=> Math.max(lo, Math.min(hi, x))
            const idToLaneId: Record<string,string> = {}
            const laneToIds: Record<string,string[]> = {}
            for (const n of nodesNow) {
              const laneIdx = clamp(Math.round((n?.position?.x||0)/span), 0, Math.max(0, sortedLanes.length-1))
              const laneId = String(sortedLanes[laneIdx]?.id || (sortedLanes[0]?.id || 'lane-transform'))
              idToLaneId[n.id] = laneId
              if (!laneToIds[laneId]) laneToIds[laneId] = []
              laneToIds[laneId].push(n.id)
            }
            // sort each lane's ids by Y
            for (const [laneId, ids] of Object.entries(laneToIds)) {
              ids.sort((a,b)=> {
                const ay = (nodesNow.find(n=> n.id===a)?.position?.y||0)
                const by = (nodesNow.find(n=> n.id===b)?.position?.y||0)
                return ay - by
              })
              laneToIds[laneId] = ids
            }
            // apply to FlowDoc
            const flow = structuredClone((useGraph as any).getState?.().flow || { nodes: [], edges: [], lanes: [] })
            for (const fn of (flow.nodes||[])) {
              const id = String(fn.id)
              const laneId = idToLaneId[id]
              if (laneId) fn.laneId = laneId
            }
            for (const [laneId, ids] of Object.entries(laneToIds)) {
              ids.forEach((id, idx)=> {
                const fn = (flow.nodes||[]).find((n:any)=> String(n.id)===id)
                const yAbs = (nodesNow.find(n=> String(n.id)===id)?.position?.y||0)
                if (fn) fn.data = { ...(fn.data||{}), rank: idx, y: yAbs }
              })
            }
            ;(useGraph as any).getState?.().setFlow(flow)
          } catch {}
        }}
        onPaneClick={(e)=> {
          try {
            useGraph.getState().setActiveNode(null)
            if ((e as any).button === 2) return
          } catch {}
        }}
        onContextMenu={(e)=> {
          e.preventDefault()
          try {
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const x = e.clientX
            const y = e.clientY
            setMenu({ x, y })
          } catch {}
        }}
        onEdgeMouseEnter={(_, edge)=> setHoverEdge(edge.id)}
        onEdgeMouseLeave={(_, edge)=> setHoverEdge(c=> c===edge.id ? null : c)}
      >
        {(zoom >= 0.8 || showLanes) && <LaneBands lanes={flow.lanes} />}
        <Background gap={24} size={1} color="#f1f5f9" />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap zoomable pannable className="!bg-white/90" />
      </ReactFlow>
      {menu && <ContextMenu x={menu.x} y={menu.y} onAdd={()=> { try { useGraph.getState().openAdd({ kind:'canvas', ui: { x: menu.x, y: menu.y } } as any) } catch {}; setMenu(null) }} onClose={()=> setMenu(null)} />}
      <InspectorSheet />
    </div>
  )
}


