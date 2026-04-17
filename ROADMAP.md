# Brainberg Roadmap

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

### 1.1 Luma Scraper
- **Goal**: Scrape AI/tech events from lu.ma (the dominant platform for European AI events)
- **Implementation**:
  - Create `src/lib/scrapers/luma.ts`
  - Luma has an undocumented API: `GET https://api.lu.ma/public/v2/event/search` (or scrape their discover pages)
  - Parse event data → map to schema (title, description, dates, location, category, etc.)
  - Deduplicate by URL (`lumaUrl` field already exists in schema)
  - Geocode cities that don't exist yet → insert into `cities` table
  - Add to `scraperSources` table for tracking
- **Testing**: Run locally with `pnpm tsx scripts/scrape-luma.ts`, verify events appear on browse page
- **Env vars**: `LUMA_API_KEY` (if needed, already in `.env.example`)

### 1.2 Eventbrite Scraper
- **Goal**: Scrape European tech events from Eventbrite
- **Implementation**:
  - Create `src/lib/scrapers/eventbrite.ts`
  - Use Eventbrite API v3: `GET /v3/events/search/?categories=102&location.address=Europe`
  - Map to schema, deduplicate by `eventbriteUrl`
  - Handle pagination (Eventbrite returns 50 per page)
- **Env vars**: `EVENTBRITE_API_TOKEN` (already in `.env.example`)

### 1.3 Meetup Scraper
- **Goal**: Scrape tech meetups from Meetup.com
- **Implementation**:
  - Create `src/lib/scrapers/meetup.ts`
  - Meetup's GraphQL API or scrape search results
  - Focus on tech/AI categories in European cities
  - Deduplicate by `meetupUrl`
- **Note**: Meetup's API has gotten more restrictive; may need browser scraping via Playwright

### 1.4 Scraper Orchestration
- **Goal**: Cron job that runs all scrapers on a schedule
- **Implementation**:
  - Create `src/app/api/cron/scrape/route.ts` — protected by `CRON_SECRET`
  - Run scrapers sequentially, log results to `scraperSources` table
  - Track last scrape time, events added/updated/skipped
  - Call via external cron (Vercel Cron, GitHub Actions schedule, or system cron)
