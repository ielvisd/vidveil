# MCP Usage Guide for VidVeil Development

## When to Use Each MCP

### nuxt-mcp
- Creating new pages or layouts
- Configuring nuxt.config.ts
- Setting up Nuxt modules
- Understanding Nuxt 4 file structure

Example queries:
- "How do I create a dynamic route in Nuxt 4?"
- "What's the proper way to configure Tauri in nuxt.config.ts?"

### vue-mcp  
- Building Vue components
- Using NuxtUI components (Button, Card, Dialog, etc.)
- Implementing Vue 3 Composition API patterns
- Creating composables

Example queries:
- "Show me NuxtUI Dialog component with form validation"
- "How do I use useFetch in Nuxt 4?"

### playwright-mcp
- Generating E2E test files
- Writing test assertions
- Configuring Playwright for Tauri
- Debugging test failures

Example queries:
- "Generate E2E test for video import flow"
- "How do I test file upload with Playwright?"

### supabase-mcp
- Writing database queries
- Setting up RLS policies
- Managing auth flows
- Performing migrations

Example queries:
- "Query all clips for a project with user check"
- "Create RLS policy for projects table"

### chrome-devtools-mcp
- Debugging browser issues
- Inspecting Vue component state
- Analyzing network requests
- Performance profiling

### vercel-mcp
- Deploying landing page
- Managing deployment previews
- Configuring build settings

## MANDATORY: Query MCP Before Implementation

For EVERY new feature:
1. Identify which MCP can help
2. Query MCP with specific question
3. Review MCP response
4. Implement following MCP guidance
5. If MCP unavailable, use web_search

## Installation Commands

```bash
# Install all MCP servers globally
npm install -g @modelcontextprotocol/server-nuxt
npm install -g vite-plugin-vue-mcp
npm install -g @modelcontextprotocol/server-context7
npm install -g @modelcontextprotocol/server-playwright
npm install -g @modelcontextprotocol/server-supabase
npm install -g @modelcontextprotocol/server-chrome-devtools
npm install -g @modelcontextprotocol/server-vercel
```

## Environment Variables Required

Add these to your `.env` file:
```env
CONTEXT7_API_KEY=your_context7_api_key
VERCEL_TOKEN=your_vercel_token
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_KEY=your_supabase_key
```

## Validation Checklist

- [ ] `.cursor/mcp.json` exists in project root
- [ ] All 7 MCP servers configured
- [ ] Restart Cursor/Claude to load MCP configuration
- [ ] Test each MCP server responds successfully
- [ ] Environment variables set correctly
