import { test, expect, Page } from '@playwright/test'

async function mockAiEndpoints(page: Page) {
  // Providers status: keep quiet and fast
  await page.route('**/api/providers/status', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: {} }) })
  })

  // Plan → minimal, no gating
  await page.route('**/api/agent/plan', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    const body = {
      options: {
        plan: [
          { text: 'Trigger: Daily schedule' },
          { text: 'Action: Post to Twitter' },
        ],
        questions: [],
        connectionsRequired: [],
      },
      defaults: {},
      nextQuestions: [],
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  // Confirm → basic AgentSpec
  await page.route('**/api/agent/confirm', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    const body = { agentSpec: { name: 'Tweet daily AI trends', goal: 'Tweet daily AI trends' } }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  // Generate → deterministic flowDoc
  await page.route('**/api/agent/generate', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    const body = {
      flowDoc: {
        version: '1.1',
        lanes: [],
        nodes: [
          { id: 'trigger', type: 'input', title: 'Trigger' },
          { id: 'tweet', type: 'output', title: 'Tweet' },
        ],
        edges: [
          { id: 'e1', source: { nodeId: 'trigger' }, target: { nodeId: 'tweet' }, label: 'success' },
        ],
      },
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })

  // Diff summary → friendly sentence
  await page.route('**/api/agent/diff/summary', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    const body = { summary: 'We will add a Trigger and a Tweet step, and connect them.' }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
}

test.describe('@ci-mocked', () => { test.setTimeout(60000)
  test('Quick mode: mocked AI → diff → apply → toast', async ({ page }) => {
    await mockAiEndpoints(page)
    await page.goto('/agent')

    // Switch to Quick mode
    const quickBtn = page.getByTestId('mode-quick')
    if (await quickBtn.isVisible()) await quickBtn.click()

    // Enter prompt and send
    const composer = page.getByPlaceholder('Tell me what you want to create!')
    await composer.fill('Tweet daily AI trends')
    await page.getByRole('button', { name: 'Send' }).click()

    // Create workflow (plan → confirm → generate)
    const create = page.getByTestId('quick-create-workflow')
    await expect(create).toBeEnabled({ timeout: 10000 })
    await create.click()

    // Wait for floating diff or inline apply
    const floatingHeader = page.getByText('Proposed change').first()
    const applyBtn = page.getByRole('button', { name: 'Apply' })
    await Promise.race([
      floatingHeader.waitFor({ state: 'visible', timeout: 20000 }),
      applyBtn.waitFor({ state: 'visible', timeout: 20000 }),
    ])

    // Open panel if minimized and apply
    if (!(await applyBtn.isVisible().catch(() => false))) {
      // Panel exists; find the Apply inside panel content
      await floatingHeader.waitFor({ state: 'visible' })
    }
    await page.getByRole('button', { name: 'Apply' }).click()

    // Toast should appear
    await expect(page.getByText(/Workflow applied to canvas/i)).toBeVisible({ timeout: 10000 })
  })
})


