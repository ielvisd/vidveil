# MCP Setup Guide for VidVeil

## Overview

MCP (Model Context Protocol) servers provide context and documentation to AI assistants. For VidVeil development, we use MCPs as development aids to ensure best practices and avoid reinventing patterns.

## MCP Servers Configured

All 7 MCP servers are now configured in `.cursor/mcp.json`:

1. **nuxt-mcp** - Nuxt 4 documentation and examples
2. **vue-mcp** - Vue 3 and NuxtUI component patterns
3. **context7** - Real-time documentation and examples
4. **supabase-mcp** - Database operations and queries
5. **vercel-mcp** - Deployment workflows
6. **chrome-devtools-mcp** - Browser debugging
7. **playwright-mcp** - E2E test generation and execution

## Installation

Install all MCP servers globally:

```bash
npm install -g @modelcontextprotocol/server-nuxt
npm install -g vite-plugin-vue-mcp
npm install -g @modelcontextprotocol/server-context7
npm install -g @modelcontextprotocol/server-playwright
npm install -g @modelcontextprotocol/server-supabase
npm install -g @modelcontextprotocol/server-chrome-devtools
npm install -g @modelcontextprotocol/server-vercel
```

## Configuration

The `.cursor/mcp.json` file is configured with all servers. Environment variables are required:

```env
CONTEXT7_API_KEY=your_context7_api_key
VERCEL_TOKEN=your_vercel_token
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_KEY=your_supabase_key
```

## Development Workflow

**MANDATORY:** For every new feature:

1. **Query MCP first** - Use appropriate MCP server for framework-specific help
2. **Search codebase** - Understand existing patterns
3. **Implement** - Follow MCP guidance and existing patterns
4. **Test** - Validate with automated tests

## Usage Guide

See `docs/mcp-usage-guide.md` for detailed usage instructions and example queries for each MCP server.

## Validation

After setup:
1. Restart Cursor/Claude to load MCP configuration
2. Test each MCP server responds successfully
3. Verify environment variables are set
4. Check `.cursor/mcp.json` exists in project root
