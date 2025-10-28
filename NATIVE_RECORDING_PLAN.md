# Native Screen Recording Implementation Plan

**Status:** 🚧 IN PROGRESS  
**Platform:** macOS (primary), Windows & Linux (future)  
**Approach:** True native capture using platform APIs

---

## ✅ Completed (Phase 1: Foundation)

### Rust Backend Structure
- ✅ Created `commands/screen_capture.rs` with command handlers
- ✅ Created `commands/macos_capture.rs` for macOS-specific implementation
- ✅ Added necessary dependencies to `Cargo.toml`:
  - `lazy_static` for state management
  - macOS frameworks: `objc`, `cocoa`, `core-graphics`, etc.
- ✅ Registered commands in `lib.rs`:
  - `get_available_screens`
  - `start_screen_recording`
  - `stop_screen_recording`
  - `is_recording`

### Frontend Composables
- ✅ Created `composables/useNativeRecording.ts` with TypeScript types
- ✅ Implemented screen enumeration
- ✅ Implemented start/stop recording interface
- ✅ Added error handling and loading states

---

## 🚧 TODO (Phase 2: macOS Implementation)

### 1. **Implement AVFoundation Screen Capture** ⏳ NEXT
**File:** `src-tauri/src/commands/macos_capture.rs`

The current implementation is a skeleton. We need to:

#### Step 1: Add AVFoundation Bindings
```rust
// Use objc to bridge to AVFoundation
use objc::runtime::Class;
use objc::{msg_send, sel, sel_impl};

// AVCaptureSession class
// AVCaptureScreenInput class
// AVCaptureMovieFileOutput class
```

#### Step 2: Create Capture Session
```rust
pub async fn start_recording(...) -> Result<(), String> {
    // 1. Create AVCaptureSession
    let session_class = Class::get("AVCaptureSession").unwrap();
    let session: *mut Object = msg_send![session_class, alloc];
    let session: *mut Object = msg_send![session, init];
    
    // 2. Configure session quality
    msg_send![session, setSessionPreset: NSAVCaptureSessionPreset1920x1080];
    
    // 3. Create screen input for specified display
    let input_class = Class::get("AVCaptureScreenInput").unwrap();
    let display_id = parse_display_id(screen_id)?;
    let input: *mut Object = msg_send![input_class, alloc];
    let input: *mut Object = msg_send![input, initWithDisplayID: display_id];
    
    // 4. Create movie file output
    let output_class = Class::get("AVCaptureMovieFileOutput").unwrap();
    let output: *mut Object = msg_send![output_class, alloc];
    let output: *mut Object = msg_send![output, init];
    
    // 5. Add input/output to session
    msg_send![session, addInput: input];
    msg_send![session, addOutput: output];
    
    // 6. Start recording to file
    let path_str = NSString::from_str(&output_path);
    let url_class = Class::get("NSURL").unwrap();
    let file_url: *mut Object = msg_send![url_class, fileURLWithPath: path_str];
    msg_send![output, startRecordingToOutputFileURL:file_url recordingDelegate:nil];
    
    // 7. Start session
    msg_send![session, startRunning];
    
    Ok(())
}
```

#### Step 3: Handle Webcam Capture
```rust
// Add webcam as second input
let webcam_class = Class::get("AVCaptureDevice").unwrap();
let webcam: *mut Object = msg_send![webcam_class, defaultDeviceWithMediaType: AVMediaTypeVideo];

if !webcam.is_null() {
    let webcam_input_class = Class::get("AVCaptureDeviceInput").unwrap();
    let webcam_input: *mut Object = msg_send![webcam_input_class, deviceInputWithDevice:webcam error:nil];
    msg_send![session, addInput: webcam_input];
}
```

#### Step 4: Handle Audio
```rust
if include_audio {
    let audio_class = Class::get("AVCaptureDevice").unwrap();
    let audio_device: *mut Object = msg_send![audio_class, defaultDeviceWithMediaType: AVMediaTypeAudio];
    
    let audio_input_class = Class::get("AVCaptureDeviceInput").unwrap();
    let audio_input: *mut Object = msg_send![audio_input_class, deviceInputWithDevice:audio_device error:nil];
    msg_send![session, addInput: audio_input];
}
```

