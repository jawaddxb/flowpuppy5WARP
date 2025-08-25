export const runtime = 'edge'

export async function POST(req: Request) {
  const { prompt } = await req.json().catch(()=>({ prompt: '' }))
  const text = `Drafting a workflow for: "${prompt || '...' }"\n\n• Trigger: Webhook\n• Step 1: HTTP Request\n• Step 2: Transform\n• Output: Email`
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}



