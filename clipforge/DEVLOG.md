# VidVeil Development Log

## Native Screen Recording - Status Update

**Date:** October 28, 2025  
**Status:** 🚧 IN PROGRESS - AVFoundation needs exception handling

---

## What Happened

### ✅ Achievements:
- Full AVFoundation implementation written (218 lines of Objective-C FFI)
- All Rust compilation errors fixed
- App builds and launches successfully
- Thread-safe architecture with proper mutex handling
- Screen enumeration working via Core Graphics

### ❌ Current Issue: Objective-C Exception Crash

**Error:** `fatal runtime error: Rust cannot catch foreign exceptions, aborting`

**What This Means:**  
The AVFoundation Objective-C code is throwing an exception that Rust can't catch. This is a common issue when bridging Objective-C and Rust.

**Root Cause:**  
Objective-C methods can throw exceptions for various reasons:
- Missing permissions (even though we have entitlements)
- Invalid parameters
- API availability issues
- Runtime initialization failures

---

## The Problem with AVFoundation Bridging

AVFoundation uses Objective-C exceptions for error handling, but Rust's FFI can't catch these. When an Objective-C exception is thrown:

```
Objective-C throws exception → Crosses FFI boundary → Rust panics → App crashes
```

### What We Need:

**Objective-C Exception Handler Wrapper:**

We need to create a C wrapper that catches Objective-C exceptions before they reach Rust:

```objc
// screen_capture.m (new file needed)
#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

extern "C" {
    bool start_avfoundation_recording(
        const char* output_path,
        uint32_t display_id,
        bool include_audio,
        char** error_out
    ) {
        @try {
            // AVFoundation code here
            AVCaptureSession* session = [[AVCaptureSession alloc] init];
            // ... rest of implementation
            return true;
        }
        @catch (NSException* exception) {
            *error_out = strdup([[exception reason] UTF8String]);
            return false;
        }
    }
}
```

Then call from Rust:
```rust
extern "C" {
    fn start_avfoundation_recording(
        output_path: *const c_char,
        display_id: u32,
        include_audio: bool,
        error_out: *mut *mut c_char
    ) -> bool;
}
```

---

## Current Workaround

**The AVFoundation code is commented out** and returns a helpful error message:

```
"Native screen recording is still in development.

The app is working but native recording needs more fixes.

For now, you can:
1. Use the browser version at http://localhost:3000/recorder
2. Or wait for the native implementation to be completed

Error: AVFoundation integration needs additional exception handling"
```

**App Status:** ✅ **Working** - Just shows error instead of crashing

---

## Solutions to Complete Native Recording

### Option 1: Pure Objective-C Wrapper (Recommended)

**Time:** 3-4 hours  
**Difficulty:** Medium

Create a new `.m` file with proper exception handling, compile it separately, and link it with Rust.

**Steps:**
1. Create `src-tauri/src/objc/screen_capture.m`
2. Write AVFoundation code with `@try/@catch` blocks
3. Expose C functions that Rust can call
4. Add to `build.rs` to compile the Objective-C file
5. Link in Cargo.toml

### Option 2: Use Existing Rust Crate

**Time:** 1-2 hours  
**Difficulty:** Easy

Use `screencapturekit-rs` or `nokhwa` crates that already handle the Objective-C bridging.

**Pros:**
- Battle-tested
- Proper exception handling
- Less code to maintain

**Cons:**
- Less control
- Additional dependency

### Option 3: Simpler Alternative - `screencapturekit` Bindings

**Time:** 2-3 hours  
**Difficulty:** Medium

Instead of AVFoundation (older API), use ScreenCaptureKit (newer, macOS 12.3+):

```toml
[dependencies]
screencapturekit = "0.2"  # If it exists
```

ScreenCaptureKit is more modern and might have better Rust bindings.

---

## Recommended Next Steps

**Priority 1: Ship Working App**
- ✅ App works
- ✅ Can edit videos
- ✅ Can export with PiP
- ⚠️ Recording requires browser mode

**Priority 2: Complete Native Recording (Post-Launch)**
- Implement Option 1 or 2 above
- Thorough testing
- Handle all edge cases
- Add to v2.0

---

## What Works Right Now

### ✅ Fully Functional:
- Desktop app launches
- Video editing
- Timeline manipulation
- PiP shape controls
- Video export with compositing
- Canvas-based rendering
- Audio mixing

### ⚠️ Needs Browser:
- Screen + webcam recording

### Workaround:
1. Keep desktop app open for editing
2. Use browser at `localhost:3000/recorder` for recording
3. Import recordings back to desktop app
4. Edit and export in desktop

---

## Technical Details

### Files Implemented:
- ✅ `src-tauri/src/commands/macos_capture.rs` - 330+ lines (commented out)
- ✅ `src-tauri/src/commands/screen_capture.rs` - Command handlers
- ✅ `app/composables/useNativeRecording.ts` - Frontend interface
- ✅ `src-tauri/entitlements.plist` - Permissions
- ✅ Integration in `useScreenCapture.ts`

### What's Missing:
- Objective-C exception handling wrapper
- Build script to compile `.m` files
- Linking configuration

---

## Lessons Learned

1. **Objective-C FFI is Hard**
   - Direct `objc` crate usage exposes you to exceptions
   - Need proper C wrapper with `@try/@catch`

2. **AVFoundation is Complex**
   - Lots of configuration needed
   - Many points of failure
   - Needs careful initialization order

3. **Screen Recording Requires Permissions**
   - Entitlements alone aren't enough
   - User must explicitly grant permission
   - macOS has strict security around screen capture

4. **Alternative Approach:**
   - Browser-based recording works perfectly
   - Native is nice-to-have, not must-have
   - Can ship without it and add later

---

## Previous Work

### ✅ Rebranding: ClipForge → VidVeil
- Updated all references across codebase

### ✅ Export Pipeline
- Canvas-based video compositing
- PiP shape masking with Path2D
- Audio mixing from multiple sources

### ✅ Desktop App Foundation
- Tauri 2.0 setup
- Nuxt 4 + Vue 3 frontend
- All permissions configured

---

**Current Status:** App is **fully functional** except native recording needs exception handling wrapper.

**Recommendation:** Ship current version with browser-based recording, add native in v2.0.
