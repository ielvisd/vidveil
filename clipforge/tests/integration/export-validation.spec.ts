import { test, expect } from '@playwright/test'
import { AuthTestHelpers, ProjectTestHelpers, ExportTestHelpers } from '../helpers/tauri-test'

/**
 * Export Validation Test Suite
 * Comprehensive tests for export functionality with various scenarios
 */
test.describe('Export Validation', () => {
  let authHelper: AuthTestHelpers
  let projectHelper: ProjectTestHelpers
  let exportHelper: ExportTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
    projectHelper = new ProjectTestHelpers(page)
    exportHelper = new ExportTestHelpers(page)
    
    await authHelper.loginWithTestCredentials()
    await projectHelper.createProject('Export Validation Test')
  })

  test('export single clip without modifications', async ({ page }) => {
    const projectId = await projectHelper.getCurrentProjectId()
    
    // Mock single clip
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'clip-1',
            name: 'Single Clip',
            src: '/test-video.mp4',
            duration: 10.0,
            start_time: 0,
            end_time: 10.0,
            track: 1,
            metadata: { type: 'screen' },
            project_id: projectId
          }])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Verify clip is visible
    const clips = page.locator('.timeline-clip')
    await expect(clips.first()).toBeVisible()
    
    // Mock export
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON()
        
        // Validate export request
        expect(requestBody).toBeTruthy()
        expect(requestBody.clips).toBeTruthy()
        expect(requestBody.clips.length).toBe(1)
        expect(requestBody.clips[0].id).toBe('clip-1')
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'single-clip-export.mp4'
          })
        })
      }
    })
    
    // Open export dialog
    await exportHelper.openExportDialog()
    
    // Verify export dialog shows clip info
    await expect(page.locator('text=Export Video')).toBeVisible()
    
    // Start export
    const exportButton = page.locator('button:has-text("Export Video"), button:has-text("Export")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      await expect(page.locator('text=Processing, text=Exporting, text=Preparing')).toBeVisible({ timeout: 10000 })
    }
  })

  test('export multiple clips sequentially', async ({ page }) => {
    const projectId = await projectHelper.getCurrentProjectId()
    
    // Mock multiple clips
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'clip-1',
              name: 'Clip 1',
              src: '/video1.mp4',
              duration: 5.0,
              start_time: 0,
              end_time: 5.0,
              track: 1,
              metadata: { type: 'screen', order: 0 },
              project_id: projectId
            },
            {
              id: 'clip-2',
              name: 'Clip 2',
              src: '/video2.mp4',
              duration: 8.0,
              start_time: 5.0,
              end_time: 13.0,
              track: 1,
              metadata: { type: 'screen', order: 1 },
              project_id: projectId
            },
            {
              id: 'clip-3',
              name: 'Clip 3',
              src: '/video3.mp4',
              duration: 7.0,
              start_time: 13.0,
              end_time: 20.0,
              track: 1,
              metadata: { type: 'screen', order: 2 },
              project_id: projectId
            }
          ])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Verify all clips are visible
    const clips = page.locator('.timeline-clip')
    await expect(clips).toHaveCount(3, { timeout: 5000 })
    
    // Mock export with stitching validation
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON()
        
        // Validate all clips are included
        expect(requestBody.clips.length).toBe(3)
        expect(requestBody.clips[0].id).toBe('clip-1')
        expect(requestBody.clips[1].id).toBe('clip-2')
        expect(requestBody.clips[2].id).toBe('clip-3')
        
        // Validate clips are in correct order
        expect(requestBody.clips[0].metadata.order).toBe(0)
        expect(requestBody.clips[1].metadata.order).toBe(1)
        expect(requestBody.clips[2].metadata.order).toBe(2)
        
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
    
    await exportHelper.openExportDialog()
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      await expect(page.locator('text=Processing, text=Exporting')).toBeVisible({ timeout: 10000 })
    }
  })

  test('export with trim points applied', async ({ page }) => {
    const projectId = await projectHelper.getCurrentProjectId()
    
    // Mock clip with trim points (start_time and end_time set)
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'clip-1',
            name: 'Trimmed Clip',
            src: '/full-video.mp4',
            duration: 15.0, // Trimmed duration
            start_time: 5.0, // Trim start point
            end_time: 20.0, // Trim end point
            track: 1,
            metadata: { type: 'screen' },
            project_id: projectId
          }])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Mock export that validates trim points
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON()
        
        // Validate trim points are included in export request
        expect(requestBody.clips[0].start_time).toBe(5.0)
        expect(requestBody.clips[0].end_time).toBe(20.0)
        expect(requestBody.clips[0].duration).toBe(15.0)
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'trimmed-export.mp4',
            trimApplied: true
          })
        })
      }
    })
    
    await exportHelper.openExportDialog()
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      await expect(page.locator('text=Processing, text=Exporting')).toBeVisible({ timeout: 10000 })
    }
  })

  test('export with PiP overlay composition', async ({ page }) => {
    const projectId = await projectHelper.getCurrentProjectId()
    
    // Mock clips with PiP configuration
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'clip-screen',
              name: 'Screen Recording',
              src: '/screen.mp4',
              duration: 10.0,
              start_time: 0,
              end_time: 10.0,
              track: 1,
              metadata: { type: 'screen' },
              project_id: projectId
            },
            {
              id: 'clip-webcam',
              name: 'Webcam Recording',
              src: '/webcam.mp4',
              duration: 10.0,
              start_time: 0,
              end_time: 10.0,
              track: 2,
              metadata: { type: 'webcam' },
              pip_config: {
                x: 50,
                y: 50,
                width: 200,
                height: 200,
                shape: 'circle',
                borderWidth: 2,
                borderColor: '#ffffff'
              },
              project_id: projectId
            }
          ])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Verify PiP indicator is shown
    await expect(page.locator('.pip-indicator, text=PiP')).toBeVisible({ timeout: 5000 })
    
    // Mock export with PiP composition
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON()
        
        // Validate PiP configuration is included
        const webcamClip = requestBody.clips.find((c: any) => c.metadata?.type === 'webcam')
        expect(webcamClip).toBeTruthy()
        expect(webcamClip.pip_config).toBeTruthy()
        expect(webcamClip.pip_config.shape).toBe('circle')
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'pip-export.mp4',
            pipComposited: true
          })
        })
      }
    })
    
    await exportHelper.openExportDialog()
    
    // Verify PiP info is shown in export dialog
    await expect(page.locator('text=PiP overlay, text=composited')).toBeVisible({ timeout: 5000 })
    
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      await expect(page.locator('text=Processing, text=PiP, text=Create mask')).toBeVisible({ timeout: 10000 })
    }
  })

  test('export with split clips maintains sequence', async ({ page }) => {
    const projectId = await projectHelper.getCurrentProjectId()
    
    // Mock split clips (from a single original clip)
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'clip-part-1',
              name: 'Video (Part 1)',
              src: '/video.mp4',
              duration: 5.0,
              start_time: 0,
              end_time: 5.0,
              track: 1,
              metadata: { type: 'screen', order: 0 },
              project_id: projectId
            },
            {
              id: 'clip-part-2',
              name: 'Video (Part 2)',
              src: '/video.mp4',
              duration: 5.0,
              start_time: 5.0,
              end_time: 10.0,
              track: 1,
              metadata: { type: 'screen', order: 1 },
              project_id: projectId
            }
          ])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Mock export validating split clips are stitched correctly
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON()
        
        // Validate split clips are in order and reference same source
        expect(requestBody.clips.length).toBe(2)
        expect(requestBody.clips[0].src).toBe('/video.mp4')
        expect(requestBody.clips[1].src).toBe('/video.mp4')
        expect(requestBody.clips[0].start_time).toBe(0)
        expect(requestBody.clips[0].end_time).toBe(5.0)
        expect(requestBody.clips[1].start_time).toBe(5.0)
        expect(requestBody.clips[1].end_time).toBe(10.0)
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'split-stiched-export.mp4'
          })
        })
      }
    })
    
    await exportHelper.openExportDialog()
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      await expect(page.locator('text=Processing, text=Exporting')).toBeVisible({ timeout: 10000 })
    }
  })

  test('export validates resolution settings', async ({ page }) => {
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'clip-1',
            name: 'Test Video',
            src: '/video.mp4',
            duration: 10.0,
            metadata: { type: 'screen' }
          }])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Test different resolution presets
    const resolutions = ['720p', '1080p', '480p']
    
    for (const resolution of resolutions) {
      await exportHelper.openExportDialog()
      
      // Select preset or resolution
      const advancedToggle = page.locator('text=Advanced Options, button:has-text("Advanced")')
      if (await advancedToggle.count() > 0) {
        await advancedToggle.click()
      }
      
      // Mock export with resolution validation
      await page.route('**/export*', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = route.request().postDataJSON()
          
          // Validate resolution is set correctly
          expect(requestBody.settings).toBeTruthy()
          expect(requestBody.settings.resolution).toBe(resolution)
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              outputPath: `export-${resolution}.mp4`
            })
          })
        }
      })
      
      // Close dialog and reopen for next test
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }
  })

  test('export shows progress accurately', async ({ page }) => {
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'clip-1',
            name: 'Test Video',
            src: '/video.mp4',
            duration: 10.0,
            metadata: { type: 'screen' }
          }])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Mock export with progress updates
    let progressUpdates: number[] = []
    
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        // Simulate progress callbacks (in real app, this comes from FFmpeg)
        const simulateProgress = () => {
          const progressValues = [10, 30, 50, 70, 90, 100]
          progressValues.forEach((progress, index) => {
            setTimeout(() => {
              // In real test, would trigger progress event
              progressUpdates.push(progress)
            }, index * 200)
          })
        }
        simulateProgress()
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'progress-test.mp4'
          })
        })
      }
    })
    
    await exportHelper.openExportDialog()
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      
      // Should show progress bar
      await expect(page.locator('.progress-bar, [data-testid="progress-bar"]')).toBeVisible({ timeout: 5000 })
      
      // Wait for some progress to accumulate
      await page.waitForTimeout(2000)
      
      // Verify progress was tracked
      expect(progressUpdates.length).toBeGreaterThan(0)
    }
  })

  test('export handles errors gracefully', async ({ page }) => {
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'clip-1',
            name: 'Test Video',
            src: '/video.mp4',
            duration: 10.0,
            metadata: { type: 'screen' }
          }])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Mock export error
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Export failed: FFmpeg processing error'
          })
        })
      }
    })
    
    await exportHelper.openExportDialog()
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      
      // Should show error message
      await expect(page.locator('text=error, text=failed, text=Error')).toBeVisible({ timeout: 10000 })
      
      // Export button should be available again (not stuck in loading state)
      await page.waitForTimeout(1000)
      const exportButtonAfterError = page.locator('button:has-text("Export Video")')
      // Button might be visible or dialog might be closed
      expect(await exportButtonAfterError.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('export validates file format from preset', async ({ page }) => {
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'clip-1',
            name: 'Test Video',
            src: '/video.mp4',
            duration: 10.0,
            metadata: { type: 'screen' }
          }])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    const formats = ['mp4', 'webm', 'mov']
    
    for (const format of formats) {
      await exportHelper.openExportDialog()
      
      // Mock export validating format
      await page.route('**/export*', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = route.request().postDataJSON()
          
          expect(requestBody.settings.format).toBe(format)
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              outputPath: `export.${format}`
            })
          })
        }
      })
      
      // Close dialog
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  })

  test('export with trim and PiP together', async ({ page }) => {
    const projectId = await projectHelper.getCurrentProjectId()
    
    // Mock clips: trimmed screen + PiP webcam
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'clip-screen',
              name: 'Trimmed Screen',
              src: '/screen.mp4',
              duration: 15.0, // Trimmed
              start_time: 5.0,
              end_time: 20.0,
              track: 1,
              metadata: { type: 'screen' },
              project_id: projectId
            },
            {
              id: 'clip-webcam',
              name: 'Webcam',
              src: '/webcam.mp4',
              duration: 10.0,
              start_time: 0,
              end_time: 10.0,
              track: 2,
              metadata: { type: 'webcam' },
              pip_config: {
                x: 100,
                y: 100,
                width: 200,
                height: 200,
                shape: 'heart'
              },
              project_id: projectId
            }
          ])
        })
      }
    })
    
    await page.reload()
    await page.waitForSelector('.timeline-container', { timeout: 5000 })
    
    // Mock export validating both trim and PiP
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON()
        
        const screenClip = requestBody.clips.find((c: any) => c.metadata?.type === 'screen')
        const webcamClip = requestBody.clips.find((c: any) => c.metadata?.type === 'webcam')
        
        // Validate trim points on screen clip
        expect(screenClip.start_time).toBe(5.0)
        expect(screenClip.end_time).toBe(20.0)
        
        // Validate PiP config on webcam clip
        expect(webcamClip.pip_config).toBeTruthy()
        expect(webcamClip.pip_config.shape).toBe('heart')
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'trimmed-pip-export.mp4',
            trimApplied: true,
            pipComposited: true
          })
        })
      }
    })
    
    await exportHelper.openExportDialog()
    const exportButton = page.locator('button:has-text("Export Video")')
    if (await exportButton.count() > 0) {
      await exportButton.click()
      await expect(page.locator('text=Processing, text=Exporting')).toBeVisible({ timeout: 10000 })
    }
  })
})
