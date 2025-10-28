# VidVeil

AI-Powered Desktop Video Editor with PiP Magic 🎬✨

## Overview

VidVeil is a desktop video editor built with Tauri, Nuxt 4, and NuxtUI 4 that specializes in creating professional Picture-in-Picture (PiP) videos with custom shapes.

**Key Features:**
- 🎥 Screen + Webcam recording
- ✨ Custom PiP shapes (circle, heart, star, hexagon, etc.)
- 🎬 Timeline editing with real-time preview
- 📤 Canvas-based video export
- ☁️ Cloud sync via Supabase
- 🎨 Modern, polished UI

## Quick Start

```bash
# Navigate to the app directory
cd clipforge

# Install dependencies
bun install

# Start development server
bun run dev

# Or run in desktop mode
bun run tauri:dev
```

## Documentation

See the [clipforge README](./clipforge/README.md) for full documentation.

## Project Structure

```
vidveil/
├── clipforge/          # Main application
│   ├── app/            # Nuxt frontend
│   ├── src-tauri/      # Rust backend
│   ├── docs/           # Documentation
│   └── README.md       # Full documentation
├── prd.md              # Product requirements
└── TASKS.md            # Development tasks
```

## Tech Stack

- **Frontend:** Nuxt 4 + Vue 3 + NuxtUI 4
- **Desktop:** Tauri 2.0 (Rust)
- **Backend:** Supabase (PostgreSQL)
- **Video:** Canvas API + MediaRecorder
- **State:** Vue Composables

## License

MIT © Elvis Ibarra
