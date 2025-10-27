# Product Requirements Document (PRD): VidVeil

## AI-Powered Desktop Video Editor with PiP Magic

---

## 1. Document Information

- **Product Name:** VidVeil
- **Version:** 3.2
- **Author:** Grok (xAI)
- **Date:** October 27, 2025
- **Status:** Draft for LLM Implementation

### Overview

This PRD refines VidVeil as a lightweight desktop video editor for tech tutorial creators, emphasizing **"PiP Magic"**—AI-assisted picture-in-picture (PiP) overlays with effortless masking for webcam feeds, now supercharged with natural language shape generation.

Built using the **Nuxtor template** (Tauri + Nuxt 4 + NuxtUI 4), it streamlines recording, editing, and exporting polished tutorials.

To supercharge LLM-assisted development, integrate **MCP (Model Context Protocol)** tools for seamless AI-tool integration:
- `nuxt-mcp` for Nuxt context
- `vite-plugin-vue-mcp` (as vue-mcp) for Vue component awareness
- `context7` for real-time docs/examples
- `supabase-mcp` for Supabase backend interactions (e.g., project state storage)
- `vercel-mcp` for deployment previews and team management
- `chrome-devtools-mcp` for browser debugging during dev
- `playwright-mcp` for automated E2E testing of UI flows

---

## 2. Background and Problem Statement

Tech tutorial creators waste time on finicky setups like OBS's manual PNG masking for rounded webcam PiPs—a "simple" task that demands tutorials and trial-and-error. Existing editors handle basics but falter on seamless, AI-smart PiP compositing, leaving raw footage feeling unpolished. Plus, rigid shape options (circle or bust) kill creativity for niche vibes like "hex for blockchain" or "starburst for that aha moment."

**VidVeil fixes this** with native desktop performance: Record screen + webcam, auto-apply dynamic PiP overlays via natural language ("mask to a floating octagon"), edit on a timeline, and export crisp MP4s. This rapid-build project prioritizes velocity while showcasing MCP-enhanced AI dev tools for faster iteration, including Supabase for cloud project saves, Vercel for rapid deploys, Chrome DevTools for live inspections, and Playwright for test automation.

### Key Innovation

**PiP Magic as the niche hook**—AI detects webcam streams, interprets natural language for any shape (e.g., "heart for love your code"), masks dynamically, positions optimally, and bakes into exports. This slashes setup from minutes to seconds, tailored for 5-15 min tutorials.

---

## 3. Goals and Objectives

### Business Goals

- Ship a functional MVP, then full app, with PiP Magic demo stealing the show—highlighting a wild shape like "wavy amoeba" in the vid.
- Leverage MCP tools to cut dev time 20-30% via AI context (e.g., auto-suggest NuxtUI components via nuxt-mcp; deploy previews via vercel-mcp).
- Target 200+ GitHub stars as a "PiP wizard" for creators; optional Supabase integration for user project syncing.

### User Goals

- One-click record → natural language shape ("circle with spikes") → auto-PiP → timeline tweak → export tutorial-ready video.
- No OBS hacks: AI handles masking, positioning, animations, and shape whimsy (e.g., pulse on speech).

### Success Metrics

- **MVP Gate:** PiP-composited export works flawlessly, including a custom shape.
- **User Testing:** 90% of 5 testers apply a natural language shape in <30s; full edit <8 mins.
- **Performance:** 60fps PiP preview; <4s launch.
- **Dev Efficiency:** MCP logs show 50+ context pulls during build (e.g., playwright-mcp for 80% test coverage).

---

## 4. Target Audience and User Personas

### Primary Audience

**Tech Tutorial Creators:** Devs/educators (25-40) recording screen walkthroughs weekly.

**Pain Points:**
- Rectangular PiPs clash with code
- Manual cropping kills flow
- No fun shapes without pro tools

**Usage:** Quick sessions for LinkedIn/YouTube clips.

### User Persona: Alex the Dev Evangelist

- **Demographics:** 32, full-stack dev, Mac/Windows user.
- **Goals:** Screen-record a 10-min React tutorial with a "glitchy polygon" webcam overlay; export with baked-in PiP, no post-edits.
- **Frustrations:** OBS masking rituals; tools that don't auto-position PiP away from UI hotspots (e.g., code errors) or let shapes match the tutorial's energy.
- **Behaviors:** Uses VS Code/Claude for coding; deploys to Vercel; tests via Playwright; stores projects in Supabase for collab.

---

## 5. Niche Use Case: AI-Enhanced PiP for Tutorial Editing

### Scenario

Alex records a 12-min screen demo of debugging a Node API, narrating via webcam. Raw footage has a square cam feed blocking code lines; he wants a "jagged triangle for that error spike."

### Core Loop with PiP Magic

1. **Record:** Capture screen + webcam + mic; AI auto-detects face and prompts "Shape idea? (e.g., 'spiky orb')".
2. **Magic Apply:** Parse natural language → generate shape (LLM to SVG path params); auto-mask webcam (MediaPipe + custom clip-path); position bottom-right via heuristics (scan for text density).
3. **Edit:** Drag to timeline; AI animates shape (e.g., subtle warp on keyword detection like "error").
4. **Enhance:** Optional Supabase sync for project backups; Vercel preview for quick shares.
5. **Export:** Bake dynamic PiP into MP4; Playwright-tested for cross-browser playback.

