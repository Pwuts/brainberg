# Admin MCP Server

**Status:** ⬜ Not started

Expose the existing admin API as an [MCP](https://modelcontextprotocol.io/) server so an agent (Claude Desktop, Claude Code, etc.) can triage events, run scrapers, and maintain the catalog directly.

## Goal

Thin wrapper around the already-shipped admin API routes under [`src/app/api/admin/`](../src/app/api/admin/). No new business logic — the MCP tools reuse the existing query/mutation functions in [`src/lib/admin.ts`](../src/lib/admin.ts).

## Scope

- One Streamable HTTP endpoint at [`src/app/api/mcp/route.ts`](../src/app/api/mcp/) (new).
- Uses `@modelcontextprotocol/sdk` with the Streamable HTTP transport (matches Next.js App Router handler shape).
- Auth via `ADMIN_SECRET` supplied as a bearer token / MCP auth header. Same secret already used by the admin UI cookie session and API routes.

## Tools

| Tool | Wraps | Purpose |
| ---- | ----- | ------- |
| `search_events` | `/api/search` | Full-text search (tsvector + prefix tsquery). Returns title, starts_at, city, category, status. |
| `list_events` | `GET /api/admin/events` | Paginated list with `status`, `source`, `category`, `city` filters. |
| `get_event` | `GET /api/admin/events/[id]` | Full event record including sources, fingerprints, moderation history. |
| `create_event` | `POST /api/admin/events` | Manual insert (e.g. from a referral an organizer emailed). |
| `update_event` | `PATCH /api/admin/events/[id]` | Edit any field; honors `category_locked`. |
| `approve_event` | `POST /api/admin/events/[id]/approve` | Move `pending` → `approved`. |
| `reject_event` | `POST /api/admin/events/[id]/reject` | Move any status → `rejected` with reason. |
| `delete_event` | `DELETE /api/admin/events/[id]` | Hard delete (rare; prefer reject). |
| `run_scraper` | `POST /api/admin/scrapers/run` | Trigger a single scraper by source name, optional date range. |
| `get_scraper_status` | `GET /api/admin/scrapers` | Latest run per source + counts. |

## Out of scope

- Preview/stage/commit flow — keep that in the web UI, not the agent.
- Public-facing MCP (no user-auth flow yet; guarded by `ADMIN_SECRET` only).
- AI moderator tools — `MODERATING.md` edits + "Re-categorize All" stay in the UI.

## New dependencies

```json
"@modelcontextprotocol/sdk": "^<latest>"
```

## Open questions

- Streamable HTTP vs. stdio: HTTP is the right fit for Next.js + deployed brainberg.eu. Stdio would need a separate binary build.
- Do we want a read-only mode (bearer token that unlocks only the `search_*`/`list_*`/`get_*`/`*_status` tools) for sharing with contributors? Defer until there's a second user.
- Rate limiting — rely on the Next.js edge proxy for now; revisit if abused.

## Verification

- `mcp inspect http://localhost:3000/api/mcp` lists all tools.
- Claude Desktop config pointed at the endpoint can run `search_events`, `approve_event`, and `run_scraper` end-to-end.
