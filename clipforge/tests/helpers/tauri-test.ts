import { Page, expect } from '@playwright/test'

/**
 * Tauri-specific test helpers
 * These utilities help test desktop app functionality
 */

export class TauriTestHelpers {
  constructor(private page: Page) {}

  /**
   * Check if running in Tauri environment
   */
  async isTauri(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return typeof window !== 'undefined' && '__TAURI__' in window
    })
  }

  /**
   * Mock Tauri invoke command
   */
  async mockTauriInvoke(command: string, result: any) {
    await this.page.addInitScript(({ command, result }) => {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        // Mock the invoke function
        window.__TAURI__.invoke = async (cmd: string) => {
          if (cmd === command) {
            return result
          }
          throw new Error(`Unmocked command: ${cmd}`)
        }
      }
    }, { command, result })
  }

  /**
   * Wait for Tauri app to be ready
   */
  async waitForTauriReady() {
    await this.page.waitForFunction(() => {
      return typeof window !== 'undefined' && '__TAURI__' in window
    })
  }

  /**
   * Simulate native recording start
   */
  async mockNativeRecordingStart(screenId: string = 'primary') {
    await this.mockTauriInvoke('start_screen_recording', {
      success: true,
      path: `/tmp/vidveil-recording-${Date.now()}.mp4`
    })
  }

  /**
   * Simulate native recording stop
   */
  async mockNativeRecordingStop() {
    await this.mockTauriInvoke('stop_screen_recording', {
      success: true,
      path: `/tmp/vidveil-recording-${Date.now()}.mp4`
    })
  }

  /**
   * Mock screen enumeration
   */
  async mockScreenEnumeration() {
    await this.mockTauriInvoke('get_available_screens', [
      {
        id: 'primary',
        name: 'Built-in Retina Display',
        width: 2560,
        height: 1600,
        is_primary: true
      }
    ])
  }

  /**
   * Mock recording status check
   */
  async mockRecordingStatus(isRecording: boolean = false) {
    await this.mockTauriInvoke('is_recording', isRecording)
  }
}

/**
 * Video testing utilities
 */
export class VideoTestHelpers {
  constructor(private page: Page) {}

  /**
   * Upload a test video file
   */
  async uploadTestVideo(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
  }

  /**
   * Wait for video to load
   */
  async waitForVideoLoad(videoSelector: string = 'video') {
    const video = this.page.locator(videoSelector)
    await video.waitFor({ state: 'visible' })
    
    // Wait for video metadata to load
    await this.page.waitForFunction((selector) => {
      const video = document.querySelector(selector) as HTMLVideoElement
      return video && video.readyState >= 1 // HAVE_METADATA
    }, videoSelector)
  }

  /**
   * Get video duration
   */
  async getVideoDuration(videoSelector: string = 'video'): Promise<number> {
    return await this.page.evaluate((selector) => {
      const video = document.querySelector(selector) as HTMLVideoElement
      return video ? video.duration : 0
    }, videoSelector)
  }

  /**
   * Play video and wait for it to start
   */
  async playVideo(videoSelector: string = 'video') {
    const video = this.page.locator(videoSelector)
    await video.click()
    
    // Wait for video to start playing
    await this.page.waitForFunction((selector) => {
      const video = document.querySelector(selector) as HTMLVideoElement
      return video && !video.paused
    }, videoSelector)
  }

  /**
   * Pause video
   */
  async pauseVideo(videoSelector: string = 'video') {
    const video = this.page.locator(videoSelector)
    await video.click()
    
    // Wait for video to pause
    await this.page.waitForFunction((selector) => {
      const video = document.querySelector(selector) as HTMLVideoElement
      return video && video.paused
    }, videoSelector)
  }

  /**
   * Seek to specific time
   */
  async seekToTime(time: number, videoSelector: string = 'video') {
    await this.page.evaluate(({ selector, time }) => {
      const video = document.querySelector(selector) as HTMLVideoElement
      if (video) {
        video.currentTime = time
      }
    }, { selector: videoSelector, time })
  }
}

