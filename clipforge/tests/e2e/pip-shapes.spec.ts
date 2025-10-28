import { test, expect } from '@playwright/test'
import { AuthTestHelpers, ProjectTestHelpers, TimelineTestHelpers } from '../helpers/tauri-test'

test.describe('PiP Shapes', () => {
  let authHelper: AuthTestHelpers
  let projectHelper: ProjectTestHelpers
  let timelineHelper: TimelineTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
    projectHelper = new ProjectTestHelpers(page)
    timelineHelper = new TimelineTestHelpers(page)
    
    // Login and create project
    await authHelper.loginWithTestCredentials()
    await projectHelper.createProject('PiP Test Project')
    
    // Add test clips
    await addTestClips(page)
  })

  async function addTestClips(page: any) {
    // Mock clips API
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'clip-1',
              name: 'Screen Recording',
              src: '/uploads/screen.mp4',
              duration: 10.0,
              start_time: 0,
              end_time: 10.0,
              track: 1,
              project_id: 'test-project-id'
            },
            {
              id: 'clip-2',
              name: 'Webcam Recording',
              src: '/uploads/webcam.mp4',
              duration: 8.0,
              start_time: 2.0,
              end_time: 10.0,
              track: 2,
              project_id: 'test-project-id'
            }
          ])
        })
      }
    })
  }

  test('should display PiP controls', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Should show PiP controls
    await expect(page.locator('[data-testid="pip-controls"]')).toBeVisible()
    await expect(page.locator('text=PiP Magic')).toBeVisible()
  })

  test('should show shape presets', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Should show shape buttons
    await expect(page.locator('[data-testid="shape-circle"]')).toBeVisible()
    await expect(page.locator('[data-testid="shape-heart"]')).toBeVisible()
    await expect(page.locator('[data-testid="shape-star"]')).toBeVisible()
    await expect(page.locator('[data-testid="shape-diamond"]')).toBeVisible()
  })

  test('should apply circle shape', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Mock PiP shape API
    await page.route('**/clips/clip-2/pip*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-2',
            pip_shape: 'circle',
            pip_x: 50,
            pip_y: 50,
            pip_size: 200
          })
        })
      }
    })
    
    // Click circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Should apply circle shape
    await timelineHelper.applyPipShape('circle')
    
    // Should show PiP indicator
    await expect(timelineHelper.isPipApplied()).resolves.toBe(true)
  })

  test('should apply heart shape', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Mock PiP shape API
    await page.route('**/clips/clip-2/pip*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-2',
            pip_shape: 'heart',
            pip_x: 50,
            pip_y: 50,
            pip_size: 200
          })
        })
      }
    })
    
    // Click heart shape
    await page.click('[data-testid="shape-heart"]')
    
    // Should apply heart shape
    await timelineHelper.applyPipShape('heart')
    
    // Should show PiP indicator
    await expect(timelineHelper.isPipApplied()).resolves.toBe(true)
  })

  test('should show AI shape input', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Should show AI input field
    await expect(page.locator('[data-testid="ai-shape-input"]')).toBeVisible()
    await expect(page.locator('text=Describe your shape')).toBeVisible()
  })

  test('should generate custom shape with AI', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Mock AI shape generation API
    await page.route('**/ai/generate-shape*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            shape: 'custom',
            svg_path: 'M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z',
            name: 'Custom Shape'
          })
        })
      }
    })
    
    // Mock PiP shape API
    await page.route('**/clips/clip-2/pip*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-2',
            pip_shape: 'custom',
            pip_x: 50,
            pip_y: 50,
            pip_size: 200
          })
        })
      }
    })
    
    // Type custom shape description
    await page.fill('[data-testid="ai-shape-input"]', 'a cute cat face')
    
    // Click generate button
    await page.click('[data-testid="generate-shape-button"]')
    
    // Should show loading state
    await expect(page.locator('text=Generating shape...')).toBeVisible()
    
    // Should apply custom shape
    await expect(page.locator('[data-testid="custom-shape"]')).toBeVisible()
  })

  test('should show shape preview', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Click circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Should show shape preview
    await expect(page.locator('[data-testid="shape-preview"]')).toBeVisible()
    
    // Should show circle preview
    await expect(page.locator('[data-testid="shape-preview"] .circle')).toBeVisible()
  })

  test('should adjust PiP position', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Mock position update API
    await page.route('**/clips/clip-2/pip*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-2',
            pip_x: 100,
            pip_y: 100,
            pip_size: 200
          })
        })
      }
    })
    
    // Drag PiP to new position
    const pipElement = page.locator('[data-testid="pip-overlay"]')
    await pipElement.dragTo(page.locator('[data-testid="video-preview"]'), {
      targetPosition: { x: 100, y: 100 }
    })
    
    // Should update position
    await expect(pipElement).toHaveAttribute('data-x', '100')
    await expect(pipElement).toHaveAttribute('data-y', '100')
  })

  test('should adjust PiP size', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Mock size update API
    await page.route('**/clips/clip-2/pip*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-2',
            pip_x: 50,
            pip_y: 50,
            pip_size: 300
          })
        })
      }
    })
    
    // Resize PiP
    const resizeHandle = page.locator('[data-testid="pip-resize-handle"]')
    await resizeHandle.dragTo(page.locator('[data-testid="video-preview"]'), {
      targetPosition: { x: 300, y: 300 }
    })
    
    // Should update size
    const pipElement = page.locator('[data-testid="pip-overlay"]')
    await expect(pipElement).toHaveAttribute('data-size', '300')
  })

  test('should show PiP animation options', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Should show animation controls
    await expect(page.locator('[data-testid="animation-controls"]')).toBeVisible()
    await expect(page.locator('text=Animation')).toBeVisible()
  })

  test('should apply bounce animation', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Mock animation API
    await page.route('**/clips/clip-2/animation*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-2',
            animation: 'bounce',
            animation_duration: 1.0
          })
        })
      }
    })
    
    // Select bounce animation
    await page.click('[data-testid="animation-bounce"]')
    
    // Should apply animation
    const pipElement = page.locator('[data-testid="pip-overlay"]')
    await expect(pipElement).toHaveClass(/bounce/)
  })

  test('should show PiP border options', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Should show border controls
    await expect(page.locator('[data-testid="border-controls"]')).toBeVisible()
    await expect(page.locator('text=Border')).toBeVisible()
  })

  test('should apply border to PiP', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Mock border API
    await page.route('**/clips/clip-2/border*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-2',
            border_width: 3,
            border_color: '#ffffff'
          })
        })
      }
    })
    
    // Enable border
    await page.click('[data-testid="border-toggle"]')
    
    // Set border width
    await page.fill('[data-testid="border-width"]', '3')
    
    // Set border color
    await page.fill('[data-testid="border-color"]', '#ffffff')
    
    // Should apply border
    const pipElement = page.locator('[data-testid="pip-overlay"]')
    await expect(pipElement).toHaveCSS('border-width', '3px')
    await expect(pipElement).toHaveCSS('border-color', 'rgb(255, 255, 255)')
  })

  test('should remove PiP shape', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Mock remove PiP API
    await page.route('**/clips/clip-2/pip*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-2',
            pip_shape: null
          })
        })
      }
    })
    
    // Click remove PiP button
    await page.click('[data-testid="remove-pip-button"]')
    
    // Should remove PiP
    await expect(page.locator('[data-testid="pip-overlay"]')).not.toBeVisible()
  })

  test('should handle AI generation error', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Mock AI generation error
    await page.route('**/ai/generate-shape*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to generate shape'
        })
      })
    })
    
    // Type custom shape description
    await page.fill('[data-testid="ai-shape-input"]', 'a complex shape')
    
    // Click generate button
    await page.click('[data-testid="generate-shape-button"]')
    
    // Should show error message
    await expect(page.locator('text=Failed to generate shape')).toBeVisible()
  })

  test('should show PiP in video preview', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Should show PiP overlay in preview
    await expect(page.locator('[data-testid="video-preview"] [data-testid="pip-overlay"]')).toBeVisible()
  })

  test('should sync PiP with timeline', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select webcam clip
    await timelineHelper.selectClip(1)
    
    // Apply circle shape
    await page.click('[data-testid="shape-circle"]')
    
    // Seek timeline
    await page.click('[data-testid="timeline-container"]', { position: { x: 300, y: 50 } })
    
    // PiP should be visible at that time
    await expect(page.locator('[data-testid="pip-overlay"]')).toBeVisible()
  })
})
