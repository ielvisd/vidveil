import { FullConfig } from '@playwright/test'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'

/**
 * Global teardown for Playwright tests
 * This runs once after all tests complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...')

  // Clean up test files
  await cleanupTestFiles()

  // Clean up test database
  await cleanupTestDatabase()

  // Clean up temporary files
  await cleanupTempFiles()

  console.log('✅ Global test teardown complete!')
}

/**
 * Clean up test files
 */
async function cleanupTestFiles() {
  console.log('🗑️ Cleaning up test files...')

  const testFiles = [
    'tests/fixtures/test-videos/sample-screen.mp4',
    'tests/fixtures/test-videos/sample-webcam.mp4',
    'tests/fixtures/test-images/circle-mask.png',
    '.env.test'
  ]

  for (const file of testFiles) {
    if (existsSync(file)) {
      rmSync(file)
      console.log(`🗑️ Removed: ${file}`)
    }
  }
}

/**
 * Clean up test database
 */
async function cleanupTestDatabase() {
  console.log('🗄️ Cleaning up test database...')

  // Note: In a real implementation, you would clean up test data
  // from your Supabase test instance here
  
  try {
    // Example cleanup queries (would be executed against test DB)
    const cleanupQueries = [
      'DELETE FROM test_clips WHERE project_id IN (SELECT id FROM test_projects WHERE name LIKE "E2E Test%")',
      'DELETE FROM test_projects WHERE name LIKE "E2E Test%"',
      'DELETE FROM test_users WHERE email LIKE "%@test.example.com"'
    ]

    console.log('✅ Test database cleanup prepared')
    
  } catch (error) {
    console.warn('⚠️ Database cleanup failed:', error)
  }
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles() {
  console.log('🧹 Cleaning up temporary files...')

  const tempDirs = [
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces'
  ]

  for (const dir of tempDirs) {
    if (existsSync(dir)) {
      // Keep test results for debugging, but clean up old ones
      console.log(`📁 Keeping test results: ${dir}`)
    }
  }

  // Clean up any temporary files created during tests
  const tempFiles = [
    '/tmp/vidveil-recording-*.mp4',
    '/tmp/test-video-*.mp4',
    '/tmp/export-*.mp4'
  ]

  // Note: In a real implementation, you would clean up these files
  console.log('✅ Temporary files cleanup prepared')
}

export default globalTeardown
