# Next Steps: Completing PiP Magic

## Current Status
✅ **Core Editor Working**:
- Video import, playback, timeline sync
- Project management with Supabase
- UI polish, animations, error handling
- Shape library defined

❌ **PiP Magic Not Yet Functional**:
- No screen+webcam recording
- Shapes apply to main video (wrong!)
- No dual-layer overlay system
- No export with composited PiP

---

## Priority Implementation Order

### 🔴 CRITICAL: Fix PiP to Use Overlay System

**Goal**: Apply shapes to a SEPARATE webcam layer, not the main video

**Tasks**:
1. Update project editor to support 2 video layers:
   - Base layer: Screen recording (full size)
   - Overlay layer: Webcam feed (positioned in corner with shape mask)
   
2. Modify `usePipShape` to:
   - Target the overlay video element, not main video
   - Position the overlay (x, y coordinates)
   - Size the overlay (width, height as % of screen)

3. Create `PipOverlay.vue` component:
   - Positioned absolutely over main video
   - Takes webcam clip src
   - Applies shape via CSS clip-path
   - Draggable to reposition

**Files to Modify**:
- `app/pages/project/[id].vue` - Add overlay layer
- `app/composables/usePipShape.ts` - Target overlay, not main
- `app/components/pip/PipOverlay.vue` - Create new component

---

### 🟡 HIGH: Screen + Webcam Recording

**Goal**: Record screen and webcam simultaneously, auto-tag webcam clip

**Tasks**:
1. Update `useScreenCapture.ts`:
   - Use `navigator.mediaDevices.getDisplayMedia()` for screen
   - Use `navigator.mediaDevices.getUserMedia()` for webcam
   - Record both streams using MediaRecorder
   - Save as 2 separate files (screen.webm, webcam.webm)

2. Update `recorder.vue`:
   - Show both previews side-by-side
   - Add toggle for "Include Webcam"
   - Auto-add both clips to project with metadata tags

3. Auto-detect webcam clips:
   - Tag clips with `metadata.type: 'webcam'` or `'screen'`
   - In editor, auto-apply PiP overlay to webcam clips

**Files to Modify**:
- `app/composables/useScreenCapture.ts`
- `app/composables/useWebcamCapture.ts`
- `app/pages/recorder.vue`
- Add metadata to clips on import

---

### 🟡 HIGH: Smart PiP Positioning

**Goal**: Position webcam overlay to avoid blocking important UI

**Current**: `usePipPosition.ts` exists but not used

**Tasks**:
1. Implement heuristic positioning:
   - Default: Bottom-right corner (safe zone)
   - Detect high-motion areas (avoid)
   - Detect text density (avoid terminal, code)
   
2. Make overlay draggable:
   - User can override auto-position
   - Snap to corners
   - Store position in clip metadata

**Files to Modify**:
- `app/composables/usePipPosition.ts` - Implement algorithm
- `app/components/pip/PipOverlay.vue` - Add drag handlers
- Update clip metadata to save position

---

### 🟠 MEDIUM: Export with Composited PiP (PR-23)

**Goal**: Export final video with webcam overlay baked in

**Current**: Export button exists but doesn't work

**Tasks**:
1. **Option A: FFmpeg Desktop (Tauri)**
   - Add FFmpeg binary to Tauri
   - Create Rust command to composite layers
   - Use `overlay` filter to merge screen + webcam
   - Apply shape mask via alpha channel
   
2. **Option B: Canvas Export (Web)**
   - Create canvas element
   - Draw screen frame
   - Draw webcam frame with clip-path
   - Use MediaRecorder to capture canvas
   - Download as WebM/MP4

3. Implement progress tracking
4. Add resolution/quality options

**Files to Modify**:
- `app/composables/useExport.ts` - Implement actual export
- `src-tauri/src/commands/export.rs` - FFmpeg integration (if Tauri)
- `app/components/export/ExportDialog.vue` - Wire up UI

---

### 🟢 LOW: AI Shape Generation (Stretch)

**Goal**: Natural language → custom shapes ("wavy amoeba")

**Current**: OpenAI integration exists but unused

**Tasks**:
1. Wire up `useAI.ts` to shape parser input
2. Prompt engineering for shape → SVG path
3. Fallback to predefined shapes on parse failure

---

## Recommended Next Action

**START HERE**: Fix the PiP overlay system so shapes apply to webcam, not main video.

This is the most critical fix because:
- Currently shapes are applied incorrectly (to main video)
- Dual-layer system is fundamental to all other PiP features
- Enables testing of positioning and export later

**Estimated Time**: 2-3 hours to implement overlay system properly.

---

## Testing Checklist

Once overlay system is working:
- [ ] Import screen recording + webcam clip
- [ ] Select webcam clip
- [ ] Apply shape (circle, heart, etc.)
- [ ] Shape appears on webcam overlay in corner
- [ ] Main screen video is unaffected
- [ ] Can drag overlay to reposition
- [ ] Timeline shows both clips
- [ ] Export includes composited overlay (once implemented)

