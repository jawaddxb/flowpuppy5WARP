"use client"
import { useEffect } from 'react'
import { getBrowserSupabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/auth'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setOrg = useAuthStore(s => s.setOrg)
  const signIn = useAuthStore(s => s.signIn)
  const supabase = getBrowserSupabase()

  useEffect(() => {
    // Dev/E2E bypass: auto sign-in to demo org when hooks enabled or cookie present
    try {
      const e2e = String(process.env.NEXT_PUBLIC_E2E_HOOKS||'').toLowerCase()
      const hasCookie = typeof document !== 'undefined' && document.cookie.includes('fp-dev-auth=1')
      if (e2e === '1' || e2e === 'true' || hasCookie) {
        signIn('user@example.com')
        setOrg('org-demo')
        return
      }
    } catch {}

    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        signIn(session.user.email)
        // choose default org later from memberships
        setOrg('org-demo')
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, signIn, setOrg])

  return <>{children}</>
}

