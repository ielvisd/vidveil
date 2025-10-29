# Development Mode Guide

## Overview

ClipForge has **two development modes** that serve different purposes. Understanding which mode to use will help you iterate faster.

---

## 🚀 Mode 1: Tauri Dev Mode (Recommended for Full Features)

**Command:** `bun run tauri:dev`

**What it does:**
- ✅ Runs Nuxt dev server with **HMR (Hot Module Reload)**
- ✅ Starts Tauri Rust backend
- ✅ Opens desktop window with native features
- ✅ **All native features work** (screen recording, video export, file system, etc.)

**When to use:**
- Working on features that need native capabilities (recording, export, file I/O)
- Testing the full desktop app experience
- Debugging native integration issues

**Hot Reload:** ✅ Yes! Frontend changes reload instantly while Rust backend stays running.

**How it works:**
1. Tauri runs `bun run dev` (starts Nuxt dev server on `localhost:3000`)
2. Tauri window loads `http://localhost:3000`
3. Nuxt HMR updates the window automatically
4. Rust backend stays running, so native commands always work

---

## 🌐 Mode 2: Browser-Only Dev Mode (UI/Component Development)

**Command:** `bun run dev`

**What it does:**
- ✅ Runs Nuxt dev server with HMR
- ✅ Opens in browser (no desktop window)
- ❌ **Native Tauri features don't work** (no Rust backend)
- ❌ Screen recording, native export, file system access unavailable

**When to use:**
- Developing UI components
- Working on styling/layout
- Testing non-native features (timeline, shapes, preview)
- Quick iteration on Vue components

**Hot Reload:** ✅ Yes! Works perfectly.

**Limitations:**
- Native commands return errors or empty results
- App shows messages like "Native recording only available in desktop app"
- File system operations won't work

---

## 🔍 Quick Comparison

| Feature | Browser Dev | Tauri Dev |
|---------|-------------|-----------|
| Hot Module Reload | ✅ | ✅ |
| UI Components | ✅ | ✅ |
| Screen Recording | ❌ | ✅ |
| Native Export | ❌ | ✅ |
| File System | ❌ | ✅ |
| Desktop Window | ❌ | ✅ |
| Startup Speed | ⚡ Fast | 🐢 Slower (compiles Rust) |
| Iteration Speed | ⚡⚡⚡ Fastest | ⚡⚡ Fast |

---

## 💡 Development Workflow Tips

### For UI/Component Development
```bash
# Fast iteration on components, styling, layout
bun run dev
# Opens at http://localhost:3000
```

### For Native Feature Development
```bash
# Full desktop app with all features
bun run tauri:dev
# Opens desktop window with native backend
```

### Hybrid Approach
1. Start with `bun run dev` for UI work
2. Switch to `bun run tauri:dev` when you need native features
3. Both use the same Nuxt dev server (HMR works in both)

---

## 🛡️ Code Safeguards

The app already protects against calling native features in browser mode:

```typescript
// Example from useNativeRecording.ts
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

if (!isTauri()) {
  error.value = 'Native recording only available in desktop app'
  return null
}
```

**Use the shared utility:** `composables/useTauri.ts` for consistent checks:

```typescript
import { useTauri } from '~/composables/useTauri'

const { isTauri, safeInvoke } = useTauri()

if (!isTauri()) {
  // Handle browser-only mode
}
```

---

## ⚡ Performance Notes

### Tauri Dev Mode Startup
- First run: Compiles Rust backend (~30-60s)
- Subsequent runs: Much faster (Rust is cached)
- Frontend HMR: Instant (same as browser mode)

### Browser Dev Mode Startup
- Always fast (~2-3s)
- No Rust compilation needed

---

## 🐛 Troubleshooting

### "Native feature not available" errors in browser mode
**This is expected!** Switch to `bun run tauri:dev` if you need native features.

### Tauri dev window doesn't reload
- Check that Nuxt dev server is running on `localhost:3000`
- Verify HMR is configured correctly (check `nuxt.config.ts`)
- Try refreshing the Tauri window manually

### Rust compilation errors
- Ensure Rust toolchain is installed: `rustc --version`
- Try `cargo clean` in `src-tauri/` directory
- Check `src-tauri/Cargo.toml` for dependency issues

---

## 📝 Summary

**For fast iteration with native features, use `bun run tauri:dev`.**

You get:
- ✅ Fast frontend iteration (HMR)
- ✅ Full native feature access
- ✅ Desktop app experience
- ✅ Quick feedback loop

The initial Rust compilation is a one-time cost per session, and subsequent changes are fast thanks to HMR!



