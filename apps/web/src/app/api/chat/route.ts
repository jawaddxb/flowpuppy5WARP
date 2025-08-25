import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseClient'
import { getProviderOrder } from '@/lib/aiRouting'

type Message = { role: 'user'|'assistant'|'system'; content: string }

export async function POST(req: Request) {
  const supabase = getAdminSupabase()
  const { messages, orgId, purpose, flowId: inFlowId, step: inStep } = await req.json().catch(() => ({ messages: [] as Message[] }))

  const userMsg: string = messages?.filter?.((m: Message) => m.role === 'user')?.slice(-1)?.[0]?.content ?? ''

  // Choose provider order (no-op for now)
  const order = await getProviderOrder(purpose ?? 'chat', orgId)
  // Mock AI reply + steps; replace with routed providers + SSE stream next
  const reply = `Drafting a workflow for: "${userMsg}”\n\n• Trigger: Webhook\n• Step 1: HTTP Request\n• Step 2: Transform\n• Output: Email\n\nProviders (order): ${order.map(o=>o.type||o.provider_id).join(' → ') || 'default'}`
  const steps = [
    { id: 'trigger', name: 'Webhook Trigger' },
    { id: 'http', name: 'HTTP Request: Fetch data' },
    { id: 'transform', name: 'Transform: Normalize fields' },
    { id: 'email', name: 'Email: Notify user' },
  ]

  // Log usage (mock provider) if DB available
  try {
    if (supabase) {
      await supabase.from('ai_usage_events').insert({
        org_id: orgId ?? null,
        provider_id: null,
        model: 'mock-provider',
        tokens_in: Math.max(1, Math.round(userMsg.length / 4)),
        tokens_out: Math.max(1, Math.round(reply.length / 4)),
        latency_ms: 120,
        cost_usd: 0,
        status: 'ok',
      })
    }
  } catch {}

  // Unified brain protocol: flowId + nextStep surfaced for client persistence
  const flowId = inFlowId || (userMsg ? (userMsg.toLowerCase().includes('tweet') ? 'aiTweets' : 'genericFlow') : 'genericFlow')
  const step = Number.isFinite(inStep) ? Number(inStep) : 0
  const nextStep = step + 1
  return NextResponse.json({ reply, steps, purpose: purpose ?? 'chat', flowId, nextStep, context: { flowId } })
}

