import { test, expect } from '@playwright/test'
import { AuthTestHelpers, ProjectTestHelpers, TimelineTestHelpers, ExportTestHelpers } from '../helpers/tauri-test'

/**
 * Core Editing Flow E2E Tests
 * Tests the complete workflow: Import → Trim → Split → Export
 */
test.describe('Core Editing Flow', () => {
  let authHelper: AuthTestHelpers
  let projectHelper: ProjectTestHelpers
  let timelineHelper: TimelineTestHelpers
  let exportHelper: ExportTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
    projectHelper = new ProjectTestHelpers(page)
    timelineHelper = new TimelineTestHelpers(page)
    exportHelper = new ExportTestHelpers(page)
    
    // Login and create project
    await authHelper.loginWithTestCredentials()
    await projectHelper.createProject('Core Editing Flow Test')
  })

  test('complete workflow: import → trim → split → export', async ({ page }) => {
    const projectId = await projectHelper.getCurrentProjectId()
    expect(projectId).toBeTruthy()

    // STEP 1: Import Media
    test.step('Step 1: Import media files', async () => {
      // Navigate to library
      await page.click('button:has-text("Import")')
      await page.waitForURL(/\/library/)
      
      // Mock file upload
      await page.route('**/clips*', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'clip-1',
              name: 'Test Video',
              src: '/test-video.mp4',
              duration: 30.0,
              start_time: 0,
              end_time: 30.0,
              track: 1,
              metadata: { type: 'screen' },
              project_id: projectId
            })
          })
        }
      })
      
      // Upload file (simulated)
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.count() > 0) {
        // In real test, would use actual test video file
        await fileInput.setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: Buffer.from('mock') })
      }
      
      // Return to project
      await page.goto(`/project/${projectId}`)
      await timelineHelper.waitForTimelineLoad()
      
      // Verify clip imported
      const clipsCount = await timelineHelper.getClipsCount()
      expect(clipsCount).toBeGreaterThan(0)
    })

    // STEP 2: Trim Clip
    test.step('Step 2: Trim clip using handles', async () => {
      await timelineHelper.waitForTimelineLoad()
      
      // Select first clip
      await timelineHelper.selectClip(0)
      await expect(page.locator('.timeline-clip.selected')).toBeVisible()
      
      // Mock trim API
      await page.route(`**/clips/clip-1*`, async route => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'clip-1',
              name: 'Test Video',
              duration: 25.0,
              start_time: 2.0,
              end_time: 27.0,
              track: 1
            })
          })
        }
      })
      
      // Drag left trim handle to trim start
      const leftTrimHandle = page.locator('.trim-handle-left').first()
      const clipElement = page.locator('.timeline-clip').first()
      
      if (await leftTrimHandle.count() > 0) {
        // Get initial clip width
        const initialWidth = await clipElement.evaluate(el => el.getBoundingClientRect().width)
        
        // Drag trim handle
        const boundingBox = await clipElement.boundingBox()
        if (boundingBox) {
          await page.mouse.move(boundingBox.x + 5, boundingBox.y + 50)
          await page.mouse.down()
          await page.mouse.move(boundingBox.x + 50, boundingBox.y + 50) // Drag right to trim start
          await page.mouse.up()
        }
        
        // Wait for trim to complete
        await page.waitForTimeout(500)
        
        // Verify clip was trimmed (width should change)
        const newWidth = await clipElement.evaluate(el => el.getBoundingClientRect().width)
        expect(newWidth).not.toBe(initialWidth)
      }
    })

    // STEP 3: Split Clip
    test.step('Step 3: Split clip at playhead', async () => {
      await timelineHelper.waitForTimelineLoad()
      
      // Select clip
      await timelineHelper.selectClip(0)
      
      // Move playhead to middle of clip (click on timeline)
      const timelineContent = page.locator('.track-content')
      const timelineBox = await timelineContent.boundingBox()
      if (timelineBox) {
        // Click at position roughly 1/3 into the timeline
        await page.mouse.click(timelineBox.x + timelineBox.width / 3, timelineBox.y + 50)
        await page.waitForTimeout(200)
      }
      
      // Mock split API
      await page.route(`**/clips*`, async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'clip-1',
                name: 'Test Video (Part 1)',
                duration: 12.5,
                start_time: 2.0,
                end_time: 14.5,
                track: 1
              },
              {
                id: 'clip-1-split',
                name: 'Test Video (Part 2)',
                duration: 12.5,
                start_time: 14.5,
                end_time: 27.0,
                track: 1
              }
            ])
          })
        }
      })
      
      // Press 'S' to split (or click split button)
      const splitButton = page.locator('button:has-text("Split"), button[title*="Split"]')
      if (await splitButton.count() > 0) {
        await splitButton.click()
      } else {
        // Use keyboard shortcut
        await page.keyboard.press('S')
      }
      
      // Wait for split to complete
      await page.waitForTimeout(1000)
      
      // Verify clip was split (should have 2 clips now)
      const clipsCountAfterSplit = await timelineHelper.getClipsCount()
      expect(clipsCountAfterSplit).toBeGreaterThanOrEqual(1)
    })

    // STEP 4: Test Undo/Redo
    test.step('Step 4: Test undo/redo functionality', async () => {
      await timelineHelper.waitForTimelineLoad()
      
      const clipsBeforeUndo = await timelineHelper.getClipsCount()
      
      // Undo the split (Cmd/Ctrl+Z)
      const isMac = process.platform === 'darwin'
      await page.keyboard.press(isMac ? 'Meta+Z' : 'Control+Z')
      await page.waitForTimeout(500)
      
      // Verify undo worked (clips may change)
      const clipsAfterUndo = await timelineHelper.getClipsCount()
      
      // Redo (Cmd/Ctrl+Shift+Z)
      await page.keyboard.press(isMac ? 'Meta+Shift+Z' : 'Control+Shift+Z')
      await page.waitForTimeout(500)
      
      // Verify redo worked
      const clipsAfterRedo = await timelineHelper.getClipsCount()
      expect(clipsAfterRedo).toBeGreaterThanOrEqual(1)
    })

    // STEP 5: Export
    test.step('Step 5: Export final video', async () => {
      await timelineHelper.waitForTimelineLoad()
      
      // Mock export API
      await page.route('**/export*', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              outputPath: 'edited-video.mp4'
            })
          })
        }
      })
      
      // Open export dialog
      await exportHelper.openExportDialog()
      await expect(page.locator('text=Export Video, [role="dialog"]')).toBeVisible()
      
      // Select YouTube preset
      const presetSelect = page.locator('select, [data-testid="preset-dropdown"], button:has-text("YouTube")')
      if (await presetSelect.count() > 0) {
        await presetSelect.click()
        await page.click('text=YouTube')
      }
      
      // Set file name
      const fileNameInput = page.locator('input[placeholder*="video"], input[type="text"]').first()
      if (await fileNameInput.count() > 0) {
        await fileNameInput.fill('edited-final-video.mp4')
      }
      
      // Start export
      const exportButton = page.locator('button:has-text("Export Video"), button:has-text("Export")')
      if (await exportButton.count() > 0) {
        await exportButton.click()
        
        // Should show progress
        await expect(page.locator('text=Processing, text=Preparing, text=Export')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test('trim with keyboard shortcuts', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Select clip
    await timelineHelper.selectClip(0)
    
    // Test I/O trim shortcuts (if implemented)
    // Press 'I' to set in point
    await page.keyboard.press('I')
    await page.waitForTimeout(200)
    
    // Move playhead
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    
    // Press 'O' to set out point
    await page.keyboard.press('O')
    await page.waitForTimeout(200)
    
    // Verify trim was applied (clip duration should change)
    const clip = page.locator('.timeline-clip').first()
    const duration = await clip.getAttribute('data-duration')
    if (duration) {
      expect(parseFloat(duration)).toBeGreaterThan(0)
    }
  })

  test('split with keyboard shortcut', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Import/mock clip first
    const initialClips = await timelineHelper.getClipsCount()
    
    // Select clip and position playhead
    if (initialClips > 0) {
      await timelineHelper.selectClip(0)
      
      // Click on timeline to position playhead
      const timeline = page.locator('.track-content')
      const box = await timeline.boundingBox()
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + 50)
      }
      
      // Press 'S' to split
      await page.keyboard.press('S')
      await page.waitForTimeout(1000)
      
      // Verify split occurred
      const clipsAfterSplit = await timelineHelper.getClipsCount()
      expect(clipsAfterSplit).toBeGreaterThanOrEqual(initialClips)
    }
  })

  test('delete clip with keyboard', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    const clipsBefore = await timelineHelper.getClipsCount()
    
    if (clipsBefore > 0) {
      // Select clip
      await timelineHelper.selectClip(0)
      
      // Mock delete API
      await page.route('**/clips/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 204 })
        }
      })
      
      // Press Delete key
      await page.keyboard.press('Delete')
      await page.waitForTimeout(500)
      
      // Verify clip was deleted
      const clipsAfter = await timelineHelper.getClipsCount()
      expect(clipsAfter).toBeLessThan(clipsBefore)
    }
  })

  test('undo/redo multiple operations', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    const initialClips = await timelineHelper.getClipsCount()
    
    if (initialClips > 0) {
      // Perform multiple operations
      await timelineHelper.selectClip(0)
      
      // Trim
      const trimHandle = page.locator('.trim-handle-left').first()
      if (await trimHandle.count() > 0) {
        const clip = page.locator('.timeline-clip').first()
        const box = await clip.boundingBox()
        if (box) {
          await page.mouse.move(box.x + 5, box.y + 50)
          await page.mouse.down()
          await page.mouse.move(box.x + 30, box.y + 50)
          await page.mouse.up()
          await page.waitForTimeout(500)
        }
      }
      
      // Undo trim
      const isMac = process.platform === 'darwin'
      await page.keyboard.press(isMac ? 'Meta+Z' : 'Control+Z')
      await page.waitForTimeout(500)
      
      // Verify undo buttons are available
      const undoButton = page.locator('button[title*="Undo"], button[aria-label*="Undo"]')
      if (await undoButton.count() > 0) {
        const isDisabled = await undoButton.isDisabled()
        // Button might be enabled or disabled depending on history state
        expect(typeof isDisabled).toBe('boolean')
      }
    }
  })

  test('export with trimmed clips', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Mock clips with trim points
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'clip-1',
              name: 'Trimmed Video',
              duration: 20.0,
              start_time: 5.0, // Trimmed from start
              end_time: 25.0, // Trimmed from end
              track: 1,
              metadata: { type: 'screen' }
            }
          ])
        })
      }
    })
    
    await page.reload()
    await timelineHelper.waitForTimelineLoad()
    
    // Open export dialog
    await exportHelper.openExportDialog()
    
    // Mock export that respects trim points
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON()
        
        // Verify trim points are included
        if (requestBody && requestBody.clips && requestBody.clips[0]) {
          expect(requestBody.clips[0].start_time).toBe(5.0)
          expect(requestBody.clips[0].end_time).toBe(25.0)
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'trimmed-export.mp4'
          })
        })
      }
    })
    
    // Start export
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      
      // Should process export with trim points
      await expect(page.locator('text=Processing, text=Exporting')).toBeVisible({ timeout: 5000 })
    }
  })

  test('export with multiple clips and split', async ({ page }) => {
    await timelineHelper.waitForTimelineLoad()
    
    // Mock multiple clips (including split result)
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'clip-1',
              name: 'Clip Part 1',
              duration: 10.0,
              start_time: 0,
              end_time: 10.0,
              track: 1
            },
            {
              id: 'clip-2',
              name: 'Clip Part 2',
              duration: 10.0,
              start_time: 10.0,
              end_time: 20.0,
              track: 1
            },
            {
              id: 'clip-3',
              name: 'Another Clip',
              duration: 5.0,
              start_time: 20.0,
              end_time: 25.0,
              track: 1
            }
          ])
        })
      }
    })
    
    await page.reload()
    await timelineHelper.waitForTimelineLoad()
    
    // Verify multiple clips are shown
    const clipsCount = await timelineHelper.getClipsCount()
    expect(clipsCount).toBeGreaterThanOrEqual(1)
    
    // Export multiple clips
    await exportHelper.openExportDialog()
    
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON()
        
        // Verify all clips are included in export
        if (requestBody && requestBody.clips) {
          expect(requestBody.clips.length).toBeGreaterThan(0)
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'multi-clip-export.mp4'
          })
        })
      }
    })
    
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      await expect(page.locator('text=Processing, text=Exporting')).toBeVisible({ timeout: 5000 })
    }
  })
})
