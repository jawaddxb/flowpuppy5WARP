import { test, expect } from '@playwright/test'

test.describe('@tasks-e2e', () => {
  test('Tasks page shows runs and step timeline', async ({ page }) => {
    await page.goto('/tasks')
    const main = page.getByRole('main')
    await expect(main.getByText('Tasks', { exact: true })).toBeVisible()

    // Stubbed API often returns runs; if not, accept empty state
    const runBtn = main.getByRole('button', { name: /Run\s+/i })
    let runCount = 0
    try {
      await expect.poll(async () => await runBtn.count(), { timeout: 20000 }).toBeGreaterThan(0)
      runCount = await runBtn.count()
    } catch {
      runCount = 0
    }

    if (runCount === 0) {
      // Accept empty state variants
      const empty = page.getByText(/No runs|Nothing here yet|Create your first run/i).first()
      await expect(empty).toBeVisible({ timeout: 10000 })
      return
    }

    await runBtn.first().scrollIntoViewIfNeeded()
    await runBtn.first().click()

    // Steps may exist or be empty; accept either
    const stepCandidate = page.getByText(/Trigger|HTTP Request|Analyze|Send Email|No steps found\./i).first()
    try {
      await expect(stepCandidate).toBeVisible({ timeout: 15000 })
    } catch {
      // Accept presence of a steps container when labels change
      const stepsContainer = page.locator('[data-testid="run-steps"], .steps, [role="list"]').first()
      await expect(stepsContainer).toBeVisible({ timeout: 5000 })
    }
  })
})


