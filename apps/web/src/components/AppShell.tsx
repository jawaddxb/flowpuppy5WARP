"use client"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { useEffect, useState } from "react"

type AppShellProps = {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  // E2E: Attach early stub hooks so tests can detect window.*Api presence immediately after hydration
  useEffect(() => {
    const enable = String(process.env.NEXT_PUBLIC_E2E_HOOKS || '').toLowerCase()
    if (!(enable === '1' || enable === 'true')) return
    try {
      if (!(window as any).convoApi) (window as any).convoApi = {}
    } catch {}
    try {
      if (!(window as any).quickApi) (window as any).quickApi = {}
    } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-fp-bg text-fp-text">
      <Topbar onToggleSidebar={() => setCollapsed((v) => !v)} />
      <div className="flex">
        <Sidebar collapsed={collapsed} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

