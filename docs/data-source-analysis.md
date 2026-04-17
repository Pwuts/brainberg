# Brainberg: Data Source Analysis & Deduplication Strategy

## 1. Per-Source Field Mapping

### Legend
- ✅ Direct map (no processing needed)
- 🔧 Light transform (regex, lookup table, string manipulation)
- 🤖 AI recommended (ambiguous/unstructured input)

### confs.tech (GitHub JSON)

| Brainberg Field | Source Field | Status |
|---|---|---|
| title | `name` | ✅ |
| websiteUrl | `url` | ✅ |
| startsAt | `startDate` | ✅ (ISO format) |
| endsAt | `endDate` | ✅ (ISO format) |
| city → cityId | `city` | 🔧 Lookup against cities table |
| country → countryId | `country` | 🔧 Lookup against countries table |
| isOnline | `online` | ✅ (boolean) |
| category | filename (e.g. `javascript.json`) | 🔧 Static lookup table |
| source | — | ✅ Hardcode `confs_tech` |
| sourceId | `name + startDate` hash | 🔧 Deterministic hash |
| sourceUrl | `url` | ✅ |
| description | — | ❌ Not available |
| shortDescription | — | ❌ Not available |
| tags | filename topic | 🔧 `["javascript"]` from filename |
| eventType | — | 🔧 Default `conference` (it's confs.tech) |
| imageUrl | — | ❌ Not available |
| isFree / priceFrom / priceTo | — | ❌ Not available |
| organizerName | — | ❌ Not available |

**AI needed?** No. All available fields map directly or via simple lookup. The filename-to-category mapping is a static table:

```typescript
const CONFSTECH_CATEGORY_MAP: Record<string, string> = {
  'android': 'general_tech',
  'css': 'design_ux',
  'data': 'data_science',
  'devops': 'cloud_infra',
  'dotnet': 'general_tech',
  'elixir': 'general_tech',
  'general': 'general_tech',
  'golang': 'general_tech',
  'graphql': 'devtools',
  'ios': 'general_tech',
  'java': 'general_tech',
  'javascript': 'general_tech',
  'kotlin': 'general_tech',
  'leadership': 'startup',
  'networking': 'cloud_infra',
  'php': 'general_tech',
  'product': 'startup',
  'python': 'general_tech',  // unless AI-focused (see note)
  'ruby': 'general_tech',
  'rust': 'general_tech',
  'scala': 'general_tech',
  'security': 'cybersecurity',
  'tech-comm': 'general_tech',
  'typescript': 'general_tech',
  'ux': 'design_ux',
};
```

**Note on AI events in confs.tech:** There's no `ai.json` topic file. AI/ML conferences appear scattered across `data.json`, `python.json`, and `general.json`. To catch these, we'd need title-based keyword matching (e.g., title contains "AI", "Machine Learning", "LLM", "GPT", "Neural"). This is still a simple regex/keyword check — no AI needed.

---

### dev.events (RSS + JSON-LD)

| Brainberg Field | Source Field | Status |
|---|---|---|
| title | RSS `<title>` / JSON-LD `name` | ✅ |
| description | RSS `<description>` (HTML) | 🔧 Strip HTML tags |
| shortDescription | First 200 chars of stripped description | 🔧 Truncate |
| startsAt | RSS `<pubDate>` / JSON-LD `startDate` | ✅ |
| endsAt | JSON-LD `endDate` | ✅ (requires detail page fetch) |
| websiteUrl | JSON-LD `url` or RSS `<link>` | ✅ |
| category | RSS `<category>` tags | 🔧 Lookup table (see below) |
| eventType | RSS `<category>` tags (e.g. "meetup", "conference") | 🔧 Lookup table |
| city → cityId | JSON-LD `location.address.addressLocality` | 🔧 Lookup against cities table |
| country → countryId | JSON-LD `location.address.addressCountry` | 🔧 Lookup against countries table |
| isOnline | Check if `location` is `VirtualLocation` | 🔧 Simple check |
| tags | RSS `<category>` tags array | ✅ |
| source | — | ✅ Hardcode `dev_events` |
| sourceId | RSS `<guid>` or URL slug | ✅ |
| sourceUrl | RSS `<link>` | ✅ |
| imageUrl | JSON-LD `image` | ✅ (requires detail page) |
| organizerName | JSON-LD `organizer.name` | ✅ (requires detail page) |
| venueName | JSON-LD `location.name` | ✅ (requires detail page) |
| venueAddress | JSON-LD `location.address.streetAddress` | ✅ (requires detail page) |
| latitude/longitude | JSON-LD `location.geo` | ✅ (requires detail page) |
| isFree | JSON-LD `isAccessibleForFree` | ✅ (requires detail page) |
| priceFrom | JSON-LD `offers.price` | ✅ (requires detail page) |

**AI needed?** No. The RSS category tags map cleanly:

```typescript
const DEVEVENTS_CATEGORY_MAP: Record<string, string> = {
  'Artificial Intelligence (AI)': 'ai_ml',
  'Machine Learning': 'ai_ml',
  'Deep Learning': 'ai_ml',
  'Cloud': 'cloud_infra',
  'DevOps': 'cloud_infra',
  'Docker / Kubernetes': 'cloud_infra',
  'Serverless': 'cloud_infra',
  'Microservices': 'cloud_infra',
  'Blockchain': 'blockchain_web3',
  'Cybersecurity': 'cybersecurity',
  'Data Science': 'data_science',
  'Big Data / Analytics': 'data_science',
  'UX / Design': 'design_ux',
  'FinTech': 'fintech',
  'HealthTech': 'healthtech',
  'Robotics': 'robotics',
  'IoT': 'robotics',
  'Startup': 'startup',
  // ... extend as new categories appear in RSS
};
```

**Strategy:** RSS feed gives us the list + basic metadata. For each event, fetch the detail page and extract JSON-LD for full structured data. This is a two-pass approach but entirely mechanical — no AI.

---

### Meetup (__NEXT_DATA__ scraping)

| Brainberg Field | Source Field | Status |
|---|---|---|
| title | `Event.title` | ✅ |
| description | `Event.description` (HTML) | 🔧 Strip HTML |
| shortDescription | Truncate stripped description | 🔧 |
| startsAt | `Event.dateTime` | ✅ (ISO format) |
| endsAt | `Event.endTime` | ✅ (ISO format) |
| websiteUrl | `Event.eventUrl` | ✅ |
| meetupUrl | `Event.eventUrl` | ✅ |
| category | `Topic.name` / `TopicCategory.name` | 🔧 Lookup table |
| eventType | `Event.eventType` (ONLINE/PHYSICAL) | 🔧 Map to our enum |
| city → cityId | `Event.venue.city` | 🔧 Lookup |
| country → countryId | `Event.venue.country` | 🔧 Lookup |
| isOnline | `eventType === 'ONLINE'` | ✅ |
| isHybrid | Has both venue AND online link | 🔧 Simple check |
| venueName | `Event.venue.name` | ✅ |
| venueAddress | `Event.venue.address` | ✅ |
| latitude | `Event.venue.lat` | ✅ |
| longitude | `Event.venue.lng` | ✅ |
| source | — | ✅ Hardcode `meetup` |
| sourceId | Event ID from URL | 🔧 Parse from eventUrl |
| sourceUrl | `Event.eventUrl` | ✅ |
| imageUrl | `Event.imageUrl` or `Event.featuredEventPhoto.highResUrl` | ✅ |
| organizerName | `Group.name` | ✅ |
| organizerUrl | Group URL | 🔧 Construct from group urlname |
| tags | Array of `Topic.name` values | ✅ |
| size | `Event.rsvps.totalCount` or group member count | 🔧 |

**AI needed?** No. Meetup has the richest structured data of all 4 sources. Topic objects map cleanly:

```typescript
const MEETUP_TOPIC_MAP: Record<string, string> = {
  'artificial-intelligence': 'ai_ml',
  'machine-learning': 'ai_ml',
  'deep-learning': 'ai_ml',
  'natural-language-processing': 'ai_ml',
  'blockchain': 'blockchain_web3',
  'web3': 'blockchain_web3',
  'ethereum': 'blockchain_web3',
  'cloud-computing': 'cloud_infra',
  'devops': 'cloud_infra',
  'kubernetes': 'cloud_infra',
  'amazon-web-services': 'cloud_infra',
  'cybersecurity': 'cybersecurity',
  'data-science': 'data_science',
  'data-analytics': 'data_science',
  'ux-design': 'design_ux',
  'user-experience': 'design_ux',
  'fintech': 'fintech',
  'health-tech': 'healthtech',
  'robotics': 'robotics',
  'internet-of-things': 'robotics',
  'startup': 'startup',
  'entrepreneurship': 'startup',
  // ... extend from Meetup's topic urlkeys
};
```

The `TopicCategory` level (e.g., "Technology") is too broad but useful as a fallback filter to ensure we only ingest tech events.

---

### Eventbrite (API v3)

| Brainberg Field | Source Field | Status |
|---|---|---|
| title | `name.text` | ✅ |
| description | `description.html` | 🔧 Strip HTML |
| shortDescription | `summary` or `description.text` truncated | 🔧 |
| startsAt | `start.utc` | ✅ (ISO format) |
| endsAt | `end.utc` | ✅ (ISO format) |
| timezone | `start.timezone` | ✅ |
| websiteUrl | `url` | ✅ |
| eventbriteUrl | `url` | ✅ |
| category | `category_id` / `subcategory_id` | 🔧 Lookup (Eventbrite has a categories API) |
| city → cityId | `venue.address.city` | 🔧 Lookup |
| country → countryId | `venue.address.country` | 🔧 Lookup |
| isOnline | `online_event` | ✅ (boolean) |
| venueName | `venue.name` | ✅ |
| venueAddress | `venue.address.localized_address_display` | ✅ |
| latitude | `venue.latitude` | ✅ |
| longitude | `venue.longitude` | ✅ |
| imageUrl | `logo.url` | ✅ |
| isFree | `is_free` | ✅ (boolean) |
| source | — | ✅ Hardcode `eventbrite` |
| sourceId | `id` | ✅ |
| sourceUrl | `url` | ✅ |
| organizerName | `organizer.name` | ✅ (need expand) |
| organizerUrl | `organizer.url` | ✅ (need expand) |
| tags | — | 🔧 From category/subcategory names |

**AI needed?** No. Eventbrite's API is the most structured source. Category IDs map via their `/categories/` endpoint. Eventbrite tech-related category IDs:

```typescript
const EVENTBRITE_CATEGORY_MAP: Record<string, string> = {
  '101': 'general_tech',   // Science & Technology (main)
  '102': 'general_tech',   // Science & Technology subcategories
  // Subcategories of 101 (Science & Tech):
  '101001': 'ai_ml',       // AI / Robotics (if exposed)
  '101002': 'data_science', // Big Data
  '101003': 'cybersecurity', // etc.
  // Need to fetch actual subcategory IDs from API
};
```

The Eventbrite categories API (`/v3/categories/`) returns the full list — we build the map once and hardcode it.

---

## 2. AI Assessment Summary

### Where AI is NOT needed (all 4 sources):

| Task | Approach | Why AI isn't needed |
|---|---|---|
| **Category mapping** | Static lookup tables per source | Each source provides structured category data (filenames, RSS tags, Topic objects, category IDs) |
| **Location parsing** | Direct field mapping + city/country table lookup | All sources provide structured location data |
| **Date parsing** | ISO 8601 in all sources | Standard format, no ambiguity |
| **Event type classification** | Source-specific mapping | confs.tech = always conference; dev.events has RSS tags; Meetup has `eventType`; Eventbrite has `format_id` |
| **HTML stripping** | Regex or html-to-text library | Descriptions are standard HTML |
| **Tag extraction** | Direct from source metadata | RSS categories, Meetup Topics, Eventbrite tags |

### Where AI COULD add value (optional, not required):

| Task | Without AI | With AI | Recommendation |
|---|---|---|---|
| **Catching AI events in confs.tech** | Keyword regex on title (`/\b(AI|ML|LLM|GPT|neural|machine.learning)\b/i`) | LLM classifies title | **Use keyword regex.** Covers 95%+ of cases. Add keywords as we discover misses. |
| **Enriching missing descriptions** | Leave blank, or fetch from event website | LLM generates summary from title + metadata | **Leave blank for now.** Description isn't critical for aggregation. Users click through to the event page anyway. |
| **Handling unmapped categories** | Default to `general_tech` + log for manual review | LLM classifies from title/description | **Default to `general_tech`.** Review logs monthly and expand lookup tables. Much cheaper than per-event LLM calls. |
| **Fuzzy deduplication** | Fingerprint matching (see Section 3) | Embedding similarity | **Start with fingerprints.** Add AI only if false negatives are unacceptable (see Section 3). |

### Cost comparison:
- **Lookup tables:** $0/month, ~0ms per event
- **Keyword regex:** $0/month, ~0ms per event  
- **LLM per event:** ~$0.001-0.01/event × thousands of events/month = $10-100/month
- **Embedding similarity:** ~$0.0001/event for embedding + vector DB costs

**Bottom line: AI is not needed for any of the core ingestion pipeline.** The data sources are structured enough that deterministic mapping handles everything. AI is only worth considering later for edge-case deduplication or description enrichment.

---

## 3. Cross-Source Deduplication Strategy

### The Problem
The same event may appear on multiple platforms:
- A conference listed on confs.tech AND dev.events AND Eventbrite
- A meetup listed on Meetup AND dev.events
- Each source links to a different URL (the event's own website, or the platform listing)

### Strategy: Multi-Layer Fingerprinting (No AI)

#### Layer 1: URL Normalization & Matching (catches ~40% of duplicates)

Events often share a canonical website URL across sources. For example:
- confs.tech entry: `url: "https://aiconf.eu/2026"`
- dev.events RSS: `<link>https://dev.events/e/aiconf-2026</link>` BUT the detail page JSON-LD has `url: "https://aiconf.eu/2026"`
- Eventbrite: `url: "https://eventbrite.com/e/aiconf-2026-123456"` BUT `organizer.website` might be `"https://aiconf.eu/2026"`

**Implementation:**
```typescript
function normalizeUrl(url: string): string {
  const u = new URL(url);
  // Strip www, trailing slash, common tracking params
  let host = u.hostname.replace(/^www\./, '');
  let path = u.pathname.replace(/\/$/, '');
  // Remove tracking params
  u.searchParams.delete('utm_source');
  u.searchParams.delete('utm_medium');
  u.searchParams.delete('utm_campaign');
  u.searchParams.delete('ref');
  u.searchParams.delete('fbclid');
  return `${host}${path}`.toLowerCase();
}
```

Collect all URLs associated with an event (websiteUrl, registrationUrl, sourceUrl) and check for matches across sources.

#### Layer 2: Title + Date + City Fingerprint (catches ~50% of remaining)

For events without matching URLs, generate a deterministic fingerprint:

```typescript
function eventFingerprint(event: {
  title: string;
  startsAt: Date;
  city: string | null;
  isOnline: boolean;
}): string {
  const normalizedTitle = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')  // Strip all non-alphanumeric
    .replace(/(2026|2025|2024)/g, '')  // Strip year references
    .replace(/(conference|conf|summit|meetup|workshop|webinar)/g, '');  // Strip event type words
  
  const dateKey = event.startsAt.toISOString().slice(0, 10); // YYYY-MM-DD
  
  const locationKey = event.isOnline 
    ? 'online' 
    : (event.city || 'unknown').toLowerCase().replace(/[^a-z]/g, '');
  
  return `${normalizedTitle}|${dateKey}|${locationKey}`;
}
```

**Why this works:** If "AI Conference Europe" on confs.tech has the same start date and city as "AI Conference Europe 2026" on dev.events, the fingerprint will match because we strip years and normalize the title.

**Collision safety:** The `title + exact_date + city` combination is highly specific. Two genuinely different events with the same title on the same day in the same city are extremely rare for tech events.

#### Layer 3: Fuzzy Title + Date Window (catches ~8% of remaining)

Some events have slightly different names across platforms:
- "European AI Summit" vs "EU AI Summit 2026"
- "React Conf" vs "React Conference 2026"

**Implementation:**
```typescript
function fuzzyMatch(a: string, b: string): number {
  // Normalized Levenshtein distance or Jaccard similarity on word bigrams
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));
  
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size; // Jaccard similarity
}

// Match if:
// - Jaccard similarity > 0.6
// - Start dates within 1 day of each other
// - Same city (or both online)
```

#### Layer 4 (Optional Future): AI Embedding Similarity

Only if Layers 1-3 produce unacceptable false negatives:
- Generate embeddings for `title + city + date` 
- Cosine similarity > 0.92 + same week + same city → probable duplicate
- **Cost:** ~$0.0001/event for embedding, needs a vector store
- **Recommendation:** Don't build this until we have real data showing missed duplicates

### Deduplication Merge Strategy

When a duplicate is detected, we need to decide which data to keep:

```typescript
const SOURCE_PRIORITY = {
  eventbrite: 4,  // Best structured data, has pricing
  meetup: 3,      // Rich metadata, venue details
  dev_events: 2,  // Good structured data from JSON-LD
  confs_tech: 1,  // Minimal fields
};
```

**Merge rules:**
1. **Keep the highest-priority source as the primary record**
2. **Fill empty fields from lower-priority sources** (e.g., confs.tech might be missing description, but dev.events has it)
3. **Store all source URLs** — if it's on Eventbrite AND Meetup, store both `eventbriteUrl` and `meetupUrl`
4. **Store all sourceIds** — use a junction table `event_sources` to track which sources an event came from:

```sql
CREATE TABLE event_sources (
  event_id UUID REFERENCES events(id),
  source event_source_enum NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, source)
);
```

This lets us:
- Track provenance per source
- Know when a source last confirmed the event still exists
- Update from whichever source has the freshest data

### Deduplication Timing

**When to deduplicate:**
- **On ingestion:** Each scraper produces normalized events. Before INSERT, check fingerprints against existing events.
- **Batch reconciliation:** Weekly job that re-runs Layer 2 and Layer 3 across all events (catches any that slipped through during ingestion).

**Process flow:**
```
Scraper → Normalize → Generate fingerprints → 
  Check Layer 1 (URL match) →
  Check Layer 2 (exact fingerprint) →
  Check Layer 3 (fuzzy match) →
  If duplicate: merge into existing record →
  If new: INSERT + add to fingerprint index
```

---

## 4. Recommended Schema Changes

```sql
-- Add new source types
ALTER TYPE event_source_enum ADD VALUE 'confs_tech';
ALTER TYPE event_source_enum ADD VALUE 'dev_events';

-- Add source-specific URL fields  
ALTER TABLE events ADD COLUMN confs_tech_url TEXT;
ALTER TABLE events ADD COLUMN dev_events_url TEXT;

-- Add event_sources junction table for multi-source tracking
CREATE TABLE event_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source event_source_enum NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  raw_data JSONB,  -- Store original source payload for debugging
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, source)
);

CREATE INDEX idx_event_sources_source_id ON event_sources(source, source_id);

-- Fingerprint index for deduplication
CREATE TABLE event_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  fingerprint_type TEXT NOT NULL,  -- 'url', 'title_date_city', etc.
  fingerprint_value TEXT NOT NULL,
  UNIQUE (fingerprint_type, fingerprint_value)
);

CREATE INDEX idx_event_fingerprints_lookup 
  ON event_fingerprints(fingerprint_type, fingerprint_value);
```

---

## 5. Implementation Recommendation

### Phase order:
1. **Schema migration** — Add enum values, new tables
2. **confs.tech scraper** — Simplest source, proves the pipeline
3. **Category mapping utility** — Shared by all scrapers
4. **dev.events scraper** — RSS + detail page fetch
5. **Meetup scraper** — `__NEXT_DATA__` parsing
6. **Eventbrite scraper** — Needs API key, last
7. **Deduplication service** — Layers 1-3, run on ingestion + weekly batch

### AI verdict:
**No AI needed for the initial pipeline.** All 4 sources provide enough structured metadata for deterministic category mapping, field extraction, and deduplication. Budget $0/month for AI processing. Revisit only if:
- Unmapped categories exceed 10% of ingested events
- Deduplication false negatives exceed 5% (detected via manual spot checks)
- Users complain about missing/wrong categories
