import { NextResponse } from 'next/server'

// Mock planner that applies a few simple, safe edits inferred from the message
export async function POST(req: Request) {
  const body = await req.json().catch(()=> ({}))
  const message: string = body?.message || ''
  const manifest = body?.manifest || {}
  const out = { ...manifest }

  // naive keyword tweaks
  if (/emerald|green/i.test(message)) out.theme = { ...(out.theme||{}), accent: '#10b981' }
  if (/blue|midnight/i.test(message)) out.theme = { ...(out.theme||{}), accent: '#1e293b' }
  if (/google/i.test(message)) out.auth = { ...(out.auth||{}), provider: 'google' }
  if (/wallet|nft/i.test(message)) out.wallet = { enabled: true, provider: 'walletconnect', gate: /nft/i.test(message) ? { type: 'nft', contract: '0x...' } : undefined }
  if (/telegram/i.test(message)) out.distribution = { ...(out.distribution||{}), telegram: true }
  if (/discord/i.test(message)) out.distribution = { ...(out.distribution||{}), discord: true }
  if (/rename|call it|name it/i.test(message)) {
    const m = message.match(/(?:rename|call it|name it)\s+([\w\s-]+)/i)
    if (m && m[1]) out.name = m[1].trim()
  }
  // inputs
  if (/zip/i.test(message)) addInput(out, { name: 'homeZip', label: 'Home ZIP', type: 'string', required: true })
  if (/sell/i.test(message)) addInput(out, { name: 'sellThreshold', label: 'Sell when price > ¢/kWh', type: 'number', default: 25 })

  const summary = `Applied: ${[out.theme?.accent?'theme':'', out.auth?'auth':'', out.wallet?'wallet':'', out.distribution?.telegram?'telegram':'', out.distribution?.discord?'discord':''].filter(Boolean).join(', ') || 'no changes'}; Inputs: ${(out.inputs||[]).map((i:any)=>i.name).join(', ')}`
  return NextResponse.json({ manifest: out, summary })
}

function addInput(manifest: any, inp: any) {
  const list = Array.isArray(manifest.inputs) ? [...manifest.inputs] : []
  if (!list.some((i:any)=> i.name===inp.name)) list.push(inp)
  manifest.inputs = list
}


