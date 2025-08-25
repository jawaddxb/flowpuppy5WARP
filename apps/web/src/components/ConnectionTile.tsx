"use client"
import React from 'react'

export type ConnectionStatus = 'missing' | 'connected' | 'error' | 'skipped'

export function ConnectionTile({ icon, name, status = 'missing', onConnect, onSkip }: { icon?: React.ReactNode; name: string; status?: ConnectionStatus; onConnect?: () => void; onSkip?: () => void }) {
  const pill = status === 'connected' ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Connected</span>
  ) : status === 'error' ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Error</span>
  ) : status === 'skipped' ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200" title="Proceeding without connecting">Skipped</span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Not connected</span>
  )
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-fp-border bg-white px-2 py-1" data-testid="connection-tile">
      <div className="flex items-center gap-1">
        <div className="h-4 w-4 flex items-center justify-center">{icon || <span>🔌</span>}</div>
        <div className="text-[12px]">{name}</div>
      </div>
      {pill}
      {status !== 'connected' && (
        <div className="flex items-center gap-1">
          <button className="text-[10px] rounded-full border border-fp-border px-2 py-0.5" onClick={onConnect}>Connect</button>
          {onSkip && <button className="text-[10px] rounded-full border border-fp-border px-2 py-0.5" onClick={onSkip} title="Proceed without connecting (not recommended)">Skip</button>}
        </div>
      )}
    </div>
  )
}



