# Test Fixtures

This directory contains test fixtures used by Playwright E2E tests.

## Video Fixtures

### sample-screen.mp4
- **Duration:** 5 seconds
- **Resolution:** 1280x720 (720p)
- **Frame Rate:** 30 fps
- **Audio:** 1000Hz sine wave
- **Purpose:** Simulates screen recording for testing

### sample-webcam.mp4
- **Duration:** 5 seconds
- **Resolution:** 640x480 (480p)
- **Frame Rate:** 30 fps
- **Audio:** 2000Hz sine wave
- **Purpose:** Simulates webcam recording for PiP testing

## Image Fixtures

### circle-mask.png
- **Size:** 640x480
- **Content:** White background with black circle
- **Purpose:** Test shape mask for PiP compositing

## Generation

Test fixtures are automatically generated during global test setup using:

- **FFmpeg** for video generation
- **ImageMagick** for image generation

If these tools are not available, placeholder files are created instead.

## Usage in Tests

```typescript
import { VideoTestHelpers } from '../helpers/tauri-test'

test('video import test', async ({ page }) => {
  const videoHelper = new VideoTestHelpers(page)
  
  // Upload test video
  await videoHelper.uploadTestVideo('tests/fixtures/test-videos/sample-screen.mp4')
  
  // Wait for video to load
  await videoHelper.waitForVideoLoad()
  
  // Verify duration
  const duration = await videoHelper.getVideoDuration()
  expect(duration).toBeCloseTo(5, 1)
})
```

## File Sizes

- **sample-screen.mp4:** ~50KB (5 seconds, 720p)
- **sample-webcam.mp4:** ~30KB (5 seconds, 480p)
- **circle-mask.png:** ~5KB (640x480)

These small file sizes ensure fast test execution while providing realistic test data.
