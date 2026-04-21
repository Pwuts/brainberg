# Brainberg Roadmap

## Execution status (as of 2026-04-21)

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 1. Real Data | ✅ DONE | All 4 planned sources shipped; 3 extra sources added; categorization delegated to an AI moderator (see "Added beyond roadmap"). |
| 2. Core UX | 🟡 PARTIAL | Map done; Calendar still placeholder; Event detail partially enhanced; Mobile nav done in admin. |
| 3. Submission & Auth | 🟡 PARTIAL | Admin dashboard done (via `ADMIN_SECRET`); Auth.js and submit form not started. |
| 4. Discovery & Engagement | ⬜ NOT STARTED | None of: saved events, digest, RSS feeds, sitemap/city pages. |
| 5. Advanced Features | ⬜ NOT STARTED | None. |
| 6. GDPR & Legal | ⬜ NOT STARTED | `consent_log` table exists from initial schema; no banner, pages, or deletion endpoint. |

---

## Current State

The MVP is deployed with:
- Browse events page with full-text search + autocomplete
- Filtering by country, city, category, type, size, date, free/online
- Event detail pages with SEO metadata
- Cursor-based pagination
- Seed data (12 sample events)
- Docker deployment with PostGIS, CI via GitHub Actions

Placeholder pages exist for: Map, Calendar, Submit Event.

---

## Phase 1: Real Data (Priority: Critical)

The platform is useless without real events. This is the #1 priority.

Data sources are chosen for **structured category/topic metadata** — no manual categorization needed.

