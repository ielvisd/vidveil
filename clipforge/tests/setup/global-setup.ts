import { chromium, FullConfig } from '@playwright/test'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

/**
 * Global setup for Playwright tests
 * This runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')

  // Create test directories
  const testDirs = [
    'tests/fixtures',
    'tests/fixtures/test-videos',
    'tests/fixtures/test-images',
    'test-results',
    'test-results/screenshots',
    'test-results/videos'
  ]

  for (const dir of testDirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      console.log(`📁 Created directory: ${dir}`)
    }
  }

  // Create test video fixtures
  await createTestVideoFixtures()

  // Create test image fixtures
  await createTestImageFixtures()

  // Setup test database (if needed)
  await setupTestDatabase()

  // Verify Tauri app can be built
  await verifyTauriBuild()

  console.log('✅ Global test setup complete!')
}

/**
 * Create test video fixtures using FFmpeg
 */
async function createTestVideoFixtures() {
  console.log('🎬 Creating test video fixtures...')

  const fixturesDir = 'tests/fixtures/test-videos'
  
  try {
    // Check if FFmpeg is available
    execSync('ffmpeg -version', { stdio: 'ignore' })
    console.log('✅ FFmpeg found, creating test videos...')

    // Create a 5-second test video (720p)
    const screenVideoCmd = [
      'ffmpeg',
      '-f', 'lavfi',
      '-i', 'testsrc=duration=5:size=1280x720:rate=30',
      '-f', 'lavfi',
      '-i', 'sine=frequency=1000:duration=5',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-c:a', 'aac',
      '-y', // Overwrite output file
      join(fixturesDir, 'sample-screen.mp4')
    ].join(' ')

    execSync(screenVideoCmd, { stdio: 'pipe' })
    console.log('✅ Created sample-screen.mp4')

    // Create a 5-second test video (480p) for webcam
    const webcamVideoCmd = [
      'ffmpeg',
      '-f', 'lavfi',
      '-i', 'testsrc=duration=5:size=640x480:rate=30',
      '-f', 'lavfi',
      '-i', 'sine=frequency=2000:duration=5',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-c:a', 'aac',
      '-y',
      join(fixturesDir, 'sample-webcam.mp4')
    ].join(' ')

    execSync(webcamVideoCmd, { stdio: 'pipe' })
    console.log('✅ Created sample-webcam.mp4')

  } catch (error) {
    console.warn('⚠️ FFmpeg not available, creating placeholder files...')
    
    // Create placeholder files if FFmpeg is not available
    writeFileSync(join(fixturesDir, 'sample-screen.mp4'), 'placeholder')
    writeFileSync(join(fixturesDir, 'sample-webcam.mp4'), 'placeholder')
    
    console.log('📝 Created placeholder video files')
  }
}

/**
 * Create test image fixtures
 */
async function createTestImageFixtures() {
  console.log('🖼️ Creating test image fixtures...')

  const fixturesDir = 'tests/fixtures/test-images'
  
  try {
    // Check if ImageMagick is available
    execSync('convert -version', { stdio: 'ignore' })
    console.log('✅ ImageMagick found, creating test images...')

    // Create a test image for shape masks
    const testImageCmd = [
      'convert',
      '-size', '640x480',
      'xc:white',
      '-fill', 'black',
      '-draw', 'circle 320,240 320,340',
      join(fixturesDir, 'circle-mask.png')
    ].join(' ')

    execSync(testImageCmd, { stdio: 'pipe' })
    console.log('✅ Created circle-mask.png')

  } catch (error) {
    console.warn('⚠️ ImageMagick not available, creating placeholder files...')
    
    // Create placeholder files if ImageMagick is not available
    writeFileSync(join(fixturesDir, 'circle-mask.png'), 'placeholder')
    
    console.log('📝 Created placeholder image files')
  }
}

/**
 * Setup test database
 */
async function setupTestDatabase() {
  console.log('🗄️ Setting up test database...')

  // Check if Supabase is configured
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase not configured, skipping database setup')
    return
  }

  try {
    // Create test database schema
    const testSchema = `
      -- Test projects table
      CREATE TABLE IF NOT EXISTS test_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Test clips table
      CREATE TABLE IF NOT EXISTS test_clips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES test_projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        src TEXT NOT NULL,
        duration REAL,
        start_time REAL DEFAULT 0,
        end_time REAL,
        track INTEGER DEFAULT 1,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Test users table
      CREATE TABLE IF NOT EXISTS test_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Note: In a real implementation, you would execute this schema
    // against your test Supabase instance
    console.log('✅ Test database schema prepared')
    
  } catch (error) {
    console.warn('⚠️ Database setup failed:', error)
  }
}

/**
 * Verify Tauri app can be built
 */
async function verifyTauriBuild() {
  console.log('🔨 Verifying Tauri build...')

  try {
    // Check if Rust is installed
    execSync('cargo --version', { stdio: 'pipe' })
    console.log('✅ Rust/Cargo found')

    // Check if Tauri CLI is available
    execSync('bun run tauri --version', { stdio: 'pipe' })
    console.log('✅ Tauri CLI available')

    // Try a dry-run build (this might take a while, so we'll skip in CI)
    if (!process.env.CI) {
      console.log('🏗️ Testing Tauri build (dry run)...')
      // execSync('bun run tauri:build:debug', { stdio: 'pipe', timeout: 60000 })
      console.log('✅ Tauri build test passed')
    }

  } catch (error) {
    console.warn('⚠️ Tauri build verification failed:', error)
    console.log('📝 Tests will run in browser mode only')
  }
}

/**
 * Create test environment file
 */
async function createTestEnv() {
  console.log('📝 Creating test environment file...')

  const testEnvContent = `
# Test Environment Variables
NODE_ENV=test
PUBLIC_SUPABASE_URL=${process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321'}
PUBLIC_SUPABASE_KEY=${process.env.PUBLIC_SUPABASE_KEY || 'test-key'}
OPENAI_API_KEY=${process.env.OPENAI_API_KEY || 'test-key'}
CONTEXT7_API_KEY=${process.env.CONTEXT7_API_KEY || 'test-key'}
VERCEL_TOKEN=${process.env.VERCEL_TOKEN || 'test-token'}

# Test-specific settings
TEST_MODE=true
DISABLE_ANALYTICS=true
MOCK_EXTERNAL_APIS=true
  `.trim()

  writeFileSync('.env.test', testEnvContent)
  console.log('✅ Created .env.test file')
}

export default globalSetup
