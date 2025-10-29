import { test, expect } from '@playwright/test'
import { AuthTestHelpers } from '../helpers/tauri-test'

/**
 * Viewport Fit Tests
 * 
 * Ensures that all critical pages fit within the viewport (1280x800 - 13" MacBook Air)
 * without requiring vertical scrolling. Critical buttons must be visible without scrolling.
 */

test.describe('Viewport Fit Tests', () => {
  let authHelper: AuthTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
  })

  /**
   * Assert that the page has no vertical scrolling
   */
  async function assertNoVerticalScroll(page: any) {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight)
    const clientHeight = await page.evaluate(() => window.innerHeight)
    
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2) // Allow 2px tolerance for rounding
  }

  /**
   * Assert that an element is visible within the viewport bounds
   */
  async function assertElementVisible(page: any, selector: string) {
    const element = page.locator(selector)
    await expect(element).toBeVisible()
    
    const boundingBox = await element.boundingBox()
    if (!boundingBox) {
      throw new Error(`Element ${selector} has no bounding box`)
    }
    
    const viewportSize = page.viewportSize()
    if (!viewportSize) {
      throw new Error('Could not get viewport size')
    }
    
    // Element should be within viewport
    expect(boundingBox.y).toBeGreaterThanOrEqual(0)
    expect(boundingBox.y + boundingBox.height).toBeLessThanOrEqual(viewportSize.height)
    expect(boundingBox.x).toBeGreaterThanOrEqual(0)
    expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(viewportSize.width)
  }

  /**
   * Assert that critical buttons are visible without scrolling
   */
  async function assertCriticalButtonsVisible(page: any, selectors: string[]) {
    for (const selector of selectors) {
      await assertElementVisible(page, selector)
    }
  }

  test('recorder page fits viewport and record button is visible', async ({ page }) => {
    // Login first
    await authHelper.loginWithTestCredentials('ielvisd@gmail.com', 'test123')
    
    // Navigate to recorder
    await page.goto('/recorder')
    await page.waitForLoadState('networkidle')
    
    // Wait for page to render
    await page.waitForSelector('.recorder-page', { state: 'visible' })
    await page.waitForTimeout(500) // Allow any animations to settle
    
    // Assert no vertical scroll
    await assertNoVerticalScroll(page)
    
    // Assert record button is visible
    await assertElementVisible(page, 'button:has-text("Start Recording")')
    
    // Assert header is visible
    await assertElementVisible(page, '.recorder-header')
    
    // Assert control bar is visible (should be fixed at bottom)
    await assertElementVisible(page, '.control-bar')
  })

  test('project editor page fits viewport and critical buttons are visible', async ({ page }) => {
    // Login first
    await authHelper.loginWithTestCredentials('ielvisd@gmail.com', 'test123')
    
    // Navigate to projects page first to ensure we have a project
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    
    // Wait a moment for projects to load
    await page.waitForTimeout(1000)
    
    // Try to find and click first project, or create one if none exist
    const projectCard = page.locator('.project-card').first()
    const projectCount = await projectCard.count()
    
    if (projectCount > 0) {
      await projectCard.click()
      await page.waitForURL(/\/project\/[a-f0-9-]+/)
    } else {
      // Create a test project
      await page.click('button:has-text("New Project")')
      await page.waitForTimeout(500)
      await page.fill('input', 'Test Project')
      await page.press('input', 'Enter')
      await page.waitForURL(/\/project\/[a-f0-9-]+/)
    }
    
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500) // Allow any animations to settle
    
    // Assert no vertical scroll
    await assertNoVerticalScroll(page)
    
    // Assert critical elements are visible
    await assertCriticalButtonsVisible(page, [
      '.top-bar',
      '.editor-layout',
      '.timeline-container'
    ])
    
    // Assert preview area is visible
    await assertElementVisible(page, '.center-preview')
  })

  test('projects page fits viewport', async ({ page }) => {
    // Login first
    await authHelper.loginWithTestCredentials('ielvisd@gmail.com', 'test123')
    
    // Navigate to projects
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500) // Allow any animations to settle
    
    // Assert no vertical scroll
    await assertNoVerticalScroll(page)
    
    // Assert "New Project" button is visible
    await assertElementVisible(page, 'button:has-text("New Project")')
  })

  test('login page fits viewport', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500) // Allow any animations to settle
    
    // Assert no vertical scroll
    await assertNoVerticalScroll(page)
    
    // Assert login form is visible
    await assertElementVisible(page, 'input[type="email"]')
    await assertElementVisible(page, 'input[type="password"]')
    await assertElementVisible(page, 'button[type="submit"]')
  })
})

