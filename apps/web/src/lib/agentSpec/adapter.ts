import type { AgentSpec } from './types'
import type { FlowDoc } from '../flowdoc/schema'

// Minimal AgentSpec -> FlowDoc adapter sufficient for Phase 1 UI
export function agentSpecToFlowDoc(spec: AgentSpec): FlowDoc {
  const lanes = [
    { id: 'lane-input', title: 'Input', order: 1 },
    { id: 'lane-transform', title: 'Transform', order: 2 },
    { id: 'lane-decision', title: 'Decision', order: 3 },
    { id: 'lane-output', title: 'Output', order: 4 },
  ]

  const nodes: FlowDoc['nodes'] = []
  const edges: FlowDoc['edges'] = []

  // Input: schedule if present
  if (spec.inputs?.schedule) {
    nodes.push({ id: 'n-schedule', type: 'input', title: 'Schedule', laneId: 'lane-input' })
  }

  // Fetch prices
  if (spec.sources?.prices) {
    nodes.push({ id: 'n-prices', type: 'action', title: 'Get Power Prices', laneId: 'lane-transform', provider: 'http' })
  }
  // Fetch weather
  if (spec.sources?.weather) {
    nodes.push({ id: 'n-weather', type: 'action', title: 'Get Weather Data', laneId: 'lane-transform', provider: 'openweather' })
  }

  // Analyze/Calculate
  if (spec.analysis?.merge || spec.analysis?.computeSavings) {
    nodes.push({ id: 'n-analyze', type: 'action', title: 'Analyze & Decide', laneId: 'lane-transform', provider: 'ai' })
  }

  // Decision
  if (spec.decision?.rules && spec.decision.rules.length) {
    nodes.push({ id: 'n-decision', type: 'decision', title: 'Route Decision', laneId: 'lane-decision' })
  }

  // Outputs
  if (spec.actions?.notification) {
    nodes.push({ id: 'n-email', type: 'output', title: 'Send Email', laneId: 'lane-output', provider: 'gmail' })
  }

  // Simple linear edges
  const order = nodes.map(n => n.id as string)
  for (let i = 0; i < order.length - 1; i++) {
    // connect unless next is in Output and we came from Decision with branches (handled below)
    edges.push({ id: `e${i+1}`, source: { nodeId: order[i] as string }, target: { nodeId: order[i+1] as string } })
  }

  // If decision with email output, branch CHARGE→email by default
  if (nodes.some(n => n.id === 'n-decision') && nodes.some(n => n.id === 'n-email')) {
    // remove last linear edge to email if exists
    const idx = edges.findIndex(e => (e.target.nodeId as string) === 'n-email')
    if (idx >= 0) edges.splice(idx, 1)
    edges.push({ id: 'ed1', source: { nodeId: 'n-decision' }, target: { nodeId: 'n-email' }, label: 'CHARGE' })
  }

  return { version: '1.1', lanes, nodes, edges }
}


