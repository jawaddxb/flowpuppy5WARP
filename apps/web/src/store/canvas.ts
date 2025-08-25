"use client"
import { create } from 'zustand'

type CanvasState = {
  snapEnabled: boolean
  setSnapEnabled: (v: boolean) => void
  toggleSnap: () => void
  viewport: { x: number; y: number; zoom: number }
  setViewport: (v: { x: number; y: number; zoom: number }) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  snapEnabled: true,
  setSnapEnabled: (v) => set({ snapEnabled: v }),
  toggleSnap: () => set({ snapEnabled: !get().snapEnabled }),
  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (v) => set({ viewport: v }),
}))