- **Schedule**: Every 6 hours
- **Testing**: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scrape`

### 1.5 Event Deduplication & Cleanup
- **Goal**: Prevent duplicates across scrapers, mark past events
- **Implementation**:
  - Deduplicate by normalized URL, or title + date + city combo
  - Create `src/app/api/cron/cleanup/route.ts` — marks events with `startsAt < now` as `status: "past"`
  - Add index on `(title, startsAt, cityId)` for fast dedup lookups

---

## Phase 2: Core UX Improvements

### 2.1 Map View (Leaflet + OpenStreetMap)
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

### 2.2 Calendar View
- **Goal**: Monthly/weekly calendar showing events
- **Implementation**:
  - Evaluate: build custom with CSS Grid, or use a lightweight lib
  - Replace placeholder in `src/app/calendar/page.tsx`
  - Month view: colored dots per day, click to expand
  - Week view: time blocks
  - Fetch events for visible date range via API
  - Category color-coding (reuse `CATEGORY_COLORS` from event-card)

### 2.3 Event Detail Page Enhancements
- **Goal**: Rich event pages that drive engagement
- **Tasks**:
  - Add mini-map (Leaflet static map) showing venue location
  - "Similar events" section (same city or category, nearby dates)
  - Structured data (JSON-LD) for Google Events rich results
  - "Add to calendar" button (generate .ics file)
  - Share buttons (Twitter, LinkedIn, copy link)

### 2.4 Mobile Experience
- **Goal**: Fully functional mobile navigation and touch interactions
- **Tasks**:
  - Implement mobile hamburger menu (header already has the button, needs the sheet/drawer)
  - Touch-friendly filter chips instead of dropdowns on mobile
  - Swipeable event cards
  - Bottom navigation bar on mobile

---

## Phase 3: Event Submission & Auth

### 3.1 Authentication (Auth.js v5)
- **Goal**: Magic link + OAuth login for event submission
- **Implementation**:
  - `pnpm add next-auth@beta` (Auth.js v5)
  - Create `src/lib/auth.ts` with providers config
  - Create `src/app/api/auth/[...nextauth]/route.ts`
  - Schema already has `users`, `accounts`, `sessions`, `verificationTokens` tables
  - Providers: GitHub OAuth, Google OAuth, Email magic link
  - Protect submit/admin routes with middleware
- **Env vars**: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (already in `.env.example`)

### 3.2 Event Submission Form
- **Goal**: Let community members submit events
- **Implementation**:
  - Replace placeholder in `src/app/events/submit/page.tsx`
  - Multi-step form: basics (title, URL, dates) → details (category, type, size) → location (city, venue) → review
  - Server Actions for form submission
  - Zod validation (schema already has zod dependency)
  - Auto-fill from URL: paste an event URL → scrape title, date, description
  - Events submitted as `status: "pending"` → need approval
  - Email notification to admins on new submission

### 3.3 Admin Dashboard
- **Goal**: Approve/reject submitted events, manage scrapers
- **Implementation**:
  - Create `src/app/admin/page.tsx` (protected, `role: "admin"` check)
  - List pending events with approve/reject/edit actions
  - Scraper status dashboard: last run, events added, errors
  - Basic analytics: events by country, category, source

---

## Phase 4: Discovery & Engagement

### 4.1 User Profiles & Saved Events
- **Goal**: Let users bookmark events and set preferences
- **Tasks**:
  - Add `saved_events` table (userId + eventId)
  - "Save" button on event cards and detail pages
  - `/profile` page showing saved events
  - City/category preferences for personalized homepage

### 4.2 Email Digest
- **Goal**: Weekly email with new events matching user preferences
- **Implementation**:
  - Create email templates (react-email or plain HTML)
  - Cron job: `api/cron/digest` — query new events per user preferences
  - Use Resend, Postmark, or AWS SES for delivery
  - Unsubscribe link (required for GDPR)

### 4.3 RSS Feeds
- **Goal**: RSS/Atom feed per country, category, or city
- **Implementation**:
  - Create `src/app/feed/[type]/[slug]/route.ts`
  - Examples: `/feed/country/de`, `/feed/category/ai_ml`, `/feed/city/berlin`
  - Standard Atom XML format
  - Add `<link rel="alternate" type="application/atom+xml">` to layout head

### 4.4 SEO & Social
- **Goal**: Rank for "tech events [city]" and "AI meetups Europe" queries
- **Tasks**:
  - Dynamic sitemap.xml (`src/app/sitemap.ts`) listing all event pages + city pages
  - City landing pages: `/events/city/berlin` with SEO-optimized content
  - Country landing pages: `/events/country/germany`
  - OG images: auto-generate with `next/og` (ImageResponse API)
  - JSON-LD structured data on event detail pages

---

## Phase 5: Advanced Features

### 5.1 "Events Near Me" with Geolocation
- **Goal**: Browser geolocation → show events within N km
- **Implementation**:
  - Client-side geolocation prompt
  - PostGIS query: `ST_DWithin(location::geography, ST_MakePoint(lng, lat)::geography, radius)`
  - Radius slider (10km, 25km, 50km, 100km)
  - Works with map view for visual exploration

### 5.2 Event Recommendations (AI)
- **Goal**: "Because you liked X, you might like Y"
- **Implementation**:
  - Collaborative filtering based on saved events
  - Or simpler: same city + similar category + overlapping tags
  - Show on homepage for logged-in users

### 5.3 Community Features
- **Goal**: Build engagement beyond passive browsing
- **Tasks**:
  - Event comments / discussion
  - "I'm going" indicator with attendee count
  - Organizer profiles (link to their events)
  - Community-curated event lists ("Best AI events in Berlin Q3 2026")

### 5.4 API & Integrations
- **Goal**: Public API for the European tech event ecosystem
- **Tasks**:
  - Public REST API with rate limiting
  - API key management for heavy users
  - Embed widget: `<script src="brainberg.eu/widget.js" data-city="berlin">`
  - iCal feed integration (sync to Google Calendar / Outlook)

---

## Phase 6: GDPR & Legal

### 6.1 Cookie Consent
- **Goal**: GDPR-compliant consent banner
- **Implementation**:
  - Schema already has `consentLog` table
  - Minimal cookies (session only, no tracking)
  - Banner with accept/reject, link to privacy policy

### 6.2 Privacy Policy & Terms
- **Goal**: Legal pages required for EU operation
- **Tasks**:
  - Create `/privacy` and `/terms` pages
  - Cover: data collected, scraped event data (publicly available), user accounts, cookies
  - Add to footer links

### 6.3 Data Deletion
- **Goal**: Right to erasure (GDPR Art. 17)
- **Implementation**:
  - Account deletion endpoint that cascades to all user data
  - "Delete my account" button in profile settings

---

## Suggested Sprint Plan

| Sprint | Duration | Focus |
|--------|----------|-------|
| **Sprint 1** | 1-2 weeks | Phase 1.1-1.2 (Luma + Eventbrite scrapers — get real data in) |
| **Sprint 2** | 1 week | Phase 1.4-1.5 (Scraper cron + dedup) + Phase 4.4 (SEO basics) |
| **Sprint 3** | 1-2 weeks | Phase 2.1 (Map view) + Phase 2.4 (Mobile nav) |
| **Sprint 4** | 1 week | Phase 3.1-3.2 (Auth + Event submission) |
| **Sprint 5** | 1 week | Phase 2.2 (Calendar) + Phase 2.3 (Event detail enhancements) |
| **Sprint 6** | 1 week | Phase 4.3 (RSS) + Phase 6 (GDPR) |
| **Sprint 7+** | Ongoing | Phases 4-5 based on user feedback |

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
