import { describe, it, expect } from 'vitest'
import { generateWorkflowDslFromPrompt, normalizeDsl, computePlannerHints } from './planner'

describe('planner', () => {
  it('returns valid DSL for a simple prompt', async () => {
    const { dsl, confidence } = await generateWorkflowDslFromPrompt('Webhook trigger that calls an HTTP API and emails me the result')
    expect(Array.isArray(dsl.nodes)).toBe(true)
    expect(dsl.nodes.length).toBeGreaterThan(0)
    expect(confidence).toBeGreaterThan(0)
  })

  it('normalizes switch edges with case labels', () => {
    const dsl: any = { version: 2.1, nodes: [ { id: 's', type: 'switch', config: { cases: ['A','B'] } }, { id: 'a', type: 'http' }, { id: 'b', type: 'http' } ], edges: [ { source: 's', target: 'a' }, { source: 's', target: 'b' } ] }
    const n = normalizeDsl(dsl)
    const outs = (n.edges as any[]).filter(e=>e.source==='s')
    expect(outs[0].label).toBe('A')
    expect(outs[1].label).toBe('B')
  })

  it('computes hints based on keywords', () => {
    const h1 = computePlannerHints('do these two in parallel and then join; if error then retry')
    expect(h1.some(h=>/parallel/.test(h))).toBe(true)
    expect(h1.some(h=>/trycatch/i.test(h))).toBe(true)
    const h2 = computePlannerHints('for each item, loop and call API; otherwise switch based on type')
    expect(h2.some(h=>/loop/.test(h))).toBe(true)
    expect(h2.some(h=>/switch/.test(h))).toBe(true)
  })

  it('golden prompts produce valid DSL (sample set)', async () => {
    const prompts = [
      'Daily schedule to fetch RSS and post top 3 to Slack',
      'Webhook receives JSON then transform and store to Google Sheets',
      'HTTP call to Notion to create a page, then email me the link',
      'Watch Airtable for new records, enrich via HTTP, and notify Discord',
      'If status=error branch to Slack alert, else continue to Notion log',
      'Retry HTTP with try/catch and timeout, then join with parallel scrape',
      'Loop over items from API and send emails',
      'Summarize tweets via HTTP to Twitter API and post to Slack',
      'Cron hourly to fetch metrics and append to Google Sheet',
      'Discord message in channel when Notion page updated',
      'Webhook to transform fields and call external API',
      'Switch on type field and route to different HTTP endpoints',
      'Parallel: call two APIs, then join and email result',
      'Try/catch around risky HTTP then continue on catch',
      'Daily at 9am schedule: fetch weather API and email report',
      'Create Airtable record from webhook, then Slack notify',
      'Notion page update from transformed input',
      'Google Sheets row create for each item in loop',
      'Discord message when HTTP returns 200',
      'Transform payload and fan out via parallel calls',
      'Join two branches then switch by field',
      'Try/catch and guard on edge with expression',
      'Parallel scrape exchanges then join and email summary',
      'Schedule weekly report and store in Notion',
      'HTTP POST with headers, then transform, then Slack',
    ]
    for (const p of prompts) {
      const { dsl } = await generateWorkflowDslFromPrompt(p)
      expect(Array.isArray(dsl.nodes)).toBe(true)
      expect(dsl.nodes.length).toBeGreaterThan(0)
    }
  }, 30_000)
})


