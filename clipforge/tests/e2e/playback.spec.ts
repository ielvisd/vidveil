import { test, expect } from '@playwright/test'
import { AuthTestHelpers, ProjectTestHelpers, VideoTestHelpers } from '../helpers/tauri-test'

test.describe('Video Playback', () => {
  let authHelper: AuthTestHelpers
  let projectHelper: ProjectTestHelpers
  let videoHelper: VideoTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthTestHelpers(page)
    projectHelper = new ProjectTestHelpers(page)
    videoHelper = new VideoTestHelpers(page)
    
    // Login and create project
    await authHelper.loginWithTestCredentials()
    await projectHelper.createProject('Playback Test Project')
    
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
            }
          ])
        })
      }
    })
  }

  test('should display video preview', async ({ page }) => {
    // Should show video preview container
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible()
    
    // Should show video element
    await expect(page.locator('video')).toBeVisible()
  })

  test('should load video metadata', async ({ page }) => {
    // Wait for video to load
    await videoHelper.waitForVideoLoad()
    
    // Should show video duration
    const duration = await videoHelper.getVideoDuration()
    expect(duration).toBeGreaterThan(0)
    
    // Should show duration in UI
    await expect(page.locator('[data-testid="video-duration"]')).toBeVisible()
  })

  test('should play video when play button clicked', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Click play button
    await page.click('[data-testid="play-button"]')
    
    // Should start playing
    await videoHelper.playVideo()
    
    // Should show pause button
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible()
  })

  test('should pause video when pause button clicked', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Start playing
    await page.click('[data-testid="play-button"]')
    await videoHelper.playVideo()
    
    // Click pause button
    await page.click('[data-testid="pause-button"]')
    
    // Should pause
    await videoHelper.pauseVideo()
    
    // Should show play button
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible()
  })

  test('should toggle play/pause with spacebar', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Press spacebar to play
    await page.keyboard.press(' ')
    await videoHelper.playVideo()
    
    // Press spacebar to pause
    await page.keyboard.press(' ')
    await videoHelper.pauseVideo()
  })

  test('should seek to specific time', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Click on progress bar
    await page.click('[data-testid="progress-bar"]', { position: { x: 100, y: 10 } })
    
    // Should seek to new position
    const currentTime = await videoHelper.getVideoDuration()
    expect(currentTime).toBeGreaterThan(0)
  })

  test('should show current time', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Should show current time display
    await expect(page.locator('[data-testid="current-time"]')).toBeVisible()
    
    // Should show time in MM:SS format
    await expect(page.locator('[data-testid="current-time"]')).toMatchText(/^\d{1,2}:\d{2}$/)
  })

  test('should show progress bar', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Should show progress bar
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
    
    // Should show progress indicator
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible()
  })

  test('should update progress bar during playback', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Start playing
    await page.click('[data-testid="play-button"]')
    await videoHelper.playVideo()
    
    // Wait a bit
    await page.waitForTimeout(1000)
    
    // Progress bar should have moved
    const progress = await page.locator('[data-testid="progress-indicator"]').getAttribute('style')
    expect(progress).toContain('left:')
  })

  test('should handle video end', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Seek to near end
    await videoHelper.seekToTime(9.5)
    
    // Start playing
    await page.click('[data-testid="play-button"]')
    await videoHelper.playVideo()
    
    // Wait for video to end
    await page.waitForTimeout(1000)
    
    // Should show play button again
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible()
  })

  test('should show volume controls', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Should show volume button
    await expect(page.locator('[data-testid="volume-button"]')).toBeVisible()
    
    // Should show volume slider when clicked
    await page.click('[data-testid="volume-button"]')
    await expect(page.locator('[data-testid="volume-slider"]')).toBeVisible()
  })

  test('should adjust volume', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Open volume controls
    await page.click('[data-testid="volume-button"]')
    
    // Adjust volume
    await page.locator('[data-testid="volume-slider"]').fill('0.5')
    
    // Should update volume
    const volume = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement
      return video ? video.volume : 0
    })
    expect(volume).toBe(0.5)
  })

  test('should mute/unmute video', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Click mute button
    await page.click('[data-testid="mute-button"]')
    
    // Should mute video
    const muted = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement
      return video ? video.muted : false
    })
    expect(muted).toBe(true)
    
    // Click unmute button
    await page.click('[data-testid="unmute-button"]')
    
    // Should unmute video
    const unmuted = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement
      return video ? video.muted : true
    })
    expect(unmuted).toBe(false)
  })

  test('should show fullscreen button', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Should show fullscreen button
    await expect(page.locator('[data-testid="fullscreen-button"]')).toBeVisible()
  })

  test('should enter fullscreen mode', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Click fullscreen button
    await page.click('[data-testid="fullscreen-button"]')
    
    // Should enter fullscreen
    const isFullscreen = await page.evaluate(() => {
      return document.fullscreenElement !== null
    })
    expect(isFullscreen).toBe(true)
  })

  test('should exit fullscreen mode', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Enter fullscreen
    await page.click('[data-testid="fullscreen-button"]')
    
    // Exit fullscreen with Escape key
    await page.keyboard.press('Escape')
    
    // Should exit fullscreen
    const isFullscreen = await page.evaluate(() => {
      return document.fullscreenElement !== null
    })
    expect(isFullscreen).toBe(false)
  })

  test('should show playback speed controls', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Should show speed button
    await expect(page.locator('[data-testid="speed-button"]')).toBeVisible()
    
    // Should show speed options when clicked
    await page.click('[data-testid="speed-button"]')
    await expect(page.locator('[data-testid="speed-menu"]')).toBeVisible()
  })

  test('should change playback speed', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Open speed menu
    await page.click('[data-testid="speed-button"]')
    
    // Select 2x speed
    await page.click('[data-testid="speed-2x"]')
    
    // Should update playback rate
    const playbackRate = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement
      return video ? video.playbackRate : 1
    })
    expect(playbackRate).toBe(2)
  })

  test('should show loading state', async ({ page }) => {
    // Should show loading spinner initially
    await expect(page.locator('[data-testid="video-loading"]')).toBeVisible()
    
    // Should hide loading when video loads
    await videoHelper.waitForVideoLoad()
    await expect(page.locator('[data-testid="video-loading"]')).not.toBeVisible()
  })

  test('should handle video error', async ({ page }) => {
    // Mock video error
    await page.route('**/uploads/screen.mp4', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'text/plain',
        body: 'Video not found'
      })
    })
    
    // Reload page to trigger error
    await page.reload()
    
    // Should show error message
    await expect(page.locator('text=Failed to load video')).toBeVisible()
    await expect(page.locator('text=Please check the file')).toBeVisible()
  })

  test('should show video dimensions', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Should show video dimensions
    await expect(page.locator('[data-testid="video-dimensions"]')).toBeVisible()
    await expect(page.locator('text=1280x720')).toBeVisible()
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Spacebar to play/pause
    await page.keyboard.press(' ')
    await videoHelper.playVideo()
    
    // Arrow keys to seek
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')
    
    // M key to mute
    await page.keyboard.press('m')
    
    // F key for fullscreen
    await page.keyboard.press('f')
  })

  test('should sync with timeline', async ({ page }) => {
    await videoHelper.waitForVideoLoad()
    
    // Click on timeline
    await page.click('[data-testid="timeline-container"]', { position: { x: 200, y: 50 } })
    
    // Video should seek to corresponding time
    const currentTime = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement
      return video ? video.currentTime : 0
    })
    expect(currentTime).toBeGreaterThan(0)
  })
})
