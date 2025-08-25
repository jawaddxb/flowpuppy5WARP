"use client"
import React from 'react'
import dynamic from 'next/dynamic'
import AgentBuilderPanel from '@/components/AgentBuilderPanel'
import InspectorFields from '@/components/InspectorFields'
import { useGraphStore } from '@/store/graph'
import PanelLayout from '@/components/PanelLayout'
import { isAgentBuildEnabled } from '@/lib/flags'
import { ReactFlowProvider } from 'reactflow'
import { CanvasProvider } from '@/components/CanvasContext'
import BuilderLayout from '@/agentStage/components/BuilderLayout'
import LeftPanel from '@/agentStage/components/LeftPanel'
import RightInspector from '@/agentStage/components/RightInspector'
import { useGraph } from '@/agentStage/graph/store'
import energyFlow from '@/agentStage/fixtures/energy-optimizer.flow.json'

const FlowCanvas = dynamic(() => import('@/components/FlowCanvas'), { ssr: false })

export default function AgentPage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  // Remove default fixture load; start with blank canvas until chat/build applies a diff
  if (!isAgentBuildEnabled()) {
    return (
      <div className="p-6">
        <div className="text-lg font-medium">Agent Build is disabled</div>
        <div className="text-sm text-slate-600">Set NEXT_PUBLIC_AGENT_BUILD=1 or localStorage fp-ff-agentBuild=1</div>
      </div>
    )
  }
  return (
    <div className="h-screen min-h-0 overflow-hidden p-3">
      <div className="h-full min-h-0 overflow-hidden">
        <ReactFlowProvider>
          {((process.env.NEXT_PUBLIC_E2E_HOOKS === '1') || (process.env.NEXT_PUBLIC_E2E_HOOKS === 'true')) && (
            <E2ESeed />
          )}
          <BuilderLayout
            left={<LeftPanel plan={[
              'Hourly trigger runs every hour',
              'Get Power Prices (EIA)',
              'Get Weather Data (Dubai)',
              'Analyze & Decide (AI)',
              'Route Decision to email actions',
            ]} connections={[
              { id: 'webscrape', name: 'Webscraping AI', status: 'not-connected' },
              { id: 'openweather', name: 'OpenWeather API', status: 'not-connected' },
              { id: 'google', name: 'Google (Gmail)', status: 'not-connected' },
            ]} />}
            right={<RightInspector />}
          />
        </ReactFlowProvider>
      </div>
    </div>
  )
}

function AgentRightPanel({ selectedId }: { selectedId: string | null }) {
  const graph = useGraphStore(s => ({ nodes: s.nodes, edges: s.edges }))
  const selectedNode = (graph.nodes as any).find?.((n: any) => n.id === selectedId) || null
  return (
    <div className="p-3">
      <div className="text-sm text-slate-600 mb-2">Inspector</div>
      <InspectorFields selectedNode={selectedNode} selected={selectedId || undefined} />
    </div>
  )
}

function E2ESeed() {
  React.useEffect(() => {
    try {
      const st = (useGraph as any).getState?.()
      const flow = st?.flow
      // Prefer restoring the last saved FlowDoc if present
      let restored: any = null
      try { const raw = localStorage.getItem('fp-universal-flowdoc'); if (raw) restored = JSON.parse(raw) } catch {}
      if (restored && Array.isArray(restored.nodes)) { st?.setFlow?.(restored as any) }
      else if (!flow || !Array.isArray(flow.nodes) || (flow.nodes||[]).length === 0) { st?.setFlow?.(energyFlow as any) }
    } catch {}
  }, [])
  return null
}


