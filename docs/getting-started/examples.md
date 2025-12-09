# Examples

Real-world examples of using Cortex in your development workflow.

## Example 1: Starting a New Project

Record your tech stack and architectural decisions:

```bash
# Backend framework
cortex add -c "Using Fastify instead of Express for better performance" \
  -t "decision" -s "backend-setup"

# Database
cortex add -c "PostgreSQL database with Prisma ORM" \
  -t "fact" -s "database"

# Authentication
cortex add -c "Using Clerk for authentication" \
  -t "fact" -s "auth"

# Deployment
cortex add -c "Deploying to Railway, auto-deploys from main branch" \
  -t "config" -s "deployment"
```

Now when you ask your AI assistant: *"Create a new API endpoint for users"*

The AI will automatically:
- Use Fastify patterns
- Generate Prisma queries
- Include Clerk auth middleware
- Follow your project conventions

## Example 2: Recording Code Patterns

Document your team's conventions:

```bash
# API conventions
cortex add -c "All API responses use {success, data, error} format" \
  -t "code" -s "api-patterns" \
  --tags "conventions,api"

# Error handling
cortex add -c "Use custom AppError class that extends Error with statusCode" \
  -t "code" -s "error-handling" \
  --tags "conventions,errors"

# Testing
cortex add -c "Integration tests use testcontainers for database" \
  -t "code" -s "testing" \
  --tags "conventions,tests"
```

## Example 3: Onboarding New Team Members

New developer joins? They can query Cortex:

```bash
# Get project overview
cortex search "architecture"

# Learn about authentication
cortex search "auth"

# Find deployment process
cortex list --type config

# Understand decisions
cortex list --type decision
```

Your AI assistant can also answer:
- *"How do we handle authentication?"*
- *"What's our deployment process?"*
- *"Why did we choose Fastify over Express?"*

## Example 4: Multi-Project Setup

Working on multiple projects:

```bash
# Project A: E-commerce site
cd ~/projects/shop-app
cortex add -c "Using Stripe for payments" -t "fact" -s "payments"
cortex add -c "Product images stored in Cloudinary" -t "config" -s "media"

# Project B: Admin dashboard
cd ~/projects/admin-dashboard
cortex add -c "Using Chart.js for analytics" -t "fact" -s "frontend"
cortex add -c "Real-time updates via WebSocket" -t "fact" -s "realtime"

# Each project has isolated memories!
cd ~/projects/shop-app
cortex list  # Only shows shop-app memories

cd ~/projects/admin-dashboard
cortex list  # Only shows admin-dashboard memories
```

## Example 5: Recording Bug Fixes

Document tricky bugs and their solutions:

```bash
cortex add -c "CORS issue: Need to set credentials: true in Fastify CORS config" \
  -t "note" -s "bug-fix" \
  --tags "cors,security"

cortex add -c "Memory leak in WebSocket: Must call ws.close() in cleanup" \
  -t "note" -s "bug-fix" \
  --tags "websocket,performance"
```

Later, when similar issues appear:
```bash
cortex search "CORS"
cortex search "memory leak"
```

## Example 6: API Configuration

Record all your service configurations:

```bash
# Environment variables
cortex add -c "DATABASE_URL is in .env, use prisma://accelerate for prod" \
  -t "config" -s "environment"

# Third-party services
cortex add -c "SendGrid API key for emails, templates in /email-templates" \
  -t "config" -s "email"

# Feature flags
cortex add -c "Feature flag ENABLE_BETA_FEATURES controls new UI" \
  -t "config" -s "feature-flags"
```

## Example 7: VS Code Extension Workflow

Using the visual interface:

1. **Browse by Category**
   - Click "Facts" in TreeView to see all project facts
   - Click "Decisions" to review architectural choices

2. **Add Memory with Context Menu**
   - Right-click on a function
   - Select "Cortex: Add Memory from Selection"
   - It auto-fills the content with selected code

3. **Search Visually**
   - Use Command Palette: `Cortex: Search Memories`
   - Type your query
   - Results appear in the sidebar
   - Click to view full details in Webview

## Example 8: Integration with Claude

In Claude Desktop:

```
You: Remember that we use React 19 with Server Components

Claude: [Uses cortex_add tool]
Understood! I've recorded that your project uses React 19 with Server Components.

You: Create a new dashboard component

Claude: [Uses cortex_search tool to find "React"]
I'll create a dashboard component using React 19 Server Components:
[generates appropriate code]
```

## Example 9: GitHub Copilot Integration

In VS Code with MCP configured:

```typescript
// You type:
async function getUser

// Copilot autocompletes using your memories:
async function getUser(id: string) {
  // Uses Prisma (from your memory)
  const user = await prisma.user.findUnique({
    where: { id }
  });
  
  // Uses your API response format (from your memory)
  return { success: true, data: user, error: null };
}
```

## Example 10: Monorepo Setup

Working with monorepos:

```bash
# Root workspace
cd ~/projects/my-monorepo
cortex add -c "Turborepo for build orchestration" -t "fact" -s "monorepo"

# Each package has its own memories
cd packages/web
cortex add -c "Next.js 15 app" -t "fact" -s "package"

cd ../api
cortex add -c "Fastify REST API" -t "fact" -s "package"

cd ../shared
cortex add -c "Shared TypeScript types for all packages" -t "fact" -s "package"
```

Cortex detects each package as a separate context!

## Example 11: Daily Development

A typical day with Cortex:

```bash
# Morning: Start working on new feature
cortex add -c "Starting OAuth integration feature branch" \
  -t "note" -s "current-work"

# During development: Record decisions
cortex add -c "Using Passport.js for OAuth, supports Google & GitHub" \
  -t "decision" -s "oauth"

# Found a gotcha
cortex add -c "OAuth callback must match exactly in Google Console" \
  -t "note" -s "oauth-setup"

# End of day: Check what you did
cortex list --limit 5
cortex stats
```

## Example 12: Search Patterns

Effective searching:

```bash
# Broad search
cortex search "auth"

# Specific search
cortex search "OAuth callback"

# By type
cortex list --type decision

# Get stats
cortex stats  # See distribution by type

# Recent memories
cortex list --limit 10
```

## Tips for Maximum Effectiveness

1. **Be Specific** - Clear, detailed memories are more useful
   ```bash
   # ❌ Bad
   cortex add -c "using auth" -t "fact" -s "code"
   
   # ✅ Good
   cortex add -c "Using Clerk Authentication with middleware in middleware.ts, protects all /api routes" \
     -t "fact" -s "authentication"
   ```

2. **Use Tags** - Organize related memories
   ```bash
   cortex add -c "..." -t "fact" -s "..." --tags "api,security,production"
   ```

3. **Add Source Context** - Use meaningful sources
   ```bash
   -s "pr-#123"
   -s "team-meeting-2025-12"
   -s "architecture-review"
   ```

4. **Regular Reviews** - Check and clean up
   ```bash
   # Weekly: Review what you've added
   cortex list --limit 20
   
   # Monthly: Clean up outdated memories
   cortex delete <id>
   ```

---

**Want more examples?** Check out [CLI Usage](../guides/cli-usage.md) and [MCP Integration](../guides/mcp-integration.md).
