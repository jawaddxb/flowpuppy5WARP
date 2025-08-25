import { FlowDoc } from './schema'

export const linearFlow: FlowDoc = {
  version: '1.1',
  lanes: [
    { id: 'lane-input', title: 'Input', order: 1 },
    { id: 'lane-transform', title: 'Transform', order: 2 },
    { id: 'lane-decision', title: 'Decision', order: 3 },
    { id: 'lane-output', title: 'Output', order: 4 },
  ],
  nodes: [
    { id: 'n1', type: 'input', title: 'Trigger', laneId: 'lane-input' },
    { id: 'n2', type: 'action', title: 'HTTP', laneId: 'lane-transform', provider: 'http' },
    { id: 'n3', type: 'output', title: 'Email', laneId: 'lane-output', provider: 'gmail' },
  ],
  edges: [
    { id: 'e1', source: { nodeId: 'n1' }, target: { nodeId: 'n2' } },
    { id: 'e2', source: { nodeId: 'n2' }, target: { nodeId: 'n3' } },
  ],
}

export const decisionFlow: FlowDoc = {
  ...linearFlow,
  nodes: [
    { id: 'n1', type: 'input', title: 'Trigger', laneId: 'lane-input' },
    { id: 'n2', type: 'decision', title: 'Decide', laneId: 'lane-decision', data: { branches: ['CHARGE','SELL','HOLD'] } },
    { id: 'n3', type: 'output', title: 'A', laneId: 'lane-output' },
    { id: 'n4', type: 'output', title: 'B', laneId: 'lane-output' },
    { id: 'n5', type: 'output', title: 'C', laneId: 'lane-output' },
  ],
  edges: [
    { id: 'e1', source: { nodeId: 'n1' }, target: { nodeId: 'n2' } },
    { id: 'e2', source: { nodeId: 'n2' }, target: { nodeId: 'n3' }, label: 'CHARGE' },
    { id: 'e3', source: { nodeId: 'n2' }, target: { nodeId: 'n4' }, label: 'SELL' },
    { id: 'e4', source: { nodeId: 'n2' }, target: { nodeId: 'n5' }, label: 'HOLD' },
  ],
}

export const parallelFlow: FlowDoc = {
  version: '1.1',
  lanes: linearFlow.lanes,
  nodes: [
    { id: 'n1', type: 'input', title: 'Trigger', laneId: 'lane-input' },
    { id: 'n2', type: 'action', title: 'Fetch A', laneId: 'lane-transform', provider: 'http' },
    { id: 'n3', type: 'action', title: 'Fetch B', laneId: 'lane-transform', provider: 'http' },
    { id: 'n4', type: 'action', title: 'Join any(2)', laneId: 'lane-transform' },
  ],
  edges: [
    { id: 'e1', source: { nodeId: 'n1' }, target: { nodeId: 'n2' } },
    { id: 'e2', source: { nodeId: 'n1' }, target: { nodeId: 'n3' } },
    { id: 'e3', source: { nodeId: 'n2' }, target: { nodeId: 'n4' } },
    { id: 'e4', source: { nodeId: 'n3' }, target: { nodeId: 'n4' } },
  ],
}

export const raceFlow: FlowDoc = {
  version: '1.1',
  lanes: linearFlow.lanes,
  nodes: [
    { id: 'n1', type: 'input', title: 'Trigger', laneId: 'lane-input' },
    { id: 'n2', type: 'action', title: 'Try A', laneId: 'lane-transform', provider: 'http' },
    { id: 'n3', type: 'action', title: 'Try B', laneId: 'lane-transform', provider: 'http' },
    { id: 'n4', type: 'action', title: 'Winner', laneId: 'lane-transform' },
  ],
  edges: [
    { id: 'e1', source: { nodeId: 'n1' }, target: { nodeId: 'n2' } },
    { id: 'e2', source: { nodeId: 'n1' }, target: { nodeId: 'n3' } },
    { id: 'e3', source: { nodeId: 'n2' }, target: { nodeId: 'n4' } },
    { id: 'e4', source: { nodeId: 'n3' }, target: { nodeId: 'n4' } },
  ],
}

export const mapLoopFlow: FlowDoc = {
  version: '1.1',
  lanes: linearFlow.lanes,
  nodes: [
    { id: 'n1', type: 'input', title: 'Trigger', laneId: 'lane-input' },
    { id: 'n2', type: 'loop', title: 'Map Loop', laneId: 'lane-transform', data: { maxConcurrent: 3, gather: true } },
    { id: 'n3', type: 'action', title: 'Work Item', laneId: 'lane-transform' },
    { id: 'n4', type: 'action', title: 'Gather', laneId: 'lane-transform' },
  ],
  edges: [
    { id: 'e1', source: { nodeId: 'n1' }, target: { nodeId: 'n2' } },
    { id: 'e2', source: { nodeId: 'n2' }, target: { nodeId: 'n3' } },
    { id: 'e3', source: { nodeId: 'n3' }, target: { nodeId: 'n2' } },
    { id: 'e4', source: { nodeId: 'n2' }, target: { nodeId: 'n4' } },
  ],
}



