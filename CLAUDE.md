# Brainberg Contributor Notes

Guidance for contributors and AI coding assistants working on this codebase.
Short and high-signal. Extend when durable patterns emerge.

## Ingestion methods

When adding a new ingestion method (a new scraper source, a new structured-data
format, an RSS adapter, a webhook endpoint that accepts submissions, etc.):

1. Implement it under `src/lib/scraper/sources/` or `src/app/api/` as
   appropriate, and register it with the orchestrator in
   `src/lib/scraper/orchestrator.ts`.
2. **Update the "Publish your events on Brainberg" section in
   [`src/app/about/page.tsx`](src/app/about/page.tsx)**. That page is the
   canonical description of what organizers need to expose for us to ingest
   their events. The README just links to `/about`, so README changes are
   rarely needed for content updates.
3. If the new method introduces per-source config (like the microdata and Luma
   patterns that read from `scraperSources`), document how to add a source via
   `/admin/scrapers` in the README and expose a form/section for it in the
   admin UI.
