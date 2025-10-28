# VidVeil

AI-Powered Desktop Video Editor with PiP Magic 🎬✨

Built with **Tauri + Nuxt 4 + NuxtUI 4** for lightning-fast native performance.

![VidVeil](./docs/vidveil-hero.png)

## 🚀 Features

### Core Editing
- ✂️ **Timeline Editing** - Trim, split, and arrange video clips
- 📁 **Drag & Drop** - Import media files seamlessly
- 🎥 **Screen Recording** - Built-in screen capture with webcam overlay
- 📷 **Webcam Support** - Record with camera feed

### AI-Powered PiP Magic
- ✨ **Custom Shapes** - Generate any shape with natural language
- 🎯 **Smart Positioning** - AI automatically places PiP overlays
- 🎬 **Professional Effects** - Border, shadow, and animation controls

### Cloud Sync
- ☁️ **Supabase Integration** - Auto-save projects to cloud
- 🔄 **Multi-Device** - Access projects from anywhere
- 👥 **Collaborative** - Share projects with your team

## 🛠️ Tech Stack

- **Frontend**: Nuxt 4 + NuxtUI 4 + Vue 3
- **Desktop**: Tauri 2 (Rust)
- **Video**: FFmpeg + Konva.js
- **AI**: OpenAI (GPT-4) + Vercel AI SDK
- **Backend**: Supabase (PostgreSQL)
- **AI Models**: TensorFlow.js Body Segmentation

## 📦 Installation

### Prerequisites
- Node.js >= 23
- Bun >= 1.2.22
- **Rust** (REQUIRED for Tauri desktop builds)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

### Setup

1. **Clone the repo**
```bash
git clone https://github.com/ielvisd/vidveil.git
cd vidveil/clipforge
```

2. **Install dependencies**
```bash
bun install
```

3. **Configure environment**
Create `.env` file:
```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
```

4. **Run migrations**
Go to Supabase Dashboard → SQL Editor and run `docs/supabase-schema.sql`

5. **Start dev server**
```bash
# Browser mode
bun run dev

# Desktop mode (requires Rust)
bun run tauri:dev
```

## ⚠️ Common Setup Issues

### "failed to run 'cargo metadata'" Error

**If you see this error when running `bun run tauri:build` or `bun run tauri:dev`:**

```
failed to run 'cargo metadata' command to get workspace directory: 
No such file or directory (os error 2)
```

**This means Rust is not installed.** VidVeil requires Rust/Cargo for the Tauri desktop framework.

**Solution:**

```bash
# Install Rust (includes Cargo)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow the installation prompts (usually just press Enter)

# Reload your shell to update PATH
source $HOME/.cargo/env

# Verify installation
cargo --version
rustc --version

# Now try building again
bun run tauri:build
```

**Note:** Rust installation is only required for desktop builds. Browser mode (`bun run dev`) works without Rust.

---

## 📖 Usage

### Creating Your First Project

1. **Launch VidVeil** → Click "My Projects"
2. **Sign In** → Use email/password or OAuth (GitHub/Google)
3. **Create Project** → Click "New Project" and enter a name
4. **Import Media** → Click "Import Media" or record screen
5. **Edit** → Drag clips to timeline, trim, arrange
6. **Add PiP** → Select a shape from the PiP panel
7. **Export** → Click "Export Video" to render

### Natural Language Shapes

Describe any shape you want:
- "Make it a heart"
- "Star shape please"
- "Heptagon"
- "Custom hexagon with rounded corners"

The AI will generate the perfect PiP shape!

## 🏗️ Project Structure

```
vidveil/clipforge/
├── app/
│   ├── pages/           # Routes
│   │   ├── projects.vue
│   │   ├── project/[id].vue
│   │   ├── library.vue
│   │   ├── recorder.vue
│   │   └── login.vue
│   ├── components/      # Reusable components
│   ├── composables/     # Vue composables (state)
│   └── layouts/         # Page layouts
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── commands/    # Tauri commands
│   │   └── lib.rs
└── docs/                # Documentation
    ├── supabase-schema.sql
    └── mcp-setup.md
```

## 🧪 Development

### Available Scripts

```bash
# Development
bun run dev              # Browser mode (http://localhost:3000)
bun run tauri:dev        # Desktop mode with hot reload

# Build
bun run generate         # Static site
bun run tauri:build      # Desktop app (.dmg for macOS, .exe for Windows)
bun run tauri:build:debug # Debug build (faster compilation)

# Code Quality
bun run lint             # ESLint
```

### Building Desktop Application

**macOS Build:**
```bash
bun run tauri:build
```
Output: `src-tauri/target/release/bundle/dmg/VidVeil_*.dmg`

**Windows Build:**
```bash
bun run tauri:build --target x86_64-pc-windows-msvc
```
Output: `src-tauri/target/release/bundle/msi/VidVeil_*.msi`

**Requirements:**
- macOS: Xcode Command Line Tools
- Windows: Visual Studio Build Tools + WiX Toolset

See `docs/DEVELOPMENT.md` for detailed build instructions.

### MCP Servers

This project uses Model Context Protocol for development assistance:

- `@nuxt-mcp` - Nuxt 4 documentation
- `@vue-mcp` - Vue components & NuxtUI
- `@supabase-mcp` - Database operations
- `@playwright-mcp` - E2E testing

See `.cursor/mcp.json` for configuration.

## 🎯 Roadmap

- [x] PR-1 to PR-22: Core functionality
- [ ] PR-21: FFmpeg Export Pipeline
- [ ] PR-22: Export UI & Progress
- [ ] PR-24: Performance Optimization
- [ ] PR-27: E2E Tests with Playwright
- [ ] PR-32: App Packaging & Distribution

See [TASKS.md](./TASKS.md) for complete task list.

## 🤝 Contributing

This is a personal project, but feedback is welcome!

## 📄 License

MIT © Elvis Ibarra

## 🙏 Acknowledgments

- Built on [Nuxtor](https://github.com/NicolaSpadari/nuxtor) template
- Powered by [Tauri](https://tauri.app), [Nuxt](https://nuxt.com), [NuxtUI](https://ui.nuxt.com)
- AI by [OpenAI](https://openai.com) and [Vercel AI SDK](https://sdk.vercel.ai)

---

**Made with ❤️ by Elvis Ibarra**
