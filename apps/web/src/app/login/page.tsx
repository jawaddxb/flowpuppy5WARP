"use client"
import { useAuthStore } from '@/store/auth'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseClient'

function LoginInner() {
  const signIn = useAuthStore(s => s.signIn)
  const [email, setEmail] = useState('user@example.com')
  const [sent, setSent] = useState(false)
  const supabase = getBrowserSupabase()
  const router = useRouter()
  const params = useSearchParams()
  const next = params?.get('next') || '/admin/providers'
  return (
    <div className="max-w-sm mx-auto rounded-[var(--radius-lg)] border border-fp-border bg-fp-surface p-6 shadow-fp-1">
      <div className="text-lg font-medium mb-2">Sign in</div>
      <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border border-fp-border rounded-[var(--radius-sm)] px-2 py-2 mb-3" placeholder="you@example.com" />
      {supabase ? (
        <div className="space-y-2">
          <button onClick={async ()=>{
            const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
            if (!error) setSent(true)
          }} className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-fp-primary text-white hover:bg-fp-primary-600">Send magic link</button>
          <button onClick={()=>{ signIn(email); router.replace(next) }} className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-fp-border bg-white">Dev continue (no email)</button>
        </div>
      ) : (
        <button onClick={()=>{ signIn(email); router.replace(next) }} className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-fp-primary text-white hover:bg-fp-primary-600">Continue</button>
      )}
      <div className="text-xs text-slate-500 mt-2">{supabase ? (sent ? 'Check your email for a magic link.' : 'Using Supabase auth if env is set. You can also use Dev continue.') : '(Supabase magic link will replace this.)'}</div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}

