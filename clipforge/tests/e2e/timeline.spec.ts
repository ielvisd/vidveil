import { test, expect } from '@playwright/test'
import { AuthTestHelpers, ProjectTestHelpers, TimelineTestHelpers } from '../helpers/tauri-test'

test.describe('Timeline Editing', () => {
  let authHelper: AuthTestHelpers
  let projectHelper: ProjectTestHelpers
  let timelineHelper: TimelineTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
    projectHelper = new ProjectTestHelpers(page)
    timelineHelper = new TimelineTestHelpers(page)
    
    // Login and create project
    await authHelper.loginWithTestCredentials()
    await projectHelper.createProject('Timeline Test Project')
    
    // Add test clips to timeline
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

  test('should display timeline with clips', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Should show timeline container
    await expect(page.locator('.timeline-container')).toBeVisible()
    
    // Should show clips
    const clipsCount = await timelineHelper.getClipsCount()
    expect(clipsCount).toBe(2)
    
    // Should show clip names
    await expect(page.locator('text=Screen Recording')).toBeVisible()
    await expect(page.locator('text=Webcam Recording')).toBeVisible()
  })

  test('should select clip when clicked', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Click on first clip
    await timelineHelper.selectClip(0)
    
    // Should show selection indicator
    await expect(page.locator('.timeline-clip.selected')).toBeVisible()
    
    // Should show clip details in sidebar
    await expect(page.locator('text=Screen Recording')).toBeVisible()
  })

  test('should move clip by dragging', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select first clip
    await timelineHelper.selectClip(0)
    
    // Mock clip move API
    await page.route('**/clips/clip-1*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-1',
            start_time: 5.0,
            end_time: 15.0
          })
        })
      }
    })
    
    // Drag clip to new position
    const clip = page.locator('.timeline-clip').first()
    await clip.dragTo(page.locator('.timeline-track'), {
      targetPosition: { x: 200, y: 50 }
    })
    
    // Should update clip position
    await expect(page.locator('.timeline-clip').first()).toHaveAttribute('data-start-time', '5.0')
  })

  test('should trim clip by dragging handles', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select first clip
    await timelineHelper.selectClip(0)
    
    // Mock clip trim API
    await page.route('**/clips/clip-1*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-1',
            start_time: 2.0,
            end_time: 8.0
          })
        })
      }
    })
    
    // Drag trim handle
    const trimHandle = page.locator('.trim-handle-left')
    await trimHandle.dragTo(page.locator('.timeline-track'), {
      targetPosition: { x: 100, y: 50 }
    })
    
    // Should update clip duration
    await expect(page.locator('.timeline-clip').first()).toHaveAttribute('data-duration', '6.0')
  })

  test('should split clip', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select first clip
    await timelineHelper.selectClip(0)
    
    // Mock clip split API
    await page.route('**/clips/clip-1/split*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'clip-1a',
              name: 'Screen Recording (Part 1)',
              src: '/uploads/screen.mp4',
              duration: 5.0,
              start_time: 0,
              end_time: 5.0,
              track: 1
            },
            {
              id: 'clip-1b',
              name: 'Screen Recording (Part 2)',
              src: '/uploads/screen.mp4',
              duration: 5.0,
              start_time: 5.0,
              end_time: 10.0,
              track: 1
            }
          ])
        })
      }
    })
    
    // Right-click on clip to show context menu
    await page.locator('.timeline-clip').first().click({ button: 'right' })
    
    // Click split option
    await page.click('text=Split Clip')
    
    // Should create two clips
    const clipsCount = await timelineHelper.getClipsCount()
    expect(clipsCount).toBe(3) // Original 2 + 2 new clips
  })

  test('should delete clip', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select first clip
    await timelineHelper.selectClip(0)
    
    // Mock clip delete API
    await page.route('**/clips/clip-1*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: ''
        })
      }
    })
    
    // Press delete key
    await page.keyboard.press('Delete')
    
    // Should remove clip from timeline
    const clipsCount = await timelineHelper.getClipsCount()
    expect(clipsCount).toBe(1)
  })

  test('should duplicate clip', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select first clip
    await timelineHelper.selectClip(0)
    
    // Mock clip duplicate API
    await page.route('**/clips/clip-1/duplicate*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-1-copy',
            name: 'Screen Recording (Copy)',
            src: '/uploads/screen.mp4',
            duration: 10.0,
            start_time: 10.0,
            end_time: 20.0,
            track: 1
          })
        })
      }
    })
    
    // Right-click on clip
    await page.locator('.timeline-clip').first().click({ button: 'right' })
    
    // Click duplicate option
    await page.click('text=Duplicate Clip')
    
    // Should add duplicate clip
    const clipsCount = await timelineHelper.getClipsCount()
    expect(clipsCount).toBe(3)
  })

  test('should zoom timeline', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Get initial zoom level
    const initialZoom = await page.locator('.timeline-container').getAttribute('data-zoom')
    
    // Zoom in
    await page.locator('.timeline-container').wheel({ deltaY: -100 })
    
    // Should increase zoom level
    const newZoom = await page.locator('.timeline-container').getAttribute('data-zoom')
    expect(parseFloat(newZoom)).toBeGreaterThan(parseFloat(initialZoom))
  })

  test('should pan timeline', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Get initial scroll position
    const initialScroll = await page.locator('.timeline-container').evaluate(el => el.scrollLeft)
    
    // Pan timeline
    await page.locator('.timeline-container').dragTo(page.locator('.timeline-container'), {
      targetPosition: { x: -100, y: 0 }
    })
    
    // Should change scroll position
    const newScroll = await page.locator('.timeline-container').evaluate(el => el.scrollLeft)
    expect(newScroll).not.toBe(initialScroll)
  })

  test('should show playhead indicator', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Should show playhead
    await expect(page.locator('.playhead-indicator')).toBeVisible()
    
    // Should show time ruler
    await expect(page.locator('.time-ruler')).toBeVisible()
  })

  test('should update playhead position', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Click on timeline to seek
    await page.locator('.timeline-container').click({ position: { x: 200, y: 50 } })
    
    // Should update playhead position
    const playheadPosition = await page.locator('.playhead-indicator').getAttribute('data-time')
    expect(parseFloat(playheadPosition)).toBeGreaterThan(0)
  })

  test('should snap clips to grid', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Enable snap to grid
    await page.click('[data-testid="snap-to-grid-toggle"]')
    
    // Select first clip
    await timelineHelper.selectClip(0)
    
    // Drag clip slightly
    const clip = page.locator('.timeline-clip').first()
    await clip.dragTo(page.locator('.timeline-track'), {
      targetPosition: { x: 150, y: 50 }
    })
    
    // Should snap to grid position
    const clipPosition = await clip.getAttribute('data-start-time')
    expect(parseFloat(clipPosition) % 1).toBe(0) // Should be whole number
  })

  test('should show clip duration', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Should show duration for each clip
    await expect(page.locator('.timeline-clip[data-duration="10.0"]')).toBeVisible()
    await expect(page.locator('.timeline-clip[data-duration="8.0"]')).toBeVisible()
  })

  test('should handle overlapping clips', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select first clip
    await timelineHelper.selectClip(0)
    
    // Drag clip to overlap with second clip
    const clip = page.locator('.timeline-clip').first()
    await clip.dragTo(page.locator('.timeline-track'), {
      targetPosition: { x: 300, y: 50 }
    })
    
    // Should show overlap warning
    await expect(page.locator('text=Clips overlap')).toBeVisible()
  })

  test('should show timeline controls', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Should show zoom controls
    await expect(page.locator('[data-testid="zoom-in"]')).toBeVisible()
    await expect(page.locator('[data-testid="zoom-out"]')).toBeVisible()
    
    // Should show snap toggle
    await expect(page.locator('[data-testid="snap-to-grid-toggle"]')).toBeVisible()
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select first clip
    await timelineHelper.selectClip(0)
    
    // Test copy shortcut
    await page.keyboard.press('Control+c')
    
    // Test paste shortcut
    await page.keyboard.press('Control+v')
    
    // Should duplicate clip
    const clipsCount = await timelineHelper.getClipsCount()
    expect(clipsCount).toBe(3)
  })
})
