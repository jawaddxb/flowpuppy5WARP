"use client"
import { create } from 'zustand'
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow'
import { applyNodeChanges, applyEdgeChanges } from 'reactflow'

type GraphState = {
  nodes: Node[]
  edges: Edge[]
  setGraph: (nodes: Node[], edges: Edge[]) => void
  updateNode: (id: string, data: Partial<Node['data']>) => void
  addNode: (node: Node) => void
  updateEdge: (id: string, data: Partial<Edge>) => void
  updateNodeProps: (id: string, patch: Partial<Node>) => void
  applyNodeChanges: (changes: NodeChange[]) => void
  applyEdgeChanges: (changes: EdgeChange[]) => void
  undo: () => void
  redo: () => void
}

export const useGraphStore = create<GraphState>((set, get) => {
  let past: Array<{ nodes: Node[]; edges: Edge[] }> = []
  let future: Array<{ nodes: Node[]; edges: Edge[] }> = []

  function snapshot() {
    const { nodes, edges } = get()
    past.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) })
    if (past.length > 50) past = past.slice(past.length - 50)
    future = []
  }

  return ({
    nodes: [],
    edges: [],
    setGraph: (nodes, edges) => {
      snapshot()
      set({ nodes, edges })
    },
    applyNodeChanges: (changes) => {
      snapshot()
      set((prev) => ({ nodes: applyNodeChanges(changes, prev.nodes), edges: prev.edges }))
    },
    applyEdgeChanges: (changes) => {
      snapshot()
      set((prev) => ({ nodes: prev.nodes, edges: applyEdgeChanges(changes, prev.edges) }))
    },
    updateNode: (id, data) => {
      snapshot()
      set((prev) => ({
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, data: { ...(n.data || {}), ...data } } : n)),
        edges: prev.edges,
      }))
    },
    updateEdge: (id, data) => {
      snapshot()
      set((prev) => ({
        nodes: prev.nodes,
        edges: prev.edges.map((e) => (e.id === id ? { ...e, ...data } : e)),
      }))
    },
    updateNodeProps: (id, patch) => {
      snapshot()
      set((prev) => ({
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        edges: prev.edges,
      }))
    },
    addNode: (node) => {
      snapshot()
      set((prev) => ({
        nodes: [...prev.nodes, node],
        edges: prev.edges,
      }))
    },
    undo: () => {
      if (past.length === 0) return
      const current = { nodes: get().nodes, edges: get().edges }
      const prevSnap = past.pop() as { nodes: Node[]; edges: Edge[] }
      future.push(current)
      set({ nodes: prevSnap.nodes, edges: prevSnap.edges })
    },
    redo: () => {
      if (future.length === 0) return
      const current = { nodes: get().nodes, edges: get().edges }
      const nextSnap = future.pop() as { nodes: Node[]; edges: Edge[] }
      past.push(current)
      set({ nodes: nextSnap.nodes, edges: nextSnap.edges })
    },
  })
})

