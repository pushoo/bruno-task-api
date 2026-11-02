# Connect Claude to the Task API MCP server (episode 21)

Checked against code.claude.com/docs/en/mcp on 2 Nov 2026. Check again on recording day.

## Claude Code (recommended for the episode)

Start the API first (`npm start`), then in a second terminal inside `~/Movies/task-api`:

```bash
claude mcp add --transport http --scope project task-api http://localhost:3000/mcp
claude mcp list          # task-api should show ✔ Connected (or "Pending approval" until you run claude)
claude                   # approve the project server when asked, then type /mcp to see its 5 tools
```

`--scope project` writes `.mcp.json` in the project folder (a copy is in this kit). It is safe to commit: it holds a localhost URL and no secrets.

Prompts for the episode:
1. "List my tasks."  (tool: list_tasks)
2. "Add a high priority task called Publish episode 21."  (tool: create_task)
3. "Mark it done."  (tool: update_task)
4. "Run the Bruno tests with npm test and tell me what passed."  (Claude runs bru run and reads the result)

Show the approval prompt before each tool call. Keep it on demo data only.

## Claude desktop app

The desktop config file is for local (stdio) servers. A localhost HTTP server is usually bridged with mcp-remote. Verify on recording day:

```json
{
  "mcpServers": {
    "task-api": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/mcp"]
    }
  }
}
```

## claude.ai custom connectors

These need a public HTTPS URL. localhost will not work, so the episode uses Claude Code.
