"use client"
export default function SettingsPage() {
  function resetTour() {
    try {
      localStorage.removeItem('fp-first-run')
      localStorage.removeItem('fp-chat')
      localStorage.removeItem('fp-thread')
      localStorage.removeItem('fp-last-dsl')
      localStorage.removeItem('fp-chat-seeded')
      localStorage.removeItem('fp-onboarding-dismissed')
      // ensure builder opens empty until tour seed triggers from Home
      try { (window as any).__fpClearGraph = true } catch {}
      alert('Tour state cleared. Go to Home to see the starter flow again.')
    } catch {}
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4">Org and preferences placeholder</div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="font-medium mb-2">First‑run / tour</div>
        <button onClick={resetTour} className="px-3 py-1 rounded border border-fp-border bg-white">Reset tour & starter workflow</button>
      </div>
    </div>
  )
}

