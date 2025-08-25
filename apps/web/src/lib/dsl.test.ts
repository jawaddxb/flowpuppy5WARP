import { describe, it, expect } from 'vitest'
import { toDsl, fromDsl, type WorkflowDsl, validateDsl } from './dsl'

describe('dsl', () => {
	it('preserves nodes/edges/labels/handles/parent/size across toDsl/fromDsl', () => {
		// minimal frame + child + labeled edge
		const nodes: any = [
			{ id: 'frame1', type: 'frame', position: { x: 100, y: 80 }, data: { label: 'Group' }, width: 300, height: 200 },
			{ id: 'n1', type: 'input', position: { x: 140, y: 120 }, data: { label: 'Trigger' }, parentNode: 'frame1', extent: 'parent' },
			{ id: 'n2', type: 'http', position: { x: 360, y: 120 }, data: { label: 'HTTP' } },
		]
		const edges: any = [
			{ id: 'e1', source: 'n1', target: 'n2', label: 'ok', data: { type: 'success' }, sourceHandle: 'out', targetHandle: 'in' },
		]
		const dsl = toDsl(nodes, edges)
		expect(dsl.version).toBe(2.1)
		expect(dsl.nodes.find(n=>n.id==='frame1')?.size).toBeTruthy()
		expect(dsl.edges[0]!.label).toBe('ok')
		expect(dsl.edges[0]!.sourceHandle).toBe('out')

		const { nodes: backNodes, edges: backEdges } = fromDsl(dsl as WorkflowDsl)
		const frame = backNodes.find(n=>n.id==='frame1') as any
		const child = backNodes.find(n=>n.id==='n1') as any
		expect(frame?.style?.width).toBe(300)
		expect(child?.parentNode).toBe('frame1')
		expect((backEdges[0] as any).label).toBe('ok')
	})

	it('roundtrips nodes/edges and validates', () => {
		const nodes = [
			{ id: 'trigger', type: 'input' as any, position: { x: 0, y: 0 }, data: { label: 'Webhook', path: '/x' } },
			{ id: 'http', type: 'http' as any, position: { x: 150, y: 0 }, data: { label: 'HTTP', method: 'GET', url: 'https://example.com' } },
		]
		const edges = [ { id: 'e1', source: 'trigger', target: 'http' } ] as any
		const dsl = toDsl(nodes as any, edges as any)
		const val = validateDsl(dsl)
		expect(val.ok).toBe(true)
		const rt = fromDsl(dsl as any)
		expect(Array.isArray(rt.nodes)).toBe(true)
		expect(Array.isArray(rt.edges)).toBe(true)
		expect(rt.nodes.length).toBe(2)
		expect(rt.edges.length).toBe(1)
	})
})


