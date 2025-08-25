import { test, expect } from '@playwright/test'

// AB-205: Golden prompts should produce valid DSL via /api/ai/generate-workflow
test.describe('@planner @golden-prompts', () => {
  test('each golden prompt returns valid DSL', async ({ request }) => {
    test.setTimeout(180_000)
    const resList = await request.get('/qa/golden-prompts.json')
    expect(resList.ok()).toBeTruthy()
    const prompts = await resList.json() as Array<{ prompt: string }>
    expect(Array.isArray(prompts)).toBeTruthy()
    expect(prompts.length).toBeGreaterThanOrEqual(20)
    for (const { prompt } of prompts.slice(0, 25)) {
      const res = await request.post('/api/ai/generate-workflow', { data: { prompt } })
      expect(res.ok()).toBeTruthy()
      const json = await res.json()
      expect(json).toHaveProperty('dsl')
      expect(json.dsl).toHaveProperty('nodes')
      expect(Array.isArray(json.dsl.nodes)).toBeTruthy()
      expect(json.dsl.nodes.length).toBeGreaterThan(0)
    }
  })
})