#### Step 5: Stop Recording
```rust
pub async fn stop_recording() -> Result<(), String> {
    let mut session = CAPTURE_SESSION.lock().unwrap();
    
    if let Some(capture) = session.as_ref() {
        // Stop the AVCaptureSession
        let session_obj = capture.session;
        msg_send![session_obj, stopRunning];
        
        // Stop recording
        let output = capture.output;
        msg_send![output, stopRecording];
    }
    
    *session = None;
    Ok(())
}
```

### 2. **Permission Handling** ⏳
**File:** `src-tauri/tauri.conf.json`

Add entitlements for screen recording:
```json
{
  "bundle": {
    "macOS": {
      "entitlements": "entitlements.plist"
    }
  }
}
```

**File:** `src-tauri/entitlements.plist` (NEW)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.device.camera</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
</dict>
</plist>
```

### 3. **Frontend Integration** ⏳
**File:** `app/composables/useScreenCapture.ts`

Replace MediaRecorder API with native recording:
```typescript
const startRecording = async () => {
    if (isTauri()) {
        // Use native recording
        const { getScreens, startRecording: startNative } = useNativeRecording()
        
        const screens = await getScreens()
        const primaryScreen = screens.find(s => s.is_primary) || screens[0]
        
        if (!primaryScreen) {
            throw new Error('No screens available')
        }
        
        await startNative(primaryScreen.id, true)
        return
    }
    
    // Browser mode fallback
    // ... existing MediaRecorder code
}
```

### 4. **UI Updates** ⏳
**File:** `app/pages/recorder.vue`

Add native recording UI:
```vue
<script setup>
const { availableScreens, getScreens, isRecording, error } = useNativeRecording()

onMounted(async () => {
    if (isTauri()) {
        await getScreens()
    }
})
</script>

<template>
    <div v-if="isTauri()">
        <h3>Select Screen</h3>
        <div v-for="screen in availableScreens" :key="screen.id">
            <button @click="selectScreen(screen)">
                {{ screen.name }} ({{ screen.width }}x{{ screen.height }})
            </button>
        </div>
    </div>
</template>
```

---

## 📋 TODO (Phase 3: Polish & Testing)

### 5. **Error Handling**
- [ ] Handle permission denied gracefully
- [ ] Show system prompt for screen recording permission
- [ ] Handle disk space issues
- [ ] Handle invalid screen IDs

### 6. **Video Format & Quality**
- [ ] Support multiple codecs (H.264, H.265, ProRes)
- [ ] Configurable bitrate and frame rate
- [ ] Resolution options (1080p, 1440p, 4K)

### 7. **Progress & Status**
- [ ] Add recording duration counter
- [ ] Add file size monitoring
- [ ] Add frame rate monitoring
- [ ] Show recording indicator (red dot in menu bar?)

### 8. **Testing**
- [ ] Test on multiple displays
- [ ] Test with/without webcam
- [ ] Test with/without audio
- [ ] Test start/stop cycles
- [ ] Test disk full scenarios
- [ ] Test permission denial

---

## 🔮 Future (Phase 4: Cross-Platform)

### Windows Implementation
- Use **Windows.Graphics.Capture** API
- Similar command structure
- Create `commands/windows_capture.rs`

### Linux Implementation  
- Use **PipeWire** + **GStreamer**
- More complex due to Wayland/X11 differences
- Create `commands/linux_capture.rs`

---

## 📊 Time Estimates

| Phase | Task | Estimate |
|-------|------|----------|
| 2.1 | AVFoundation basics | 3-4 hours |
| 2.2 | Webcam + Audio | 2-3 hours |
| 2.3 | Stop & cleanup | 1 hour |
| 2.4 | Permissions | 1 hour |
| 2.5 | Frontend integration | 2 hours |
| 2.6 | UI updates | 1 hour |
| 3.0 | Polish & testing | 3-4 hours |
| **TOTAL** | **macOS Complete** | **13-17 hours** |

---

## 🎯 Current Priority

**NEXT STEP:** Implement AVFoundation screen capture in `macos_capture.rs`

This is the core functionality - once this works, everything else falls into place.

---

## 🔗 References

- [AVFoundation Programming Guide](https://developer.apple.com/documentation/avfoundation)
- [ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit)
- [objc-rs Documentation](https://docs.rs/objc/)
- [Core Graphics Display Services](https://developer.apple.com/documentation/coregraphics/quartz_display_services)

---

**Last Updated:** 2025-10-28  
**Author:** Claude (VidVeil Development)




