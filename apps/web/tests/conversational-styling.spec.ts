import { test, expect } from '@playwright/test'

test.describe('@conversational-styling', () => {
  test('chat input is fixed size and send button is clearly visible', async ({ page }) => {
    await page.goto('/agent')

    // Switch to Conversational mode
    const convBtn = page.getByTestId('mode-conversational')
    if (await convBtn.isVisible()) await convBtn.click()

    const input = page.getByTestId('convo-input')
    const sendBtn = page.getByTestId('convo-send')
    const composer = page.getByTestId('convo-composer')

    await expect(input).toBeVisible()
    await expect(sendBtn).toBeVisible()
    await expect(composer).toBeVisible()

    // Enable send button by adding text
    await input.fill('test message')
    
    // Check input is fixed height (allow for border/padding variance)
    const inputBox = await input.boundingBox()
    expect(inputBox?.height).toBeGreaterThan(35)
    expect(inputBox?.height).toBeLessThan(50)

    // Check send button has proper contrast when enabled
    await expect(sendBtn).toBeEnabled()
    
    const sendBtnStyles = await sendBtn.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        border: styles.border
      }
    })
    
    // Should be blue background, white text, not white/transparent
    expect(sendBtnStyles.backgroundColor).toMatch(/rgb\(37, 99, 235\)|rgba\(37, 99, 235/)
    expect(sendBtnStyles.color).toMatch(/rgb\(255, 255, 255\)|rgba\(255, 255, 255/)

    // Test that input stays fixed size when typing
    await input.fill('This is a longer message to test if the input stays fixed size')
    const inputBoxAfter = await input.boundingBox()
    expect(inputBoxAfter?.height).toBe(40) // Should remain same height

    // Test send button is clickable and visible
    await input.fill('test message')
    await expect(sendBtn).toBeEnabled()
    
    // Verify button text is visible
    await expect(sendBtn).toHaveText('Send')
  })

  test('composer remains at bottom during conversation', async ({ page }) => {
    await page.goto('/agent')

    const convBtn = page.getByTestId('mode-conversational')
    if (await convBtn.isVisible()) await convBtn.click()

    const composer = page.getByTestId('convo-composer')
    const input = page.getByTestId('convo-input')

    // Get initial position
    const initialBox = await composer.boundingBox()
    
    // Start a conversation
    await input.fill('send health tweets daily')
    await page.getByTestId('convo-send').click()
    
    // Wait for response
    await page.waitForTimeout(1000)
    
    // Composer should still be at bottom
    const afterBox = await composer.boundingBox()
    expect(await composer.isVisible()).toBeTruthy()
    
    // Y position should be near the bottom of viewport (allowing some variance)
    expect(afterBox?.y).toBeGreaterThan(350) // Should be in lower portion of screen on CI viewport
  })
})
