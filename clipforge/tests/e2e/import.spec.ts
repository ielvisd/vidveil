import { test, expect } from '@playwright/test'
import { AuthTestHelpers, ProjectTestHelpers, VideoTestHelpers } from '../helpers/tauri-test'

test.describe('Video Import', () => {
  let authHelper: AuthTestHelpers
  let projectHelper: ProjectTestHelpers
  let videoHelper: VideoTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
    projectHelper = new ProjectTestHelpers(page)
    videoHelper = new VideoTestHelpers(page)
    
    // Login and create project
    await authHelper.loginWithTestCredentials()
    await projectHelper.createProject('Import Test Project')
  })

  test('should display media library', async ({ page }) => {
    await expect(page.locator('[data-testid="media-library"]')).toBeVisible()
    await expect(page.locator('text=Media Library')).toBeVisible()
    await expect(page.locator('[data-testid="import-button"]')).toBeVisible()
  })

  test('should import video via file picker', async ({ page }) => {
    // Mock file upload API
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-1',
            name: 'sample-screen.mp4',
            src: '/uploads/sample-screen.mp4',
            duration: 5.0,
            project_id: 'test-project-id',
            created_at: new Date().toISOString()
          })
        })
      }
    })

    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Upload test video
    await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-screen.mp4')
    
    // Should show success message
    await expect(page.locator('text=Video imported successfully')).toBeVisible()
    
    // Should add clip to timeline
    await expect(page.locator('.timeline-clip')).toBeVisible()
  })

  test('should import video via drag and drop', async ({ page }) => {
    // Mock file upload API
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-1',
            name: 'sample-screen.mp4',
            src: '/uploads/sample-screen.mp4',
            duration: 5.0,
            project_id: 'test-project-id',
            created_at: new Date().toISOString()
          })
        })
      }
    })

    // Get the drop zone
    const dropZone = page.locator('[data-testid="drop-zone"]')
    
    // Simulate drag and drop
    await dropZone.dispatchEvent('dragover')
    await dropZone.dispatchEvent('drop', {
      dataTransfer: {
        files: ['tests/fixtures/test-videos/sample-screen.mp4']
      }
    })
    
    // Should show success message
    await expect(page.locator('text=Video imported successfully')).toBeVisible()
    
    // Should add clip to timeline
    await expect(page.locator('.timeline-clip')).toBeVisible()
  })

  test('should show drag and drop visual feedback', async ({ page }) => {
    const dropZone = page.locator('[data-testid="drop-zone"]')
    
    // Simulate drag over
    await dropZone.dispatchEvent('dragover')
    
    // Should show visual feedback
    await expect(dropZone).toHaveClass(/drag-over/)
    await expect(page.locator('text=Drop video files here')).toBeVisible()
  })

  test('should validate file format', async ({ page }) => {
    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Try to upload invalid file
    await videoHelper.uploadTestVideo('tests/fixtures/invalid-file.txt')
    
    // Should show error message
    await expect(page.locator('text=Invalid file format')).toBeVisible()
    await expect(page.locator('text=Please select a video file')).toBeVisible()
  })

  test('should validate file size', async ({ page }) => {
    // Mock large file
    const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large-video.mp4', {
      type: 'video/mp4'
    })

    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Try to upload large file
    await page.locator('input[type="file"]').setInputFiles([largeFile])
    
    // Should show error message
    await expect(page.locator('text=File too large')).toBeVisible()
    await expect(page.locator('text=Maximum file size is 50MB')).toBeVisible()
  })

  test('should show import progress', async ({ page }) => {
    // Mock slow upload
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-1',
            name: 'sample-screen.mp4',
            src: '/uploads/sample-screen.mp4',
            duration: 5.0,
            project_id: 'test-project-id',
            created_at: new Date().toISOString()
          })
        })
      }
    })

    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Upload test video
    await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-screen.mp4')
    
    // Should show progress
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible()
    await expect(page.locator('text=Importing...')).toBeVisible()
  })

  test('should handle import error', async ({ page }) => {
    // Mock import error
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to import video'
          })
        })
      }
    })

    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Upload test video
    await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-screen.mp4')
    
    // Should show error message
    await expect(page.locator('text=Failed to import video')).toBeVisible()
  })

  test('should import multiple videos', async ({ page }) => {
    // Mock multiple file uploads
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `clip-${Date.now()}`,
            name: 'sample-screen.mp4',
            src: '/uploads/sample-screen.mp4',
            duration: 5.0,
            project_id: 'test-project-id',
            created_at: new Date().toISOString()
          })
        })
      }
    })

    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Upload multiple videos
    await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-screen.mp4')
    await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-webcam.mp4')
    
    // Should show success messages
    await expect(page.locator('text=Video imported successfully')).toBeVisible()
    
    // Should add clips to timeline
    await expect(page.locator('.timeline-clip')).toHaveCount(2)
  })

  test('should show video thumbnail', async ({ page }) => {
    // Mock file upload with thumbnail
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-1',
            name: 'sample-screen.mp4',
            src: '/uploads/sample-screen.mp4',
            thumbnail: '/thumbnails/sample-screen.jpg',
            duration: 5.0,
            project_id: 'test-project-id',
            created_at: new Date().toISOString()
          })
        })
      }
    })

    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Upload test video
    await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-screen.mp4')
    
    // Should show thumbnail
    await expect(page.locator('[data-testid="clip-thumbnail"]')).toBeVisible()
  })

  test('should extract video metadata', async ({ page }) => {
    // Mock file upload with metadata
    await page.route('**/clips*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'clip-1',
            name: 'sample-screen.mp4',
            src: '/uploads/sample-screen.mp4',
            duration: 5.0,
            width: 1280,
            height: 720,
            fps: 30,
            bitrate: 2000000,
            project_id: 'test-project-id',
            created_at: new Date().toISOString()
          })
        })
      }
    })

    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Upload test video
    await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-screen.mp4')
    
    // Should show metadata
    await expect(page.locator('text=5.0s')).toBeVisible()
    await expect(page.locator('text=1280x720')).toBeVisible()
    await expect(page.locator('text=30fps')).toBeVisible()
  })

  test('should handle network error during import', async ({ page }) => {
    // Mock network error
    await page.route('**/clips*', async route => {
      await route.abort('failed')
    })

    // Click import button
    await page.click('[data-testid="import-button"]')
    
    // Upload test video
    await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-screen.mp4')
    
    // Should show network error
    await expect(page.locator('text=Network error')).toBeVisible()
    await expect(page.locator('text=Please check your connection')).toBeVisible()
  })
})
