"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { WorkflowDsl } from '@/lib/dsl'
import { fromDsl } from '@/lib/dsl'
import ELK from 'elkjs/lib/elk.bundled.js'
import TriggerNode from '@/components/nodes/TriggerNode'
import HttpNode from '@/components/nodes/HttpNode'
import EmailNode from '@/components/nodes/EmailNode'
import ParallelNode from '@/components/nodes/ParallelNode'
import JoinNode from '@/components/nodes/JoinNode'
import SwitchNode from '@/components/nodes/SwitchNode'
import DelayNode from '@/components/nodes/DelayNode'
import TransformNode from '@/components/nodes/TransformNode'
import TryCatchNode from '@/components/nodes/TryCatchNode'
import LoopNode from '@/components/nodes/LoopNode'
import SubflowNode from '@/components/nodes/SubflowNode'
import NotionNode from '@/components/nodes/NotionNode'
import SheetsNode from '@/components/nodes/SheetsNode'
import AirtableNode from '@/components/nodes/AirtableNode'
import DiscordNode from '@/components/nodes/DiscordNode'
import SlackNode from '@/components/nodes/SlackNode'
import GenericNode from '@/components/nodes/GenericNode'

const ReactFlow = dynamic(() => import('reactflow').then(m => m.default), { ssr: false })
const MiniMap = dynamic(() => import('reactflow').then(m => m.MiniMap), { ssr: false })
const Background = dynamic(() => import('reactflow').then(m => m.Background), { ssr: false })

export default function LiveSketchPanel({ dsl }: { dsl: WorkflowDsl | null }) {
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const [rfInstance, setRfInstance] = useState<any>(null)

  useEffect(() => {
    if (!dsl) {
      setNodes([])
      setEdges([])
      return
    }
    ;(async () => {
      // Convert DSL to graph, then apply a top-down layout using ELK
      const g = fromDsl(dsl)
      try {
        const elk = new (ELK as any)()
        const elkGraph = {
          id: 'root',
          layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.spacing.nodeNode': '140',
            'elk.layered.spacing.nodeNodeBetweenLayers': '140',
          },
          children: (g.nodes as any[]).map(n => {
            const t = String((n as any).type||'')
            const label = String(((n as any).data?.label)||'')
            const baseW = Math.max(180, Math.min(360, 120 + label.length*7))
            const baseH = 64
            let w = baseW, h = baseH
            if (t==='transform') {
              const code=String(((n as any).data?.script)||'')
              const lines=Math.max(1, code.split(/\n/).length)
              w = Math.max(baseW, 320)
              h = baseH + Math.min(10,lines)*18 + 20
            } else if (t==='http') { w = Math.max(baseW, 280); h = baseH + 28 }
            else if (t==='email') { w = Math.max(baseW, 260); h = baseH + 20 }
            return ({ id: (n as any).id, width: w, height: h })
          }),
          edges: (g.edges as any[]).map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
        }
        const res = await elk.layout(elkGraph)
        const pos: Record<string, { x: number; y: number }> = {}
        ;(res.children || []).forEach((c: any) => { pos[c.id] = { x: c.x || 0, y: c.y || 0 } })
        const laidOutNodes = (g.nodes as any[]).map(n => {
          const p = pos[n.id]
          return {
            ...n,
            position: p ? { x: p.x ?? 0, y: p.y ?? 0 } : (n as any).position,
            draggable: false,
            selectable: false,
          }
        })
        const laidOutEdges = (g.edges as any[]).map(e => ({ ...e, selectable: false }))
        setNodes(laidOutNodes as any)
        setEdges(laidOutEdges as any)
      } catch {
        // Fallback: render without layout
        const nn = (g.nodes as any[]).map(n => ({ ...n, draggable: false, selectable: false }))
        const ee = (g.edges as any[]).map(e => ({ ...e, selectable: false }))
        setNodes(nn as any)
        setEdges(ee as any)
      }
      const t = setTimeout(() => {
        try {
          if (rfInstance?.fitView) rfInstance.fitView({ padding: 0.2, duration: 200 })
        } catch {}
      }, 50)
      return () => clearTimeout(t)
    })()
  }, [dsl, rfInstance])

  const nodeTypes = useMemo(() => ({
    input: TriggerNode as any,
    http: HttpNode as any,
    email: EmailNode as any,
    parallel: ParallelNode as any,
    join: JoinNode as any,
    switch: SwitchNode as any,
    transform: TransformNode as any,
    delay: DelayNode as any,
    trycatch: TryCatchNode as any,
    loop: LoopNode as any,
    subflow: SubflowNode as any,
    notion: NotionNode as any,
    sheets: SheetsNode as any,
    airtable: AirtableNode as any,
    discord: DiscordNode as any,
    slack: SlackNode as any,
    schedule: GenericNode as any,
  }), [])

  return (
    <div className="rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface shadow-fp-1 overflow-hidden">
      <div className="px-3 py-2 border-b border-fp-border flex items-center justify-between">
        <div className="text-sm font-medium">Live Sketch</div>
        <div className="text-xs text-slate-500">{nodes.length} nodes</div>
      </div>
      <div style={{ height: 520 }}>
        {/* @ts-ignore */}
        <ReactFlow
          nodes={nodes as any}
          edges={edges as any}
          nodeTypes={nodeTypes}
          onInit={(inst:any)=> setRfInstance(inst)}
          fitView
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnDrag={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          {/* @ts-ignore */}
          <MiniMap pannable={false} zoomable={false} nodeStrokeColor={()=>'#94a3b8'} />
          {/* @ts-ignore */}
          <Background gap={24} size={1} color="#f1f5f9" />
        </ReactFlow>
      </div>
    </div>
  )
}


