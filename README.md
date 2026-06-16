# roasr-mcp

**English · [Русский](README.ru.md)**

**MCP server for [RoASr](https://roasr.com)** — connect Claude, Cursor, or any MCP client to your RoASr ad-analytics workspace: Meta/Google **ad-audit findings, KPI summaries, competitor spy and Vision creative analysis**. A thin, **dependency-free** client over the public `/v1` REST API.

> Auth is by your `pg_live_…` API key; workspace isolation and scopes are enforced API-side. The server is read-only and stateless.

---

## Quick start

### 1. Get an API key
Sign in at **https://roasr.com → Settings → API keys** → create a `pg_live_…` key with the scopes you need (shown once).

### 2. Connect — pick one

**A. Remote connector — no install** (Claude.ai web, ChatGPT, any HTTP MCP client):

```
URL:  https://roasr.com/api/mcp
Auth: Bearer pg_live_…
```

**B. Local via npx** (Claude Desktop, Cursor, Claude Code) — add to your MCP config:

```json
{
  "mcpServers": {
    "roasr": {
      "command": "npx",
      "args": ["-y", "roasr-mcp"],
      "env": {
        "ROASR_API_KEY": "pg_live_…",
        "ROASR_BASE_URL": "https://roasr.com"
      }
    }
  }
}
```

> Until the npm package is published, use `"args": ["-y", "github:mxskorohood-cmd/roasr-mcp"]`.

**C. From source:**

```bash
git clone https://github.com/mxskorohood-cmd/roasr-mcp && cd roasr-mcp
npm install && npm run build
ROASR_API_KEY=pg_live_… node dist/index.js
```

---

## Tools

| Tool | Description | Endpoint · scope |
|---|---|---|
| `roasr_list_findings` | AI-audit findings by priority (optional client filter) | `GET /v1/findings` · `findings:read` |
| `roasr_metrics_summary` | Ad KPI summary | `GET /v1/metrics/summary` · `metrics:read` |
| `roasr_list_clients` | Workspace clients with context | `GET /v1/clients` · `clients:read` |
| `roasr_spy_tag_leaderboard` | Competitor creative tag leaderboard (days_live ≈ winner) | `GET /v1/spy/tags` · `spy:read` |
| `roasr_spy_search` | Search stored competitor creatives (hook / headline / tags / brand) | `GET /v1/spy/search` · `spy:read` |
| `roasr_vision_analyze` | Vision breakdown of a creative by `ad_archive_id` (hook / angle / risks + transcript) | `GET /v1/vision/analyze` · `spy:read` |

> Spy (`spy_search` + `vision_analyze`) is the edge — your AI gets data that lives nowhere else. Ad Library scans and Vision analysis (LLM/credits) run **inside the RoASr app**; this server returns the already-stored result.

---

## Configuration

| Env | Required | Default |
|---|---|---|
| `ROASR_API_KEY` | ✅ | — (server exits with an actionable error if missing) |
| `ROASR_BASE_URL` | — | `https://roasr.com` |

---

## Development

```bash
npm install      # installs devDeps + builds dist/ (prepare hook)
npm run build    # tsc → dist/index.js (executable bin, shebang)
npm test         # vitest — unit tests with a fake client (no network)
npm run dev      # tsx src/index.ts
```

Layout: `src/index.ts` (entry, env validation, fail-loud) · `src/protocol.ts` (dependency-free JSON-RPC 2.0 stdio + `runMcpServer`/`ToolDef`) · `src/client.ts` (`RoasrClient`, Bearer auth, error-envelope unwrap) · `src/tools.ts` (`buildTools` → 6 tools). `SKILL.md` is an agent-skills navigator for AI agents.

> Inside the RoASr monorepo this package builds via `pnpm --filter roasr-mcp build`.

---

## Notes / invariants

- **stdout is protocol-only** — all logs go to `stderr` (a stray `console.log` breaks JSON-RPC).
- **Fail-loud** — missing `ROASR_API_KEY` → actionable stderr message + `exit(1)`.
- **Tool errors** surface as `{ isError: true }` (MCP convention), so the client can recover.
- **Read-only**; scopes are enforced API-side by the key.
- **Vision / Ad-Library results are pre-computed** in the app — `vision_analyze` returns a stored breakdown.

---

## License

[MIT](LICENSE) © 2026 SmartFlow LLC — [roasr.com](https://roasr.com)
