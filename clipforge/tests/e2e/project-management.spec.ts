import { test, expect } from '@playwright/test'
import { AuthTestHelpers, ProjectTestHelpers } from '../helpers/tauri-test'

test.describe('Project Management', () => {
  let authHelper: AuthTestHelpers
  let projectHelper: ProjectTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
    projectHelper = new ProjectTestHelpers(page)
    
    // Login before each test
    await authHelper.loginWithTestCredentials()
  })

  test('should display projects page', async ({ page }) => {
    await page.goto('/projects')
    
    await expect(page).toHaveTitle(/Projects/)
    await expect(page.locator('h1')).toContainText('My Projects')
    await expect(page.locator('[data-testid="create-project-button"]')).toBeVisible()
  })

  test('should create a new project', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock project creation API
    await page.route('**/projects*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-project-id',
            name: 'Test Project',
            user_id: 'test-user-id',
            created_at: new Date().toISOString()
          })
        })
      }
    })

    await projectHelper.createProject('Test Project')
    
    // Should navigate to project page
    await expect(page).toHaveURL(/\/project\/test-project-id/)
    await expect(page.locator('h1')).toContainText('Test Project')
  })

  test('should show validation error for empty project name', async ({ page }) => {
    await page.goto('/projects')
    
    await page.click('[data-testid="create-project-button"]')
    await page.click('button:has-text("Create")')
    
    // Should show validation error
    await expect(page.locator('text=Project name is required')).toBeVisible()
  })

  test('should display existing projects', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock projects list API
    await page.route('**/projects*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'project-1',
              name: 'My First Project',
              user_id: 'test-user-id',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 'project-2',
              name: 'My Second Project',
              user_id: 'test-user-id',
              created_at: '2024-01-02T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z'
            }
          ])
        })
      }
    })

    // Refresh to load projects
    await page.reload()
    
    // Should display projects
    await expect(page.locator('text=My First Project')).toBeVisible()
    await expect(page.locator('text=My Second Project')).toBeVisible()
  })

  test('should open project when clicked', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock projects list
    await page.route('**/projects*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'project-1',
              name: 'My First Project',
              user_id: 'test-user-id',
              created_at: '2024-01-01T00:00:00Z'
            }
          ])
        })
      }
    })

    await page.reload()
    
    // Click on project
    await page.click('text=My First Project')
    
    // Should navigate to project page
    await expect(page).toHaveURL('/project/project-1')
    await expect(page.locator('h1')).toContainText('My First Project')
  })

  test('should delete project', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock projects list
    await page.route('**/projects*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'project-1',
              name: 'My First Project',
              user_id: 'test-user-id',
              created_at: '2024-01-01T00:00:00Z'
            }
          ])
        })
      }
    })

    // Mock delete API
    await page.route('**/projects/project-1*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: ''
        })
      }
    })

    await page.reload()
    
    // Click delete button
    await page.click('[data-testid="delete-project-button"]')
    
    // Confirm deletion
    await page.click('button:has-text("Delete")')
    
    // Should remove project from list
    await expect(page.locator('text=My First Project')).not.toBeVisible()
  })

  test('should edit project name', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock projects list
    await page.route('**/projects*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'project-1',
              name: 'My First Project',
              user_id: 'test-user-id',
              created_at: '2024-01-01T00:00:00Z'
            }
          ])
        })
      }
    })

    // Mock update API
    await page.route('**/projects/project-1*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'project-1',
            name: 'Updated Project Name',
            user_id: 'test-user-id',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: new Date().toISOString()
          })
        })
      }
    })

    await page.reload()
    
    // Click edit button
    await page.click('[data-testid="edit-project-button"]')
    
    // Update name
    await page.fill('input[value="My First Project"]', 'Updated Project Name')
    await page.click('button:has-text("Save")')
    
    // Should show updated name
    await expect(page.locator('text=Updated Project Name')).toBeVisible()
  })

  test('should handle empty projects list', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock empty projects list
    await page.route('**/projects*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      }
    })

    await page.reload()
    
    // Should show empty state
    await expect(page.locator('text=No projects yet')).toBeVisible()
    await expect(page.locator('text=Create your first project')).toBeVisible()
  })

  test('should handle project creation error', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock project creation error
    await page.route('**/projects*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to create project'
          })
        })
      }
    })

    await page.click('[data-testid="create-project-button"]')
    await page.fill('input[placeholder*="project name" i]', 'Test Project')
    await page.click('button:has-text("Create")')
    
    // Should show error message
    await expect(page.locator('text=Failed to create project')).toBeVisible()
  })

  test('should show project creation loading state', async ({ page }) => {
    await page.goto('/projects')
    
    // Mock slow project creation
    await page.route('**/projects*', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-project-id',
            name: 'Test Project',
            user_id: 'test-user-id',
            created_at: new Date().toISOString()
          })
        })
      }
    })

    await page.click('[data-testid="create-project-button"]')
    await page.fill('input[placeholder*="project name" i]', 'Test Project')
    await page.click('button:has-text("Create")')
    
    // Should show loading state
    await expect(page.locator('button:has-text("Creating...")')).toBeVisible()
    await expect(page.locator('button:has-text("Creating...")')).toBeDisabled()
  })

  test('should navigate to project from URL', async ({ page }) => {
    // Mock project API
    await page.route('**/projects/test-project-id*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-project-id',
            name: 'Test Project',
            user_id: 'test-user-id',
            created_at: '2024-01-01T00:00:00Z'
          })
        })
      }
    })

    // Navigate directly to project
    await projectHelper.navigateToProject('test-project-id')
    
    // Should load project
    await expect(page.locator('h1')).toContainText('Test Project')
  })
})
