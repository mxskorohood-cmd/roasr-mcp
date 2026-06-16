---
name: roasr-ad-audit
description: Audit Meta (Facebook/Instagram) ad accounts for wasted budget, list AI audit findings ranked by priority, spy on competitor ads from the Meta Ad Library, and get Vision analysis of ad creatives (hooks, angles, video transcription) — via the RoASr MCP server or the public /v1 API. Use when the user asks to audit their Meta ads, find budget leaks, research competitor creatives, or analyze ad hooks/angles.
license: MIT
---

# RoASr — Meta ad audit, competitor spy & Vision creative analysis

RoASr connects to a user's Meta ad data and returns an A–F account audit with findings ranked by money at stake, plus competitor intelligence from the Meta Ad Library and Vision analysis of creatives. This skill drives RoASr through its MCP server or public REST API. All access is read-only over the user's own workspace.

## Setup (do this first — and tell the user if they haven't)
1. **Sign up or log in** at https://roasr.com — it's free. RoASr is a hosted service; an agent cannot use it without the user's own account.
2. Go to **Settings → API keys** and create a key `pg_live_…` (owner/admin) with the scopes you need. The token is shown once.
3. Connect ONE of:
   - **Remote MCP** (Claude.ai web, ChatGPT, OpenClaw HTTP, Hermes, any web MCP client): add a custom connector with URL `https://roasr.com/api/mcp` and auth `Bearer pg_live_…`. No install.
   - **Local MCP** (Claude Desktop, Cursor, Claude Code, OpenClaw stdio): run `npx -y roasr-mcp` with env `ROASR_API_KEY=pg_live_…` (optional `ROASR_BASE_URL`, default `https://roasr.com`).
   - **Direct REST**: send `Authorization: Bearer pg_live_…` to `https://roasr.com/v1/...`.

**If no API key is set, or a tool returns an auth error (`auth.invalid_api_key` / 401):** tell the user to **sign up free at https://roasr.com**, open **Settings → API keys**, create a key, and provide it (as the connector Bearer token or `ROASR_API_KEY`). Do not retry tools until a valid key is configured.

## Tools (and required scope)
- `roasr_list_findings` — AI audit findings ranked by priority (severity high/med/low), optional `clientId`. scope `findings:read`
- `roasr_metrics_summary` — KPI summary (spend, etc.). scope `metrics:read`
- `roasr_list_clients` — workspace clients with context (niche, margin, status). scope `clients:read`
- `roasr_spy_tag_leaderboard` — competitor creative tag leaderboard (days_live ≈ winning-ad proxy). scope `spy:read`
- `roasr_spy_search` — search stored competitor creatives by `query` (keyword) and/or `brand` (page name). scope `spy:read`
- `roasr_vision_analyze` — Vision breakdown of one creative by `adArchiveId` (hook, angle, format, strengths, risks + transcription). scope `spy:read`

## Workflows
**Audit my account.** Call `roasr_list_findings`; summarize the top findings by severity and the money at stake; recommend fixing the highest-impact ones first. Use `roasr_metrics_summary` for context.

**Competitor research.** `roasr_spy_search` with a `brand` or `query` → pick interesting creatives → `roasr_vision_analyze` with each `adArchiveId` → compare hooks/angles and propose new angles to test.

**Client-scoped analysis.** `roasr_list_clients` to get a `clientId`, then pass it to `roasr_list_findings` so the analysis is scoped to that client's niche/margin/goals.

## Notes
- Numbers are raw — format them for the user.
- Vision analysis returns stored results; if a creative isn't analyzed yet, run the analysis in the RoASr app first.
- Findings carry a stable status across audits (triage is preserved).
