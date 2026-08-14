# Examples

These examples use the continuity workflow that Cortex currently exposes:

```text
start → capture → handoff → resume → detect → verify
```

## Start a task

Create a repository-scoped task with an explicit acceptance condition:

```bash
cortex start "Replace the legacy auth middleware" \
  --acceptance "Auth integration tests pass" \
  --agent codex
```

Keep the returned `taskId` and `attemptId`; the following commands use them to
attach evidence to the same attempt.

## Capture a decision and a blocker

Capture high-signal project state rather than an entire chat transcript:

```bash
cortex capture --task <taskId> --attempt <attemptId> \
  --kind decision \
  --summary "Keep the middleware boundary; replace only the token adapter" \
  --source human

cortex capture --task <taskId> --attempt <attemptId> \
  --kind blocker \
  --summary "The staging issuer is missing the new audience claim" \
  --source test
```

Use the source to make later verification and review meaningful. Never record
secrets, tokens, or complete conversation transcripts.

## Hand off to another agent

At the end of a session, create a compact handoff with the next safe action:

```bash
cortex handoff --task <taskId> --attempt <attemptId> \
  --next "Update the staging issuer audience, then rerun auth integration tests"
```

The result includes machine-readable JSON and human-readable Markdown. Attach
the Markdown to a pull request or issue when a teammate needs to review it.

## Resume safely

The next agent can retrieve the handoff and check whether the repository has
drifted since it was created:

```bash
cortex resume <taskId>
cortex detect <taskId>
```

Read the reported branch, commit, worktree, and remote status before acting on
the packet. A handoff is a derived view; it does not make an unverified claim
true by itself.

## Verify a result

Record verification from a concrete source such as a test command or CI check:

```bash
cortex verify --task <taskId> --attempt <attemptId> \
  --summary "Auth integration tests pass on the staging configuration" \
  --source test
```

Use the [handoff contract](../architecture/HANDOFF_CONTRACT.md) for the
authority, freshness, conflict, and provenance rules behind these records.

## Connect an MCP client

For Claude Desktop, Cursor, Windsurf, or another MCP client:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bunx",
      "args": ["@ecuabyte/cortex-mcp-server"]
    }
  }
}
```

The MCP server exposes the same project-scoped lifecycle through
`cortex_start`, `cortex_capture`, `cortex_handoff`, `cortex_resume`,
`cortex_detect`, and `cortex_verify`. See the [universal setup guide](../UNIVERSAL_SETUP.md)
for client-specific configuration.
