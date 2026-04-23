# Brainberg Contributor Notes

Guidance for contributors and AI coding assistants working on this codebase.
Short and high-signal. Extend when durable patterns emerge.

## Getting started (local dev)

```bash
docker compose -f docker/docker-compose.dev.yml up -d
DATABASE_URL="postgresql://brainberg:devpassword@localhost:5432/brainberg_dev"
pnpm db:push    # Apply schema (dev only, no migrations)
pnpm db:seed    # Seed countries, cities, sample events
pnpm dev        # Start dev server
```

## Migrations

- Generated: `DATABASE_URL="..." pnpm db:generate`
- Applied locally: `DATABASE_URL="..." npx drizzle-kit migrate`
- Applied in production: automatically on container start via
  `docker/entrypoint.sh` → `migrate.js`
- First-run seeding: `migrate.ts` seeds countries (40) + cities (60) if the
  countries table is empty
- The migration runner is bundled with esbuild during Docker build

## Environment variables

When adding a new env var, update **every** place it needs to flow through —
missing one usually fails silently (undefined at runtime, or an empty string
baked into the client bundle).

**Private server-side var** (e.g. `ANTHROPIC_API_KEY`, `EVENTBRITE_API_TOKEN`):

1. [`.env.example`](.env.example) — documents the var for contributors.
2. [`docker/docker-compose.yml`](docker/docker-compose.yml) under
   `services.app.environment:` — passes it into the production container at
   runtime.

**Public client-side var** (`NEXT_PUBLIC_*`): Next.js inlines these into the
client bundle at **build time**, not runtime, so they need to flow through
the build — not the container environment:

1. [`.env.example`](.env.example) — documents the var for contributors.
2. [`docker/Dockerfile`](docker/Dockerfile) in the `builder` stage — add both
   `ARG NEXT_PUBLIC_FOO` and `ENV NEXT_PUBLIC_FOO=$NEXT_PUBLIC_FOO` before
   `pnpm run build`.
3. [`docker/docker-compose.yml`](docker/docker-compose.yml) under
   `services.app.build.args:` — forwards the host env into the build.

No `services.app.environment:` entry needed — the value is baked into the
built image by step 2. Conversely, skip step 2 or 3 and the var will be
empty in the browser even though `process.env.NEXT_PUBLIC_FOO` looks correct
on the server.

## Code style

- **Top-down module ordering.** A function appears before the helpers
  it calls. Read a file top-down and you see the public surface first,
  then the private machinery. Don't front-load helpers at the top of a
  module "just so they're declared before use" — hoisting handles that
  for you.
- **Constants are the exception** to top-down ordering. Declare them
  above the functions that use them (both module-level and file-scoped
  `const`s), so the reader has the vocabulary in hand before reading
  the logic.
- **Preserve acronym capitalization in camelCase identifiers.** Write
  `extractJSON`, `fetchHTML`, `parseURL`, `getAPIKey` — not
  `extractJson`, `fetchHtml`, etc. The single exception is
  first-character lowercasing (`jsonLd`, `htmlToMarkdown`).
- **Reuse shared components instead of reimplementing them.** Check
  [`src/components/ui/`](src/components/ui/) before writing a raw HTML
  button, input, select, card, or badge. A bespoke `<button
className="h-9 rounded-md border …">` will visibly drift from
  everything next to it as soon as someone changes the shared styles
  (see: the share button on the event detail page shipped with the
  wrong height because it bypassed `Button`). If a shared component is
  close but not quite right, extend it with a new variant rather than
  forking.

## Copy style (category/city/country intros and other user-facing prose)

The landing-page intros in [`src/lib/categories.ts`](src/lib/categories.ts)
and [`src/lib/geo.ts`](src/lib/geo.ts) are the biggest body of public copy
on the site. Edits to them — and any new user-facing prose (SeoSections,
about page, etc.) — should match the voice that's already there:

- **No em dashes.** Single clearest AI-writing tell. Rewrite with
  periods, commas, colons, parentheses, or subordinate clauses. One
  per full intro at most, only when it genuinely adds rhythm.
- **Scene-setting opener, not meta.** Start with a claim about the
  subject, not about the page. Good: "Berlin runs one of the densest
  tech-event calendars in Europe." Weak: "This page covers the Berlin
  event scene." "This is the category for X."
