"use client"
import React, { createContext, useContext, useMemo, useRef, useState } from 'react'

export type CanvasApi = {
  fitView?: () => void
  fitSelection?: () => void
  layout?: () => void
  toDsl?: () => any
  toggleSnap?: () => void
  snapEnabled?: () => boolean
  zoomIn?: () => void
  zoomOut?: () => void
  alignLeft?: () => void
  alignRight?: () => void
  alignTop?: () => void
  alignBottom?: () => void
  distributeH?: () => void
  distributeV?: () => void
  group?: () => void
  ungroup?: () => void
  quickAdd?: (item: { type: string; label: string; defaults?: Record<string, any> }) => void
}

const Ctx = createContext<{ api: CanvasApi | null; setApi: (api: CanvasApi | null) => void } | null>(null)

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<CanvasApi | null>(null)
  const value = useMemo(() => ({ api, setApi }), [api])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCanvas() {
  const ctx = useContext(Ctx)
  if (!ctx) return { api: null, setApi: (_: CanvasApi | null) => {} }
  return ctx
}