This keeps scope tight: Focus on canvas-based masking (feasible in a quick sprint), with MCPs accelerating dev (e.g., chrome-devtools-mcp for real-time UI tweaks). Natural language via lightweight prompt to shape lib (e.g., map to predefined + gen params).

---

## 6. Features and Requirements

Prioritized by MVP vs. Core. All features leverage NuxtUI; use MCPs for LLM-guided implementation (e.g., playwright-mcp to script E2E tests).

### MVP Requirements

**Hard gate:** App must launch, import, preview, trim, and export a single clip with basic PiP as a packaged native app.

#### App Launch
- Desktop window via Tauri (using Nuxtor template)
- Integrate chrome-devtools-mcp for dev-time inspections

#### Video Import
- Drag/drop or file picker (MP4/MOV/WebM)
- Thumbnail previews in media panel

#### Timeline View
- Basic horizontal timeline (Canvas-based via Konva.js)
- Display imported clips as draggable thumbnails

#### Preview Player
- HTML5 `<video>` with play/pause/scrub
- Shows single clip

#### Basic Trim
- Set in/out points on one clip
- Update preview

#### PiP Magic Basics
- For webcam imports, one-click circular mask (`clip-path: circle(50%)`)
- Preview overlay
- Fallback for natural language: Prompt input field with "Describe shape" → basic circle if parse fails

#### Export
- Render trimmed clip + PiP to MP4 (source res) via FFmpeg
- Progress bar
- Save to filesystem

#### Packaging
- Build distributable (.dmg/.exe) via `bun run tauri:build`
- Test via playwright-mcp scripts

### Core Features (Full Submission)

Build on MVP with recording and multi-clip editing.

#### Recording
- **Screen:** Full/window select (Tauri getDisplayMedia)
- **Webcam:** System camera access (getUserMedia); auto-circle mask on capture, with natural language override
- **PiP:** Overlay webcam on screen (simultaneous; AI-position via face detection)
- **Audio:** Mic input; save recording directly to timeline as clip
- **Controls:** Record/stop buttons; auto-save to temp folder (Supabase optional via supabase-mcp)

#### Import & Media Management
- Multi-file import
- Media library with thumbnails/metadata (duration, res, size)
- **AI on Import:** Auto-apply circle PiP to webcam clips; suggest positions; parse "heart shape" input for custom mask

#### Timeline Editor
- Multi-track (2 tracks: video main + PiP overlay)
- Drag/arrange/split/delete clips; zoom/snap; playhead scrubbing
- Trim/split multiple clips; keyboard shortcuts (Space=play, I/O=trim)
- **PiP Edits:** Resize/reposition shape on timeline; animate (e.g., speech-triggered pulse via Web Audio API); edit shape via text prompt

#### Preview & Playback
- Real-time timeline composite (stack tracks with masked PiP)
- 60fps sync audio/video
- Frame-accurate scrub; current-frame thumbnail with live PiP

#### Export & Sharing
- MP4 export (720p/1080p options)
- FFmpeg for stitching/trims + PiP baking (dynamic clip-path to filter)
- Progress UI; local save
- **Bonus:** Vercel deploy preview link (via vercel-mcp); share to clipboard

### AI Helpers (Niche Magic)

#### PiP Wizard
- Auto-mask to circle
- ML-lite detection (MediaPipe Selfie Segmentation npm)
- One-click apply/undo

#### Natural Language Shapes
- User inputs "mask to a [description]" (e.g., "wobbly star")
- LLM parses to SVG path/clip-path params (via simple prompt or lib like shape-from-text)
- Render in Konva
- **Fallback:** Map 10 common shapes (circle, square, heart, hex, etc.)

#### Smart Positioning
- Heuristics for corner placement (e.g., avoid high-motion screen areas)

#### Animation Touches
- Subtle effects (border glow on audio peaks)
- Editable via timeline, shape-aware (e.g., rotate on keyword)

### Stretch Goals (If Time Allows)

- Undo/redo; auto-save to Supabase
- Advanced shapes (e.g., gen from image refs); transitions (morph shapes between clips)
- **E2E Tests:** Playwright scripts for record/edit/export flow (via playwright-mcp), including "input 'triangle' → verify mask"
- Cloud Sync: Supabase for multi-device projects

---

## 7. Technical Stack

Leverage Nuxtor template for fast start (`degit`, `bun install`, `tauri:dev`). Install MCPs via npm for LLM dev assistance.

### Core Framework

- **Desktop Framework:** Tauri v2 (small bundle, Rust backend for FS/media access)
- **Frontend:** Nuxt 4 + NuxtUI 4 (UI components); TailwindCSS; TypeScript. Use nuxt-mcp/vue-mcp for component gen

### Media Processing

- `@ffmpeg/ffmpeg` (WASM for encoding)
- `fluent-ffmpeg` for Node tasks

