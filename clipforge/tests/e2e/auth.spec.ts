import { test, expect } from '@playwright/test'
import { AuthTestHelpers } from '../helpers/tauri-test'

test.describe('Authentication', () => {
  let authHelper: AuthTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page).toHaveTitle(/VidVeil/)
    await expect(page.locator('h1')).toContainText('Sign In')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login')
    
    await page.click('button[type="submit"]')
    
    // Check for validation messages
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Wait for error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible()
  })

  test('should redirect to projects after successful login', async ({ page }) => {
    await page.goto('/login')
    
    // Mock successful login
    await page.route('**/auth/v1/token*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        })
      })
    })

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    
    // Should redirect to projects page
    await page.waitForURL('/projects')
    await expect(page.locator('h1')).toContainText('My Projects')
  })

  test('should handle OAuth login', async ({ page }) => {
    await page.goto('/login')
    
    // Mock OAuth callback
    await page.route('**/auth/v1/callback*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-oauth-token',
          user: {
            id: 'oauth-user-id',
            email: 'oauth@example.com'
          }
        })
      })
    })

    // Click GitHub OAuth button
    await page.click('button:has-text("GitHub")')
    
    // Should redirect to projects page
    await page.waitForURL('/projects')
    await expect(page.locator('h1')).toContainText('My Projects')
  })

  test('should persist login state across page refreshes', async ({ page }) => {
    // First login
    await authHelper.loginWithTestCredentials()
    
    // Refresh page
    await page.reload()
    
    // Should still be logged in
    await expect(page).toHaveURL('/projects')
    await expect(page.locator('h1')).toContainText('My Projects')
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await authHelper.loginWithTestCredentials()
    
    // Mock logout API
    await page.route('**/auth/v1/logout*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logged out successfully' })
      })
    })
    
    // Click logout button
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to login page
    await page.waitForURL('/login')
    await expect(page.locator('h1')).toContainText('Sign In')
  })

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access projects page without login
    await page.goto('/projects')
    
    // Should redirect to login
    await page.waitForURL('/login')
    await expect(page.locator('h1')).toContainText('Sign In')
  })

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/login')
    
    // Mock network error
    await page.route('**/auth/v1/token*', async route => {
      await route.abort('failed')
    })

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    
    // Should show network error message
    await expect(page.locator('text=Network error')).toBeVisible()
  })

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login')
    
    // Mock slow login response
    await page.route('**/auth/v1/token*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          user: { id: 'test-user-id', email: 'test@example.com' }
        })
      })
    })

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    
    // Should show loading state
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
    await expect(page.locator('text=Signing in...')).toBeVisible()
  })
})
