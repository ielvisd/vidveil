import { test, expect } from '@playwright/test'
import { AuthTestHelpers, ProjectTestHelpers, ExportTestHelpers } from '../helpers/tauri-test'

test.describe('Export Functionality', () => {
  let authHelper: AuthTestHelpers
  let projectHelper: ProjectTestHelpers
  let exportHelper: ExportTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
    projectHelper = new ProjectTestHelpers(page)
    exportHelper = new ExportTestHelpers(page)
    
    // Login and create project
    await authHelper.loginWithTestCredentials()
    await projectHelper.createProject('Export Test Project')
    
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
              metadata: { type: 'screen' },
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
              project_id: 'test-project-id'
            }
          ])
        })
      }
    })
  }

  test('should display export dialog', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-button"]')
    
    // Should show export dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('text=Export Video')).toBeVisible()
  })

  test('should show export presets', async ({ page }) => {
    await exportHelper.openExportDialog()
    
    // Should show preset dropdown
    await expect(page.locator('text=Export Preset')).toBeVisible()
    
    // Should show preset options
    await page.click('[data-testid="preset-dropdown"]')
    await expect(page.locator('text=Web (720p)')).toBeVisible()
    await expect(page.locator('text=YouTube (1080p)')).toBeVisible()
    await expect(page.locator('text=High Quality (1080p)')).toBeVisible()
  })

  test('should select YouTube preset', async ({ page }) => {
    await exportHelper.openExportDialog()
    
    // Select YouTube preset
    await page.click('[data-testid="preset-dropdown"]')
    await page.click('text=YouTube (1080p)')
    
    // Should update settings
    await expect(page.locator('text=YouTube (1080p)')).toBeVisible()
    await expect(page.locator('text=~60MB/min')).toBeVisible()
  })

  test('should show file size estimate', async ({ page }) => {
    await exportHelper.openExportDialog()
    
    // Should show estimated file size
    await expect(page.locator('text=Estimated file size')).toBeVisible()
  })

  test('should show advanced options when expanded', async ({ page }) => {
    await exportHelper.openExportDialog()
    
    // Click advanced options
    await page.click('text=Advanced Options')
    
    // Should show advanced controls
    await expect(page.locator('text=Resolution')).toBeVisible()
    await expect(page.locator('text=Quality')).toBeVisible()
    await expect(page.locator('text=Format')).toBeVisible()
    await expect(page.locator('text=Encoding Preset')).toBeVisible()
  })

  test('should export single clip without PiP', async ({ page }) => {
    // Mock FFmpeg export API
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'exported-video.mp4'
          })
        })
      }
    })

    await exportHelper.openExportDialog()
    
    // Select Web preset
    await page.click('[data-testid="preset-dropdown"]')
    await page.click('text=Web (720p)')
    
    // Set file name
    await page.fill('input[placeholder*="my-video"]', 'test-export.mp4')
    
    // Start export
    await exportHelper.startExport()
    
    // Should show progress
    await expect(page.locator('text=Preparing files...')).toBeVisible()
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
  })

  test('should export with PiP overlay', async ({ page }) => {
    // Mock FFmpeg export with PiP
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'exported-pip-video.mp4',
            pipApplied: true
          })
        })
      }
    })

    await exportHelper.openExportDialog()
    
    // Should show PiP info
    await expect(page.locator('text=PiP overlay will be composited')).toBeVisible()
    
    // Select YouTube preset
    await page.click('[data-testid="preset-dropdown"]')
    await page.click('text=YouTube (1080p)')
    
    // Start export
    await exportHelper.startExport()
    
    // Should show PiP processing steps
    await expect(page.locator('text=Create PiP shape mask')).toBeVisible()
    await expect(page.locator('text=Apply PiP overlay')).toBeVisible()
  })

  test('should show export progress with steps', async ({ page }) => {
    // Mock slow export
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        // Simulate slow export
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'exported-video.mp4'
          })
        })
      }
    })

    await exportHelper.openExportDialog()
    await exportHelper.startExport()
    
    // Should show step progress
    await expect(page.locator('text=Step 1 of')).toBeVisible()
    await expect(page.locator('text=Preparing files...')).toBeVisible()
  })

  test('should show processing time and speed', async ({ page }) => {
    await exportHelper.openExportDialog()
    await exportHelper.startExport()
    
    // Should show time and speed info
    await expect(page.locator('[data-testid="processing-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="processing-speed"]')).toBeVisible()
  })

  test('should allow export cancellation', async ({ page }) => {
    // Mock long-running export
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        // Never resolve to simulate long export
        return new Promise(() => {})
      }
    })

    await exportHelper.openExportDialog()
    await exportHelper.startExport()
    
    // Should show cancel button
    await expect(page.locator('text=Cancel Export')).toBeVisible()
    
    // Click cancel
    await page.click('text=Cancel Export')
    
    // Should cancel export
    await expect(page.locator('text=Export cancelled')).toBeVisible()
  })

  test('should handle export error', async ({ page }) => {
    // Mock export error
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'FFmpeg processing failed'
          })
        })
      }
    })

    await exportHelper.openExportDialog()
    await exportHelper.startExport()
    
    // Should show error
    await expect(page.locator('text=FFmpeg processing failed')).toBeVisible()
  })

  test('should validate file name', async ({ page }) => {
    await exportHelper.openExportDialog()
    
    // Clear file name
    await page.fill('input[placeholder*="my-video"]', '')
    
    // Export button should be disabled
    await expect(page.locator('button:has-text("Export Video")')).toBeDisabled()
  })

  test('should update file extension based on format', async ({ page }) => {
    await exportHelper.openExportDialog()
    
    // Set initial file name
    await page.fill('input[placeholder*="my-video"]', 'test-video.mp4')
    
    // Change to WebM format
    await page.click('text=Advanced Options')
    await page.click('[data-testid="format-dropdown"]')
    await page.click('text=WebM (VP9)')
    
    // File name should update extension
    const fileName = await page.inputValue('input[placeholder*="my-video"]')
    expect(fileName).toBe('test-video.webm')
  })

  test('should show different presets for different use cases', async ({ page }) => {
    await exportHelper.openExportDialog()
    
    // Check all preset options
    await page.click('[data-testid="preset-dropdown"]')
    
    await expect(page.locator('text=Web (720p)')).toBeVisible()
    await expect(page.locator('text=YouTube (1080p)')).toBeVisible()
    await expect(page.locator('text=High Quality (1080p)')).toBeVisible()
    await expect(page.locator('text=Source Quality')).toBeVisible()
    await expect(page.locator('text=Mobile (480p)')).toBeVisible()
    await expect(page.locator('text=WebM (720p)')).toBeVisible()
    await expect(page.locator('text=Animated GIF')).toBeVisible()
    await expect(page.locator('text=Podcast (Audio Only)')).toBeVisible()
  })

  test('should estimate file size correctly', async ({ page }) => {
    await exportHelper.openExportDialog()
    
    // Select different presets and check file size estimates
    await page.click('[data-testid="preset-dropdown"]')
    await page.click('text=Web (720p)')
    await expect(page.locator('text=~15MB/min')).toBeVisible()
    
    await page.click('[data-testid="preset-dropdown"]')
    await page.click('text=YouTube (1080p)')
    await expect(page.locator('text=~60MB/min')).toBeVisible()
    
    await page.click('[data-testid="preset-dropdown"]')
    await page.click('text=Mobile (480p)')
    await expect(page.locator('text=~8MB/min')).toBeVisible()
  })

  test('should complete export successfully', async ({ page }) => {
    // Mock successful export
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            outputPath: 'exported-video.mp4'
          })
        })
      }
    })

    await exportHelper.openExportDialog()
    await exportHelper.startExport()
    
    // Wait for export to complete
    await exportHelper.waitForExportComplete()
    
    // Should show success message
    await expect(page.locator('text=Export complete!')).toBeVisible()
    
    // Should trigger download
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download")')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('exported-video.mp4')
  })

  test('should handle network error during export', async ({ page }) => {
    // Mock network error
    await page.route('**/export*', async route => {
      await route.abort('failed')
    })

    await exportHelper.openExportDialog()
    await exportHelper.startExport()
    
    // Should show network error
    await expect(page.locator('text=Network error')).toBeVisible()
  })

  test('should show export progress for long videos', async ({ page }) => {
    // Mock long video export
    await page.route('**/export*', async route => {
      if (route.request().method() === 'POST') {
        // Simulate progress updates
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          if (progress >= 100) {
            clearInterval(interval)
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                outputPath: 'long-video.mp4'
              })
            })
          }
        }, 100)
      }
    })

    await exportHelper.openExportDialog()
    await exportHelper.startExport()
    
    // Should show progress updates
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
    
    // Progress should increase
    await page.waitForFunction(() => {
      const progressBar = document.querySelector('[data-testid="progress-bar"] .progress-fill')
      return progressBar && parseInt(progressBar.style.width) > 0
    })
  })
})
