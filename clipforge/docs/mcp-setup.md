# MCP Setup Guide for VidVeil

## Overview

MCP (Model Context Protocol) servers provide context and documentation to AI assistants. For VidVeil development, we'll use MCPs as development aids, not runtime dependencies.

## Current MCP Usage

Since most MCP servers are not yet available as npm packages, we're using them conceptually in development:

1. **nuxt-mcp** - Reference Nuxt 4 documentation via web when needed
2. **vue-mcp** - Reference Vue 3 and NuxtUI docs when needed  
3. **context7** - Available via npm
4. **supabase-mcp** - Reference Supabase docs directly
5. **vercel-mcp** - Reference Vercel docs directly
6. **chrome-devtools** - Use browser devtools directly
7. **playwright-mcp** - Use Playwright CLI directly

## Development Workflow

Instead of relying on external MCP servers, the `.cursorrules` file guides the AI to:

1. Use official documentation (Nuxt, Vue, NuxtUI)
2. Reference Supabase docs for database operations
3. Use Playwright CLI for testing
4. Use browser devtools for debugging
5. Query OpenAI/context7 when AI assistance is needed

## Available MCP Tools

The following are actually available:

### Context7
```bash
npm install -g context7-mcp
```

### Playwright (via CLI, not MCP)
```bash
npm install -D @playwright/test
npx playwright test
```

## Future Setup

When MCP packages become available:

1. Install each MCP server package
2. Configure in `.cursor/mcp.json`
3. Set environment variables
4. Test connections

For now, we follow the same development principles through manual documentation reference and the `.cursorrules` guidance.