### Timeline UI

- **Konva.js** (canvas for performant PiP dragging/zoom; shape rendering)
- **Video Player:** HTML5 `<video>` + Plyr for controls

### PiP AI Libs

- `@mediapipe/selfie` (face segmentation for masking)
- CSS clip-path/SVG for shapes
- Lightweight LLM stub (e.g., local prompt parser or xAI API call) for natural language → `{path: 'M10 10 L20 0...', type: 'custom'}`

### MCP Integrations (for LLM dev)

- `nuxt-mcp` - Nuxt-specific context/pulls
- `vue-mcp` - Vue component awareness (via vite-plugin-vue-mcp)
- `context7` - Real-time docs/examples
- `supabase-mcp` - Backend queries (e.g., `npm i @supabase/supabase-js` + MCP server)
- `vercel-mcp` - Deployment tools (`npm i vercel` + MCP for previews)
- `chrome-devtools-mcp` - Browser debugging (`npm i chrome-devtools-mcp`)
- `playwright-mcp` - E2E automation (`npm i @playwright/test` + MCP server)

### Build & Storage

- **Build Tools:** Bun (enforced); ESLint; auto-imports via Nuxtor module
- **Storage:** Tauri's local storage for projects; Supabase via mcp for cloud (optional)

### Setup from Nuxtor

```bash
# Initialize project
npx degit NicolaSpadari/nuxtor vidveil
cd vidveil && bun install

# Add dependencies
bun add @ffmpeg/ffmpeg konva @mediapipe/selfie plyr @supabase/supabase-js vercel @playwright/test chrome-devtools-mcp

# Install MCPs
# Follow GitHub repos (e.g., git clone https://github.com/supabase-community/supabase-mcp for setup)

# Configure Tauri permissions (capabilities/main.json) for media devices/FS

# Dev
bun run tauri:dev
# Use chrome-devtools-mcp for inspections, playwright-mcp for npx playwright test
```

### Architecture

**Frontend (Nuxt):** Pages for recorder, library, timeline, preview/export. Pinia store for clips `{id, src, start, end, track, pipMask: {shape: {type: 'custom', path: '...', desc: 'user input'}, pos: [x,y]}}`

**Backend (Tauri/Rust):** Commands for capture (invoke from JS), FFmpeg spawning

**Data Flow:** Webcam stream + NL input → LLM parse → MediaPipe mask + Konva shape → FFmpeg composite

**MCP Flow:** LLM queries (e.g., "Generate shape parser component") pull from nuxt-mcp; test via playwright-mcp

---

## 8. Non-Functional Requirements

### Performance
- Responsive UI (10+ clips)
- 60fps PiP preview (even custom shapes)
- <4s launch
- No leaks (test 15min sessions via chrome-devtools-mcp)

### Compatibility
- Mac/Windows (test on real hardware via playwright-mcp)
- MP4 import/export

### Accessibility
- Keyboard nav
- High-contrast mode (NuxtUI)
- ARIA for PiP controls and shape inputs

### Security
- Sandboxed Tauri
- Supabase auth via mcp (OAuth)
- No external deps for core media

### Testing Scenarios

1. Record 30s screen + webcam → input "diamond shape" → auto-PiP → timeline → trim → export (Playwright script)
2. Import 3 clips → arrange/split → reposition PiP → 2min export
3. Vercel preview: Deploy & test share link

---

## 9. Build Phases (Flexible Sprint)

### Phase 1: Foundation
Setup Nuxtor + MCPs; implement import/preview/trim + basic circle PiP (MVP core). Use vercel-mcp for quick deploy test.

### Phase 2: Core Loop
Timeline basics; single-clip export with PiP; package/test MVP. Run playwright-mcp E2E.

### Phase 3: Polish & Ship
Add recording; multi-track; PiP animations + natural language shapes; Supabase sync; full export; demo video.

### Submission
- GitHub repo
- 3-5min demo (screen record of PiP loop with a "flame shape" parse)
- Packaged app on Releases
- README with build instr + MCP setup

---

## 10. Risks and Dependencies

### Risks
- **LLM shape parsing edge cases** (e.g., "banana" → fallback to ellipse)
- **MediaPipe perf on low-end hardware** (mitigate: Fallback to CSS clip-path)
- **MCP setup delays** (pre-install via scripts)

### Dependencies
- Rust toolchain/Bun
- FFmpeg binary (bundle)
- **External:** Supabase/Vercel accounts for mcp testing; optional xAI API key for NL parsing

### Assumptions
- Rapid solo dev
- Access to test hardware
- LLM uses MCPs for 80% code gen

---

## 11. Appendix

### Submission Format
- **GitHub repo** (README: setup, arch diagram, MCP install guide)
- **Demo video** (upload to YouTube, focus on PiP magic with NL shape demo)
- **Distributable link**

### Inspiration
CapCut's simplicity + Descript's AI edits + OBS PiP ease + Midjourney's text-to-form, powered by MCP velocity.

### MCP Quickstart
For each, clone GitHub repo, run `npm install`, connect via Cursor/Claude (e.g., Supabase: Dashboard > MCP tab).

---
