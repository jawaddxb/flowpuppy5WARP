import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug || 'demo'
  const presets: Record<string, any> = {
    demo: {
      name: 'Energy Optimizer',
      slug: 'demo',
      icon: '☀️',
      description: 'Optimize charging/selling by price and weather.',
      inputs: [
        { name: 'homeZip', label: 'Home ZIP', type: 'string', required: true, help: 'For weather' },
        { name: 'sellThreshold', label: 'Sell when price > ¢/kWh', type: 'number', default: 25 },
      ],
      theme: { accent: '#10b981' },
    },
  }
  const manifest = presets[slug] || {
    name: slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    slug,
    icon: '🐶',
    description: 'A FlowPuppy mini app',
    inputs: [ { name: 'query', label: 'Query', type: 'string', required: true } ],
    theme: { accent: '#3b82f6' },
  }
  return NextResponse.json(manifest)
}


