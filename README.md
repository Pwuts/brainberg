# Brainberg 🔮

**Discover AI & Tech Events Across Europe**

Brainberg is an open-source event aggregator for the European tech scene — think [Cerebral Valley](https://cerebralvalley.ai), but for all of Europe. Find AI meetups, startup conferences, hackathons, workshops, and more.

## Features

- 🌍 **40+ European countries** with city-level filtering
- 🔍 **Full-text search** with PostgreSQL tsvector + autocomplete
- 📍 **Geospatial queries** — find events near you with PostGIS
- 🏷️ **Rich filtering** — by category, type, size, date, free/online
- 📱 **Responsive design** — works on desktop and mobile
- 🚀 **Fast** — React Server Components, cursor-based pagination
- 🐳 **Docker-ready** — single container deployment

## Tech Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **Styling**: Tailwind CSS 4 + shadcn/ui-inspired components
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **ORM**: Drizzle ORM with custom PostGIS types
- **Search**: PostgreSQL full-text search (tsvector + GIN index)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for the database)

### 1. Clone & install

```bash
git clone https://github.com/Pwuts/brainberg.git
cd brainberg
npm install
```

### 2. Start the database

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

This starts a PostGIS-enabled PostgreSQL on port 5432 with:
- Database: `brainberg_dev`
- User: `brainberg`
- Password: `devpassword`

### 3. Set up environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 4. Push schema & seed data

```bash
npm run db:push
npm run db:seed
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see 12 sample events across Europe.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # REST API endpoints
│   │   ├── events/        # Events CRUD
│   │   ├── search/        # Full-text search + autocomplete
│   │   ├── countries/     # Country list
│   │   ├── cities/        # City list (filterable by country)
│   │   ├── categories/    # Category list
│   │   └── health/        # Health check
│   ├── events/            # Event pages
│   │   ├── [slug]/        # Event detail page
│   │   └── submit/        # Submit event (coming soon)
│   ├── map/               # Map view (coming soon)
│   ├── calendar/          # Calendar view (coming soon)
│   └── page.tsx           # Home page
├── components/
│   ├── events/            # Event-specific components
│   ├── layout/            # Header, footer
│   └── ui/                # Base UI primitives (badge, button, card, etc.)
├── lib/
│   ├── db/                # Database schema, types, client
│   ├── events.ts          # Data access layer
│   └── utils.ts           # Helpers, labels, colors
└── scripts/
    └── seed.ts            # Database seed script
```

## Docker Production Deployment

```bash
# Build and run with Docker Compose
docker compose -f docker/docker-compose.yml up -d
```

The app runs on `127.0.0.1:3000`. Put a reverse proxy (nginx/caddy) in front for HTTPS.

## Roadmap

- [ ] Interactive map view (Leaflet + OpenStreetMap)
- [ ] Calendar view
- [ ] Event submission with magic-link auth
- [ ] Admin dashboard
- [ ] Scrapers (Luma, Eventbrite, Meetup)
- [ ] Radius-based "near me" search
- [ ] GDPR cookie consent
- [ ] RSS/iCal feeds
- [ ] Email digest notifications

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

## License

MIT
