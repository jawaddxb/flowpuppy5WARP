"use client"
import React from 'react'
import { TOKENS } from '@/theme/tokens'

export default function TokensPage() {
  return (
    <div className="p-6" style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <h2 className="text-xl mb-3">Design Tokens</h2>
      <ul className="grid grid-cols-2 gap-3 text-sm">
        <li>Left panel width: <strong>{TOKENS.leftPanelWidth}px</strong></li>
        <li>Lane column width: <strong>{TOKENS.laneColWidth}px</strong></li>
        <li>Gutter: <strong>{TOKENS.gutter}px</strong></li>
        <li>Radius: <strong>{TOKENS.radius}px</strong></li>
        <li>Border: <strong>{TOKENS.border}</strong></li>
        <li>Title color: <strong>{TOKENS.text}</strong></li>
        <li>Subtitle color: <strong>{TOKENS.subtext}</strong></li>
        <li>Lane band tint: <strong>{TOKENS.laneBandFill}</strong></li>
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <div style={{ width: TOKENS.laneColWidth, height: 32, background: TOKENS.laneBandFill, border: `1px solid ${TOKENS.border}`, borderRadius: TOKENS.radius }} />
        <div style={{ width: TOKENS.gutter }} />
        <div style={{ width: TOKENS.laneColWidth, height: 32, background: TOKENS.laneBandFill, border: `1px solid ${TOKENS.border}`, borderRadius: TOKENS.radius }} />
      </div>
      <div className="mt-4">
        <div style={{ fontSize: 15, color: TOKENS.text }}>Title 15 / {TOKENS.text}</div>
        <div style={{ fontSize: 12, color: TOKENS.subtext }}>Subtitle 12 / {TOKENS.subtext}</div>
      </div>
    </div>
  )
}


