"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isAgentBuildEnabled } from '@/lib/flags'

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const cls = collapsed ? 'w-16' : 'w-64'
  const pathname = usePathname()
  return (
    <aside className={`${cls} transition-all duration-200 border-r border-fp-border bg-fp-surface min-h-[calc(100vh-56px)]`}>
      <nav className="p-3 space-y-1 text-sm">
        <NavItem href="/" label="Dashboard" icon="🏠" collapsed={collapsed} active={pathname === '/'} />
        {isAgentBuildEnabled() ? (
          <NavItem href="/agent" label="Create" icon="🤖" collapsed={collapsed} active={pathname.startsWith('/agent')} />
        ) : (
          <NavItem href="/create" label="Create (Chat)" icon="💬" collapsed={collapsed} active={pathname.startsWith('/create')} />
        )}
        <NavItem href="/tasks" label="Tasks" icon="📋" collapsed={collapsed} active={pathname.startsWith('/tasks')} />
        {/* Deprecated classic builder entry when Agent Build is enabled */}
        {!isAgentBuildEnabled() && (
          <NavItem href="/builder" label="Builder" icon="🛠️" collapsed={collapsed} active={pathname.startsWith('/builder')} />
        )}
        <NavItem href="/apps" label="Mini Apps" icon="📦" collapsed={collapsed} active={pathname.startsWith('/apps')} />
        <NavItem href="/templates" label="Templates" icon="🗂️" collapsed={collapsed} active={pathname.startsWith('/templates')} />
        <NavItem href="/analytics" label="Analytics" icon="📈" collapsed={collapsed} active={pathname.startsWith('/analytics')} />
        <NavItem href="/settings" label="Settings" icon="⚙️" collapsed={collapsed} active={pathname.startsWith('/settings')} />
        <div className="pt-3 mt-3 border-t border-fp-border" />
        <NavItem href="/admin/providers" label="Admin: Providers" icon="🛡️" collapsed={collapsed} active={pathname.startsWith('/admin/providers')} />
      </nav>
    </aside>
  )
}

function NavItem({ href, label, icon, collapsed, active }: { href: string; label: string; icon: string; collapsed: boolean; active?: boolean }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-2 px-2 py-2 rounded-[var(--radius-sm)] hover:bg-slate-100 ${active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}>
      <span>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

