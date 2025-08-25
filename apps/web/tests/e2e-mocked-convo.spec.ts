import { test, expect, Page } from '@playwright/test'

async function mockAiEndpoints(page: Page) {
  await page.route('**/api/providers/status', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: {} }) })
  })

  await page.route('**/api/agent/plan', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    const body = {
      options: { plan: [ { text: 'Trigger: Daily schedule' }, { text: 'Action: Post to Twitter' } ], questions: [], connectionsRequired: [] },
      defaults: {},
      nextQuestions: []
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  await page.route('**/api/agent/confirm', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agentSpec: { name: 'Tweet daily AI trends', goal: 'Tweet daily AI trends' } }) })
  })

  await page.route('**/api/agent/generate', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    const flowDoc = {
      version: '1.1', lanes: [],
      nodes: [ { id: 'trigger', type: 'input', title: 'Trigger' }, { id: 'tweet', type: 'output', title: 'Tweet' } ],
      edges: [ { id: 'e1', source: { nodeId: 'trigger' }, target: { nodeId: 'tweet' }, label: 'success' } ]
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ flowDoc }) })
  })

  await page.route('**/api/agent/diff/summary', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ summary: 'We will add a Trigger and a Tweet step, and connect them.' }) })
  })

  // Conversational continue endpoint
  await page.route('**/api/chat/continue', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    let body: any = {}
    try { body = route.request().postDataJSON() as any } catch {}
    const prompt = String(body?.prompt || '')
    const message = `Let’s build this: ${prompt}`
    const quickActions = [
      { label: 'Preview change', value: 'preview', kind: 'preview', patchInstruction: 'Add a trigger and tweet node', patchParams: {} },
      { label: 'Build', value: 'build', kind: 'continue' },
    ]
    const payload = { message, quickActions, primaryAction: { label: 'Build', action: 'build' }, context: { stage: 'propose' }, nextStep: 1 }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  })
}

test.describe('@ci-mocked', () => { test.setTimeout(60000)
  test('Conversational mode: mocked AI → build → diff → apply', async ({ page }) => {
    await mockAiEndpoints(page)
    await page.goto('/agent')

    // Switch to Conversational
    const conv = page.getByTestId('mode-conversational')
    if (await conv.isVisible()) await conv.click()

    // Send a prompt
    const input = page.getByTestId('convo-input')
    const send = page.getByTestId('convo-send')
    await input.fill('Tweet daily AI trends')
    await send.click()

    // Trigger build via test hook to avoid selector ambiguity
    await page.waitForFunction(() => Boolean((window as any).convoApi?.build), null, { timeout: 10000 })
    await page.evaluate(() => (window as any).convoApi?.build?.())

    // Wait for pending diff via test hook, then open/apply via hook for stability
    await page.waitForFunction(() => (window as any).convoApi?.hasPending?.(), null, { timeout: 20000 })
    await page.evaluate(() => (window as any).convoApi?.openPanel?.())
    await page.evaluate(() => (window as any).convoApi?.applyPending?.())

    // Assert applied toast (either of two variants)
    const toast1 = page.getByText('Workflow applied to canvas')
    const toast2 = page.getByText('Done — Workflow applied')
    await Promise.race([
      toast1.waitFor({ state: 'visible', timeout: 10000 }),
      toast2.waitFor({ state: 'visible', timeout: 10000 }),
    ])
  })
})