- **Specific over generic.** Name actual events, venues, cities,
  communities, stacks. Generic fills ("a mix of meetups and conferences
  for the local community") read AI-generated at any length.
- **Base claims on reality.** Check what's actually in the data before
  writing. Don't claim "nightly meetups covering DevOps" for a
  single-event-per-year village. The generic city template
  (`buildGenericCityLanding` in [`src/lib/geo.ts`](src/lib/geo.ts))
  stays one honest sentence for exactly this reason.
- **Don't enumerate our source platforms in descriptions.** It's irrelevant information that may go out of date very quickly. Describe the value ("one European-wide feed", "aggregated
  in one place") without naming the underlying platforms.
- **Structure.** Typical intro is three paragraphs: opener (scene
  claim, who it's for); middle (anchor events, community layer, topic
  breadth); close (value prop — one unified European feed).

Internal code comments and PR descriptions follow normal rules. This
guide is specifically for text that reaches users.

## Design principle: self-correcting ingest

Whenever the ingest pipeline or moderation logic is improved, existing
events should heal on the next scraper run — not stay stuck with old/wrong
data. Concrete implications:

- `updateExistingEvent` should overwrite (not just fill blanks on) fields
  whose authoritative source is a higher-priority scraper: `startsAt`,
  `endsAt`, `title`, `category`, `eventType`, venue, geo.
- Fingerprints must be (re)recorded on every re-ingest, not only on insert,
  so cross-source dedup can pick up URLs/titles learned later.
- Auto-moderation rules (e.g. auto-reject already-passed pending events)
  should be applied both at ingest time _and_ via a backfill pass over
  existing events.

When fixing ingest bugs: prefer fixes that make the system heal existing
bad rows rather than only preventing new ones. When that's not possible
(e.g. RSS rollovers), call it out so we can plan a backfill.

## Categorization & moderation

The **AI moderator** does the heavy lifting. At ingest (and on admin
re-moderate / re-categorize), each event is sent to Claude with
[MODERATING.md](MODERATING.md) as the system prompt — that file is the
source of truth for category definitions, scope, and reject/pending
rules. The AI returns decision + category + event type.

Implementation: [`src/lib/scraper/ai-moderate.ts`](src/lib/scraper/ai-moderate.ts)
loads `MODERATING.md` at runtime and wires it into the system prompt.
`MODERATING.md` is bundled into the Docker image (see
`docker/Dockerfile`), so pushing to master picks up guide edits on the
next deploy.

### Tuning categorization/moderation

- **Preferred: edit [MODERATING.md](MODERATING.md).** That changes what
  the AI does, for both new ingests and re-runs. After deploy, click
  **"Re-categorize All"** in `/admin/scrapers` to re-moderate every
  existing event against the updated guide.
- **Per-event override:** on `/admin/events/{id}`, use the category
  dropdown. This sets `categoryLocked = true` so future scraper runs
  and re-categorize won't touch it.

### Regex fallback

[`src/lib/scraper/category-map.ts`](src/lib/scraper/category-map.ts) has
title-keyword regexes (`AI_RESEARCH_REGEX`, `AI_DEV_REGEX`,
`HACKER_MAKER_REGEX`, `WEB3_KEYWORD_REGEX`, `SECURITY_KEYWORD_REGEX`,
`DEVOPS_KEYWORD_REGEX`, `DATA_KEYWORD_REGEX`, `UX_KEYWORD_REGEX`,
`ENTREPRENEURSHIP_REGEX`, `HARDWARE_IOT_REGEX`) plus source-specific
lookup maps. These set a _prior_ category the AI moderator can override,
and are the sole path when `ANTHROPIC_API_KEY` isn't set.
`NON_TECH_REGEX` is different: it's a pre-ingest filter in `ingest.ts`
that drops obviously non-tech events before they hit moderation.

Only touch these when the AI moderator consistently misclassifies a
specific pattern — preferable to fix via `MODERATING.md` first.

### Source-specific gotchas

- **confs.tech** `data` → `software_dev` (too broad; title keywords and
  AI refine). `leadership` and `networking` → `entrepreneurship`.
- **Meetup** `categoryId=546` (Technology) is broad — non-tech events
  (poker, hiking) sometimes slip through `NON_TECH_REGEX` and need
  manual deletion.
- **dev.events** RSS descriptions contain "in City, Country, Continent"
  which is parsed for European filtering.

### Audit queries

```sql
-- Distribution across approved events
SELECT category, COUNT(*) FROM events
WHERE status = 'approved'
GROUP BY category ORDER BY count DESC;

-- Eyeball for miscategorizations
SELECT title, category FROM events
WHERE status = 'approved'
ORDER BY category, title;
```

## Scrapers

| Source       | Method                   | Rate Limit | Notes                                                        |
| ------------ | ------------------------ | ---------- | ------------------------------------------------------------ |
| `manual`     | Curated list             | None       | Hacker camps — update `hacker-camps.ts` annually             |
| `confs_tech` | GitHub JSON              | None       | Fetches current + next year                                  |
| `dev_events` | RSS + JSON-LD            | ~1 req/sec | JSON-LD often null, falls back to RSS description            |
| `meetup`     | `__NEXT_DATA__` scraping | 2.5s/city  | Searches all cities in DB, uses `{cc}--{city}` URL format    |
| `eventbrite` | API v3                   | 1 req/sec  | Requires `EVENTBRITE_API_TOKEN`, skips gracefully if missing |
| `luma`       | Calendar scraping        | 1 req/sec  | Requires configured sources in admin UI                      |

**Run order:** `manual → confs_tech → dev_events → meetup → eventbrite → luma`
(lowest to highest priority for dedup merge).

**City resolution:**

- DB lookup first (seeded + geocoded cities).
- Unknown cities are geocoded via OpenStreetMap Nominatim (1 req/sec) and
  inserted into the cities table.
- Venue addresses are geocoded for precise lat/lng when available.
- Non-European countries are skipped (cities without a matching country
  in our DB are not inserted).

## Periodic cleanup tasks

These aren't automated — run them by hand every so often (e.g. monthly,
or after a surge of new events from a scraper run).

### Duplicate cities

Scrapers insert cities under whatever name the source returned —
occasionally the Nominatim canonicalization misses and near-duplicates
creep in (language variants, postal-code prefixes, sub-districts treated
as cities). Find pairs within 1 km of each other in the same country:

```sql
SELECT c1.id, c1.name, c2.id, c2.name,
  round(ST_Distance(
    ST_MakePoint(c1.longitude, c1.latitude)::geography,
    ST_MakePoint(c2.longitude, c2.latitude)::geography
  )::numeric, 0) AS m,
  (SELECT count(*) FROM events WHERE city_id = c1.id) AS e1,
  (SELECT count(*) FROM events WHERE city_id = c2.id) AS e2
FROM cities c1 JOIN cities c2
  ON c1.country_id = c2.country_id AND c1.id < c2.id
WHERE ST_DWithin(
  ST_MakePoint(c1.longitude, c1.latitude)::geography,
  ST_MakePoint(c2.longitude, c2.latitude)::geography,
  1000
)
ORDER BY m;
```

For each duplicate pair, pick a canonical (prefer English name, then
fuller official name) and merge via:

```sql
UPDATE events SET city_id = <keep>, updated_at = now() WHERE city_id = <dup>;
UPDATE scraper_sources SET default_city_id = <keep> WHERE default_city_id = <dup>;
UPDATE staged_events SET city_id = <keep> WHERE city_id = <dup>;
DELETE FROM cities WHERE id = <dup>;
```

Run all merges in a single `BEGIN` / `COMMIT` transaction, and after it
commits verify
`SELECT count(*) FROM events WHERE city_id NOT IN (SELECT id FROM cities)`
returns 0.

Foreign-key tables pointing at `cities.id`: `events`, `scraper_sources`,
`staged_events`. If new schemas add more, update this checklist.

### Stale pending events

The auto-reject-if-passed rule runs at ingest. Events already in `pending`
when they expire stay pending. Sweep periodically:

```sql
UPDATE events
SET status = 'rejected',
    rejection_reason = COALESCE(rejection_reason || ' + ', '') || 'auto-rejected: event already passed',
    updated_at = now()
WHERE status = 'pending'
  AND COALESCE(ends_at, starts_at) < now();
```

## Ingestion methods

When adding a new ingestion method (a new scraper source, a new
structured-data format, an RSS adapter, a webhook endpoint that accepts
submissions, etc.):

1. Implement it under `src/lib/scraper/sources/` or `src/app/api/` as
   appropriate, and register it with the orchestrator in
   `src/lib/scraper/orchestrator.ts`.
2. **Update the "Publish your events on Brainberg" section in
   [`src/app/about/page.tsx`](src/app/about/page.tsx)**. That page is the
   canonical description of what organizers need to expose for us to
   ingest their events. The README just links to `/about`, so README
   changes are rarely needed for content updates.
3. If the new method introduces per-source config (like the microdata
   and Luma patterns that read from `scraperSources`), document how to
   add a source via `/admin/scrapers` in the README and expose a
   form/section for it in the admin UI.