### 1.1 confs.tech Scraper — ✅ DONE
- **Goal**: Import curated tech conferences from confs.tech (easiest source — raw JSON on GitHub)
- **Why first**: Zero API key needed, structured JSON with topics, dates, locations, and URLs
- **Data format**: JSON files per year per topic in [GitHub repo](https://github.com/tech-conferences/conference-data)
  - Structure: `conferences/{year}/{topic}.json` (e.g., `conferences/2026/ai.json`)
  - Fields: `name`, `url`, `startDate`, `endDate`, `city`, `country`, `topics[]`, `online`
- **Implementation**:
  - Create `src/lib/scrapers/confs-tech.ts`
  - Fetch raw JSON from GitHub (no auth needed): `https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/{year}/{topic}.json`
  - Topics to scrape: `ai`, `general`, `web`, `data`, `devops`, `cloud`, `security`, `mobile`
  - Map `topics[]` → `eventCategory` enum, `online` flag → `isOnline`
  - Filter for European countries only (use country code allowlist)
  - Deduplicate by name + startDate + city combo
  - Geocode new cities → insert into `cities` table with PostGIS coordinates
- **Testing**: `pnpm tsx scripts/scrape-confs-tech.ts`
- **Env vars**: None required

### 1.2 dev.events Scraper — ✅ DONE
- **Goal**: Import developer events from dev.events (broad coverage, structured categories)
- **Data format**: REST API at `https://dev.events/api/events`
  - Returns events with: `title`, `description`, `startDate`, `endDate`, `location`, `category`, `tags[]`, `url`, `cfpEndDate`
  - Categories are pre-assigned (e.g., "AI/ML", "DevOps", "Web", "Cloud")
- **Implementation**:
  - Create `src/lib/scrapers/dev-events.ts`
  - Query API with location filter for European countries
  - Map `category` + `tags[]` → `eventCategory` enum
  - Handle pagination
  - Deduplicate by URL or title + date + city
- **Testing**: `pnpm tsx scripts/scrape-dev-events.ts`
- **Env vars**: None required (public API)

### 1.3 Eventbrite Scraper — ✅ DONE
- **Goal**: Scrape European tech events from Eventbrite (large event volume, rich metadata)
- **Data format**: REST API v3 (requires API key)
  - Endpoint: `GET /v3/events/search/`
  - Query params: `categories=102` (Science & Tech), `subcategories=2004` (AI), `location.address=Europe`, `expand=venue,category`
  - Returns: `name`, `description`, `start`/`end` (ISO 8601), `venue` (with lat/lng), `category`, `subcategory`, `is_free`, `is_online_event`, `url`
  - Categories & subcategories are structured with IDs and names
- **Implementation**:
  - Create `src/lib/scrapers/eventbrite.ts`
  - Use Eventbrite API v3 with bearer token auth
  - Search by subcategories: AI/ML (2004), Data Science (2007), Robotics (2006), Software (2008)
  - Map `category.name` + `subcategory.name` → `eventCategory` enum
  - Map `is_free` → `isFree`, `is_online_event` → `isOnline`
  - Extract venue coordinates for PostGIS, geocode if missing
  - Handle pagination (50 per page, `continuation` token)
  - Deduplicate by `eventbriteUrl` field (already in schema)
- **Testing**: `pnpm tsx scripts/scrape-eventbrite.ts`
- **Env vars**: `EVENTBRITE_API_TOKEN` (already in `.env.example`)

### 1.4 Meetup Scraper — ✅ DONE
- **Goal**: Scrape European tech meetups from Meetup.com (recurring community events)
- **Data format**: GraphQL API (requires OAuth or Pro API key)
  - Query: `searchEvents` with `filter: { query: "tech", lat, lon, radius }`
  - Returns: `title`, `description`, `dateTime`, `venue { lat, lng, city, country }`, `topics[].name`, `eventUrl`, `going`, `isOnline`
  - `topics[]` provides structured category metadata (e.g., "Artificial Intelligence", "Machine Learning", "Web Development")
- **Implementation**:
  - Create `src/lib/scrapers/meetup.ts`
  - Query GraphQL API centered on major European tech hubs: Berlin, Amsterdam, London, Paris, Barcelona, Stockholm, Lisbon, Dublin, Munich, Zurich, etc.
  - Map `topics[].name` → `eventCategory` enum using keyword matching (e.g., "Artificial Intelligence" → `ai_ml`)
  - Set `eventType: "meetup"` and `size` based on `going` count
  - Deduplicate by `meetupUrl` field (already in schema)
  - Handle rate limiting (Meetup is strict — add delays between requests)
- **Note**: Meetup's API has gotten restrictive; may need Pro API key or browser scraping via Playwright as fallback
- **Testing**: `pnpm tsx scripts/scrape-meetup.ts`
- **Env vars**: `MEETUP_API_KEY` (add to `.env.example`)

### 1.5 Category Mapping Utility — ♻️ SUPERSEDED (see "Added beyond roadmap")
- **Goal**: Centralized mapping from source-specific categories/topics to Brainberg's `eventCategory` enum
- **Implementation**:
  - Create `src/lib/scrapers/category-mapper.ts`
  - Input: array of topic strings from any source (e.g., `["Artificial Intelligence", "Deep Learning"]`)
  - Output: best matching `eventCategory` enum value (e.g., `ai_ml`)
  - Use keyword matching with weighted scores (e.g., "AI" → `ai_ml` +10, "Machine Learning" → `ai_ml` +10, "Web" → `web_dev` +5)
  - Fallback to `"general"` if no strong match
  - Similarly map to `eventType` and `eventSize` where source data allows
  - Shared across all scrapers for consistency

### 1.6 Scraper Orchestration — ✅ DONE
- **Goal**: Cron job that runs all scrapers on a schedule
- **Implementation**:
  - Create `src/app/api/cron/scrape/route.ts` — protected by `CRON_SECRET`
  - Run scrapers sequentially: confs.tech → dev.events → Eventbrite → Meetup
  - Log results to `scraperSources` table (events added/updated/skipped, errors)
  - Track last scrape time per source
  - Call via external cron (GitHub Actions schedule, or system cron on VPS)
- **Schedule**: Every 6 hours
- **Testing**: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scrape`

### 1.7 Event Deduplication & Cleanup — ✅ DONE
- **Goal**: Prevent duplicates across scrapers, mark past events
- **Implementation**:
  - ✅ Deduplicate by normalized URL, or title + date + city combo
  - ✅ Cross-source dedup: same event listed on Eventbrite AND Meetup → keep richest record, merge URLs
  - ♻️ Create `src/app/api/cron/cleanup/route.ts` — marks events with `startsAt < now` as `status: "past"` — replaced by manual SQL sweep documented in CLAUDE.md "Stale pending events" (sets stale pending → `rejected`)
  - ✅ Add index on `(title, startsAt, cityId)` for fast dedup lookups (via `event_fingerprints` table)

---

## Phase 2: Core UX Improvements

### 2.1 Map View (Leaflet + OpenStreetMap) — ✅ DONE
- **Goal**: Interactive map showing events as pins, clustered by zoom level
- **Implementation**:
  - `pnpm add leaflet react-leaflet @types/leaflet`
  - Create `src/components/map/event-map.tsx` (client component)
  - Replace placeholder in `src/app/map/page.tsx`
  - Fetch events with lat/lng via API: `GET /api/events?hasLocation=true`
  - Marker popups with event title, date, link to detail page
  - Cluster markers at low zoom (use `react-leaflet-cluster`)
  - Sync map bounds with URL params for shareability
- **PostGIS query**: `ST_DWithin(location, ST_MakePoint(lng, lat), radius_meters)` for "events near me"
- **Note**: Leaflet CSS must be imported client-side only

### 2.2 Calendar View — ⬜ NOT STARTED (placeholder page)
- **Goal**: Monthly/weekly calendar showing events
- **Implementation**:
  - Evaluate: build custom with CSS Grid, or use a lightweight lib
  - Replace placeholder in `src/app/calendar/page.tsx`
  - Month view: colored dots per day, click to expand
  - Week view: time blocks
  - Fetch events for visible date range via API
  - Category color-coding (reuse `CATEGORY_COLORS` from event-card)

### 2.3 Event Detail Page Enhancements — 🟡 PARTIAL
- **Goal**: Rich event pages that drive engagement
- **Tasks**:
  - ⬜ Add mini-map (Leaflet static map) showing venue location
  - ⬜ "Similar events" section (same city or category, nearby dates)
  - ✅ Structured data (JSON-LD) for Google Events rich results
  - ⬜ "Add to calendar" button (generate .ics file)
  - ✅ Share buttons (Twitter, LinkedIn, copy link)

### 2.4 Mobile Experience — 🟡 PARTIAL
- **Goal**: Fully functional mobile navigation and touch interactions
- **Tasks**:
  - ✅ Implement mobile hamburger menu (header already has the button, needs the sheet/drawer) — [`src/components/layout/mobile-menu.tsx`](src/components/layout/mobile-menu.tsx); admin mobile nav in commit 71118fb
  - ⬜ Touch-friendly filter chips instead of dropdowns on mobile
  - ⬜ Swipeable event cards
  - ⬜ Bottom navigation bar on mobile

---

## Phase 3: Event Submission & Auth

### 3.1 Authentication (Auth.js v5) — ⬜ NOT STARTED (admin uses `ADMIN_SECRET` + signed cookie instead)
- **Goal**: Magic link + OAuth login for event submission
- **Implementation**:
  - `pnpm add next-auth@beta` (Auth.js v5)
  - Create `src/lib/auth.ts` with providers config
  - Create `src/app/api/auth/[...nextauth]/route.ts`
  - Schema already has `users`, `accounts`, `sessions`, `verificationTokens` tables
  - Providers: GitHub OAuth, Google OAuth, Email magic link
  - Protect submit/admin routes with middleware
- **Env vars**: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (already in `.env.example`)

### 3.2 Event Submission Form — ⬜ NOT STARTED (placeholder page)
- **Goal**: Let community members submit events
- **Implementation**:
  - Replace placeholder in `src/app/events/submit/page.tsx`
  - Multi-step form: basics (title, URL, dates) → details (category, type, size) → location (city, venue) → review
  - Server Actions for form submission
  - Zod validation (schema already has zod dependency)
  - Auto-fill from URL: paste an event URL → scrape title, date, description
  - Events submitted as `status: "pending"` → need approval
  - Email notification to admins on new submission

### 3.3 Admin Dashboard — ✅ DONE
- **Goal**: Approve/reject submitted events, manage scrapers
- **Implementation**:
  - Create `src/app/admin/page.tsx` (protected, `role: "admin"` check)
  - List pending events with approve/reject/edit actions
  - Scraper status dashboard: last run, events added, errors
  - Basic analytics: events by country, category, source

---

## Phase 4: Discovery & Engagement

### 4.1 User Profiles & Saved Events — ⬜ NOT STARTED
- **Goal**: Let users bookmark events and set preferences
- **Tasks**:
  - Add `saved_events` table (userId + eventId)
  - "Save" button on event cards and detail pages
  - `/profile` page showing saved events
  - City/category preferences for personalized homepage

### 4.2 Email Digest — ⬜ NOT STARTED
- **Goal**: Weekly email with new events matching user preferences
- **Implementation**:
  - Create email templates (react-email or plain HTML)
  - Cron job: `api/cron/digest` — query new events per user preferences
  - Use Resend, Postmark, or AWS SES for delivery
  - Unsubscribe link (required for GDPR)

### 4.3 RSS Feeds — ⬜ NOT STARTED
- **Goal**: RSS/Atom feed per country, category, or city
- **Implementation**:
  - Create `src/app/feed/[type]/[slug]/route.ts`
  - Examples: `/feed/country/de`, `/feed/category/ai_ml`, `/feed/city/berlin`
  - Standard Atom XML format
  - Add `<link rel="alternate" type="application/atom+xml">` to layout head

### 4.4 SEO & Social — ⬜ NOT STARTED
- **Goal**: Rank for "tech events [city]" and "AI meetups Europe" queries
- **Tasks**:
  - Dynamic sitemap.xml (`src/app/sitemap.ts`) listing all event pages + city pages
  - City landing pages: `/events/city/berlin` with SEO-optimized content
  - Country landing pages: `/events/country/germany`
  - OG images: auto-generate with `next/og` (ImageResponse API)
  - JSON-LD structured data on event detail pages

---

## Phase 5: Advanced Features

### 5.1 "Events Near Me" with Geolocation — ⬜ NOT STARTED
- **Goal**: Browser geolocation → show events within N km
- **Implementation**:
  - Client-side geolocation prompt
  - PostGIS query: `ST_DWithin(location::geography, ST_MakePoint(lng, lat)::geography, radius)`
  - Radius slider (10km, 25km, 50km, 100km)
  - Works with map view for visual exploration

### 5.2 Event Recommendations (AI) — ⬜ NOT STARTED
- **Goal**: "Because you liked X, you might like Y"
- **Implementation**:
  - Collaborative filtering based on saved events
  - Or simpler: same city + similar category + overlapping tags
  - Show on homepage for logged-in users

### 5.3 Community Features — ⬜ NOT STARTED
- **Goal**: Build engagement beyond passive browsing
- **Tasks**:
  - Event comments / discussion
  - "I'm going" indicator with attendee count
  - Organizer profiles (link to their events)
  - Community-curated event lists ("Best AI events in Berlin Q3 2026")

### 5.4 API & Integrations — ⬜ NOT STARTED
- **Goal**: Public API for the European tech event ecosystem
- **Tasks**:
  - Public REST API with rate limiting
  - API key management for heavy users
  - Embed widget: `<script src="brainberg.eu/widget.js" data-city="berlin">`
  - iCal feed integration (sync to Google Calendar / Outlook)

---

## Phase 6: GDPR & Legal

### 6.1 Cookie Consent — ⬜ NOT STARTED (`consent_log` table exists from initial schema, unused)
- **Goal**: GDPR-compliant consent banner
- **Implementation**:
  - Schema already has `consentLog` table
  - Minimal cookies (session only, no tracking)
  - Banner with accept/reject, link to privacy policy

### 6.2 Privacy Policy & Terms — ⬜ NOT STARTED
- **Goal**: Legal pages required for EU operation
- **Tasks**:
  - Create `/privacy` and `/terms` pages
  - Cover: data collected, scraped event data (publicly available), user accounts, cookies
  - Add to footer links

### 6.3 Data Deletion — ⬜ NOT STARTED
- **Goal**: Right to erasure (GDPR Art. 17)
- **Implementation**:
  - Account deletion endpoint that cascades to all user data
  - "Delete my account" button in profile settings

---

## ✨ Added beyond roadmap

Capabilities that shipped but weren't specified in this document.

### 🤖 AI moderation pipeline

- [`src/lib/scraper/ai-moderate.ts`](src/lib/scraper/ai-moderate.ts) — Claude-based moderator that returns decision + category + event type for every ingested event, driven by [`MODERATING.md`](MODERATING.md) as a versionable policy document.
- Replaces the planned "Category Mapping Utility" (§1.5): the regex tables in [`src/lib/scraper/category-map.ts`](src/lib/scraper/category-map.ts) are now a prior/fallback only.
- Admin "Re-categorize All" action re-runs moderation against the current `MODERATING.md` over every existing event.

### 📡 Extra scraper sources

- [`src/lib/scraper/sources/luma.ts`](src/lib/scraper/sources/luma.ts) — Luma calendar scraper (per-source config via admin UI).
- [`src/lib/scraper/sources/microdata.ts`](src/lib/scraper/sources/microdata.ts) — generic schema.org / JSON-LD / microdata scraper for arbitrary organizer pages.
- [`src/lib/scraper/sources/hacker-camps.ts`](src/lib/scraper/sources/hacker-camps.ts) — manually curated list of European hacker/infosec cons and camps (refreshed annually; see memory note on HackerTracker Firestore for sourcing).

### 🏷️ Category additions

- `hacker_maker_community` category added to the event category enum (CCC, EMF, eth0, WHY, GPN, MCH, SHA, Maker Faires, etc.).

### 🛠️ Admin dashboard (Phase 3.3) — full scraper operations suite

Beyond "list pending events + scraper status" from §3.3, the admin dashboard now includes:

- **Preview/stage/commit/discard** flow for re-running a scraper without touching live data ([`/admin/scrapers/preview/[runId]`](src/app/admin/scrapers/preview/)).
- **Per-source config** for Luma and microdata scrapers (`scraper_sources` table + admin CRUD).
- **Re-categorize** and **re-moderate** bulk actions.
- **Location picker** shared between event edit and source config.
- `ADMIN_SECRET`-backed cookie session (wraps planned Auth.js; to be replaced when §3.1 ships).

### 🔍 Search upgrades

- Full-text search over events with tsvector + prefix tsquery (commit 6382897) and autocomplete — present from the MVP but extended beyond the roadmap's "full-text search" bullet.

### 📦 Schema additions

- `event_sources` junction, `event_fingerprints` dedup index, `scraper_runs` audit, `staged_events` staging — all from the implementation plan.
- `category_locked` boolean on events — protects manual categorizer overrides from being touched by future scraper runs.

### ❌ Deferred / not pursued from plan

- **MCP server** — not implemented; spec moved to [plans/admin-mcp.md](plans/admin-mcp.md).
- **Dedicated `cleanup` cron route** (§1.7) — replaced by manual SQL sweep documented in CLAUDE.md under "Stale pending events".

---

## Suggested Sprint Plan

| Sprint | Duration | Focus |
|--------|----------|-------|
| **Sprint 1** | 1-2 weeks | Phase 1.1-1.2 (confs.tech + dev.events scrapers — easiest wins, no API keys) |
| **Sprint 2** | 1 week | Phase 1.3-1.4 (Eventbrite + Meetup scrapers — richer data, needs API keys) |
| **Sprint 3** | 1 week | Phase 1.5-1.7 (Category mapper + scraper cron + dedup) + Phase 4.4 (SEO basics) |
| **Sprint 4** | 1-2 weeks | Phase 2.1 (Map view) + Phase 2.4 (Mobile nav) |
| **Sprint 5** | 1 week | Phase 3.1-3.2 (Auth + Event submission) |
| **Sprint 6** | 1 week | Phase 2.2 (Calendar) + Phase 2.3 (Event detail enhancements) |
| **Sprint 7** | 1 week | Phase 4.3 (RSS) + Phase 6 (GDPR) |
| **Sprint 8+** | Ongoing | Phases 4-5 based on user feedback |

---

## Running Locally

```bash
# Start dev DB
docker compose -f docker/docker-compose.dev.yml up -d

# Install deps
pnpm install

# Push schema + seed
pnpm db:push && pnpm db:seed

# Dev server
pnpm dev
```