/**
 * Authentication test helpers
 */
export class AuthTestHelpers {
  constructor(private page: Page) {}

  /**
   * Login with test credentials
   */
  async loginWithTestCredentials(email: string = 'test@example.com', password: string = 'testpassword') {
    await this.page.goto('/login')
    
    await this.page.fill('input[type="email"]', email)
    await this.page.fill('input[type="password"]', password)
    await this.page.click('button[type="submit"]')
    
    // Wait for redirect to projects page
    await this.page.waitForURL('/projects')
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForURL('/projects', { timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Logout
   */
  async logout() {
    await this.page.click('[data-testid="logout-button"]')
    await this.page.waitForURL('/login')
  }
}

/**
 * Project management test helpers
 */
export class ProjectTestHelpers {
  constructor(private page: Page) {}

  /**
   * Create a new project
   */
  async createProject(name: string) {
    await this.page.click('[data-testid="create-project-button"]')
    await this.page.fill('input[placeholder*="project name" i]', name)
    await this.page.click('button:has-text("Create")')
    
    // Wait for project to be created and navigate to it
    await this.page.waitForURL(/\/project\/[a-f0-9-]+/)
  }

  /**
   * Get current project ID from URL
   */
  async getCurrentProjectId(): Promise<string | null> {
    const url = this.page.url()
    const match = url.match(/\/project\/([a-f0-9-]+)/)
    return match ? match[1] : null
  }

  /**
   * Navigate to project
   */
  async navigateToProject(projectId: string) {
    await this.page.goto(`/project/${projectId}`)
    await this.page.waitForLoadState('networkidle')
  }
}

/**
 * Timeline test helpers
 */
export class TimelineTestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for timeline to load
   */
  async waitForTimelineLoad() {
    await this.page.waitForSelector('.timeline-container', { state: 'visible' })
  }

  /**
   * Get number of clips on timeline
   */
  async getClipsCount(): Promise<number> {
    return await this.page.locator('.timeline-clip').count()
  }

  /**
   * Select a clip by index
   */
  async selectClip(index: number) {
    await this.page.locator('.timeline-clip').nth(index).click()
  }

  /**
   * Apply PiP shape to selected clip
   */
  async applyPipShape(shape: string) {
    await this.page.click(`button:has-text("${shape}")`)
  }

  /**
   * Check if PiP is applied
   */
  async isPipApplied(): Promise<boolean> {
    return await this.page.locator('.pip-indicator').isVisible()
  }
}

/**
 * Export test helpers
 */
export class ExportTestHelpers {
  constructor(private page: Page) {}

  /**
   * Open export dialog
   */
  async openExportDialog() {
    await this.page.click('button:has-text("Export")')
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' })
  }

  /**
   * Select export preset
   */
  async selectExportPreset(preset: string) {
    await this.page.selectOption('select', preset)
  }

  /**
   * Start export
   */
  async startExport() {
    await this.page.click('button:has-text("Start Export")')
  }

  /**
   * Wait for export to complete
   */
  async waitForExportComplete(timeout: number = 120000) {
    await this.page.waitForSelector('text=Export Complete', { timeout })
  }

  /**
   * Get exported file path
   */
  async getExportedFilePath(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.click('button:has-text("Download")')
    const download = await downloadPromise
    return download.path()
  }
}

/**
 * Utility functions
 */
export async function createTestVideoFile(duration: number = 5): Promise<string> {
  // This would create a test video file using FFmpeg
  // For now, return a placeholder path
  return `/tmp/test-video-${Date.now()}.mp4`
}

export async function cleanupTestFiles() {
  // Clean up test files after tests
  // Implementation would depend on the test environment
}

/**
 * Custom matchers for video testing
 */
export async function expectVideoToBeValid(filePath: string) {
  // This would validate that the video file is playable
  // Implementation would use FFprobe or similar tool
}

export async function expectVideoDuration(filePath: string, expectedDuration: number, tolerance: number = 0.5) {
  // This would check video duration matches expected value within tolerance
  // Implementation would use FFprobe
}
