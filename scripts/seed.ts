import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { countries, cities, events } from "../src/lib/db/schema";
import slugify from "slugify";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const COUNTRIES = [
  { code: "AT", name: "Austria", timezone: "Europe/Vienna", isEu: true, region: "Central" },
  { code: "BE", name: "Belgium", timezone: "Europe/Brussels", isEu: true, region: "Western" },
  { code: "BG", name: "Bulgaria", timezone: "Europe/Sofia", isEu: true, region: "Eastern" },
  { code: "HR", name: "Croatia", timezone: "Europe/Zagreb", isEu: true, region: "Southern" },
  { code: "CY", name: "Cyprus", timezone: "Asia/Nicosia", isEu: true, region: "Southern" },
  { code: "CZ", name: "Czechia", timezone: "Europe/Prague", isEu: true, region: "Central" },
  { code: "DK", name: "Denmark", timezone: "Europe/Copenhagen", isEu: true, region: "Northern" },
  { code: "EE", name: "Estonia", timezone: "Europe/Tallinn", isEu: true, region: "Northern" },
  { code: "FI", name: "Finland", timezone: "Europe/Helsinki", isEu: true, region: "Northern" },
  { code: "FR", name: "France", timezone: "Europe/Paris", isEu: true, region: "Western" },
  { code: "DE", name: "Germany", timezone: "Europe/Berlin", isEu: true, region: "Central" },
  { code: "GR", name: "Greece", timezone: "Europe/Athens", isEu: true, region: "Southern" },
  { code: "HU", name: "Hungary", timezone: "Europe/Budapest", isEu: true, region: "Central" },
  { code: "IE", name: "Ireland", timezone: "Europe/Dublin", isEu: true, region: "Western" },
  { code: "IT", name: "Italy", timezone: "Europe/Rome", isEu: true, region: "Southern" },
  { code: "LV", name: "Latvia", timezone: "Europe/Riga", isEu: true, region: "Northern" },
  { code: "LT", name: "Lithuania", timezone: "Europe/Vilnius", isEu: true, region: "Northern" },
  { code: "LU", name: "Luxembourg", timezone: "Europe/Luxembourg", isEu: true, region: "Western" },
  { code: "MT", name: "Malta", timezone: "Europe/Malta", isEu: true, region: "Southern" },
  { code: "NL", name: "Netherlands", timezone: "Europe/Amsterdam", isEu: true, region: "Western" },
  { code: "PL", name: "Poland", timezone: "Europe/Warsaw", isEu: true, region: "Central" },
  { code: "PT", name: "Portugal", timezone: "Europe/Lisbon", isEu: true, region: "Southern" },
  { code: "RO", name: "Romania", timezone: "Europe/Bucharest", isEu: true, region: "Eastern" },
  { code: "SK", name: "Slovakia", timezone: "Europe/Bratislava", isEu: true, region: "Central" },
  { code: "SI", name: "Slovenia", timezone: "Europe/Ljubljana", isEu: true, region: "Central" },
  { code: "ES", name: "Spain", timezone: "Europe/Madrid", isEu: true, region: "Southern" },
  { code: "SE", name: "Sweden", timezone: "Europe/Stockholm", isEu: true, region: "Northern" },
  { code: "GB", name: "United Kingdom", timezone: "Europe/London", isEu: false, region: "Western" },
  { code: "CH", name: "Switzerland", timezone: "Europe/Zurich", isEu: false, region: "Central" },
  { code: "NO", name: "Norway", timezone: "Europe/Oslo", isEu: false, region: "Northern" },
  { code: "IS", name: "Iceland", timezone: "Atlantic/Reykjavik", isEu: false, region: "Northern" },
  { code: "UA", name: "Ukraine", timezone: "Europe/Kyiv", isEu: false, region: "Eastern" },
  { code: "RS", name: "Serbia", timezone: "Europe/Belgrade", isEu: false, region: "Southern" },
  { code: "TR", name: "Turkey", timezone: "Europe/Istanbul", isEu: false, region: "Southern" },
  { code: "AL", name: "Albania", timezone: "Europe/Tirane", isEu: false, region: "Southern" },
  { code: "BA", name: "Bosnia and Herzegovina", timezone: "Europe/Sarajevo", isEu: false, region: "Southern" },
  { code: "ME", name: "Montenegro", timezone: "Europe/Podgorica", isEu: false, region: "Southern" },
  { code: "MK", name: "North Macedonia", timezone: "Europe/Skopje", isEu: false, region: "Southern" },
  { code: "MD", name: "Moldova", timezone: "Europe/Chisinau", isEu: false, region: "Eastern" },
  { code: "GE", name: "Georgia", timezone: "Asia/Tbilisi", isEu: false, region: "Eastern" },
];

const CITIES = [
  // Western Europe
  { name: "London", countryCode: "GB", lat: 51.5074, lng: -0.1278, tz: "Europe/London", popular: true },
  { name: "Paris", countryCode: "FR", lat: 48.8566, lng: 2.3522, tz: "Europe/Paris", popular: true },
  { name: "Amsterdam", countryCode: "NL", lat: 52.3676, lng: 4.9041, tz: "Europe/Amsterdam", popular: true },
  { name: "Rotterdam", countryCode: "NL", lat: 51.9244, lng: 4.4777, tz: "Europe/Amsterdam", popular: false },
  { name: "The Hague", countryCode: "NL", lat: 52.0705, lng: 4.3007, tz: "Europe/Amsterdam", popular: false },
  { name: "Eindhoven", countryCode: "NL", lat: 51.4416, lng: 5.4697, tz: "Europe/Amsterdam", popular: false },
  { name: "Brussels", countryCode: "BE", lat: 50.8503, lng: 4.3517, tz: "Europe/Brussels", popular: true },
  { name: "Dublin", countryCode: "IE", lat: 53.3498, lng: -6.2603, tz: "Europe/Dublin", popular: true },
  { name: "Luxembourg City", countryCode: "LU", lat: 49.6117, lng: 6.1300, tz: "Europe/Luxembourg", popular: false },
  // Germany
  { name: "Berlin", countryCode: "DE", lat: 52.5200, lng: 13.4050, tz: "Europe/Berlin", popular: true },
  { name: "Munich", countryCode: "DE", lat: 48.1351, lng: 11.5820, tz: "Europe/Berlin", popular: true },
  { name: "Hamburg", countryCode: "DE", lat: 53.5511, lng: 9.9937, tz: "Europe/Berlin", popular: false },
  { name: "Frankfurt", countryCode: "DE", lat: 50.1109, lng: 8.6821, tz: "Europe/Berlin", popular: false },
  { name: "Cologne", countryCode: "DE", lat: 50.9375, lng: 6.9603, tz: "Europe/Berlin", popular: false },
  { name: "Stuttgart", countryCode: "DE", lat: 48.7758, lng: 9.1829, tz: "Europe/Berlin", popular: false },
  // Switzerland & Austria
  { name: "Zurich", countryCode: "CH", lat: 47.3769, lng: 8.5417, tz: "Europe/Zurich", popular: true },
  { name: "Geneva", countryCode: "CH", lat: 46.2044, lng: 6.1432, tz: "Europe/Zurich", popular: false },
  { name: "Vienna", countryCode: "AT", lat: 48.2082, lng: 16.3738, tz: "Europe/Vienna", popular: true },
  // Nordic
  { name: "Stockholm", countryCode: "SE", lat: 59.3293, lng: 18.0686, tz: "Europe/Stockholm", popular: true },
  { name: "Helsinki", countryCode: "FI", lat: 60.1699, lng: 24.9384, tz: "Europe/Helsinki", popular: true },
  { name: "Copenhagen", countryCode: "DK", lat: 55.6761, lng: 12.5683, tz: "Europe/Copenhagen", popular: true },
  { name: "Oslo", countryCode: "NO", lat: 59.9139, lng: 10.7522, tz: "Europe/Oslo", popular: false },
  { name: "Reykjavik", countryCode: "IS", lat: 64.1466, lng: -21.9426, tz: "Atlantic/Reykjavik", popular: false },
  // Southern Europe
  { name: "Barcelona", countryCode: "ES", lat: 41.3874, lng: 2.1686, tz: "Europe/Madrid", popular: true },
  { name: "Madrid", countryCode: "ES", lat: 40.4168, lng: -3.7038, tz: "Europe/Madrid", popular: true },
  { name: "Lisbon", countryCode: "PT", lat: 38.7223, lng: -9.1393, tz: "Europe/Lisbon", popular: true },
  { name: "Porto", countryCode: "PT", lat: 41.1579, lng: -8.6291, tz: "Europe/Lisbon", popular: false },
  { name: "Milan", countryCode: "IT", lat: 45.4642, lng: 9.1900, tz: "Europe/Rome", popular: true },
  { name: "Rome", countryCode: "IT", lat: 41.9028, lng: 12.4964, tz: "Europe/Rome", popular: false },
  { name: "Turin", countryCode: "IT", lat: 45.0703, lng: 7.6869, tz: "Europe/Rome", popular: false },
  { name: "Athens", countryCode: "GR", lat: 37.9838, lng: 23.7275, tz: "Europe/Athens", popular: false },
  { name: "Valletta", countryCode: "MT", lat: 35.8989, lng: 14.5146, tz: "Europe/Malta", popular: false },
  // Central & Eastern Europe
  { name: "Prague", countryCode: "CZ", lat: 50.0755, lng: 14.4378, tz: "Europe/Prague", popular: true },
  { name: "Warsaw", countryCode: "PL", lat: 52.2297, lng: 21.0122, tz: "Europe/Warsaw", popular: true },
  { name: "Krakow", countryCode: "PL", lat: 50.0647, lng: 19.9450, tz: "Europe/Warsaw", popular: false },
  { name: "Budapest", countryCode: "HU", lat: 47.4979, lng: 19.0402, tz: "Europe/Budapest", popular: true },
  { name: "Bratislava", countryCode: "SK", lat: 48.1486, lng: 17.1077, tz: "Europe/Bratislava", popular: false },
  { name: "Ljubljana", countryCode: "SI", lat: 46.0569, lng: 14.5058, tz: "Europe/Ljubljana", popular: false },
  { name: "Zagreb", countryCode: "HR", lat: 45.8150, lng: 15.9819, tz: "Europe/Zagreb", popular: false },
  // Baltics
  { name: "Tallinn", countryCode: "EE", lat: 59.4370, lng: 24.7536, tz: "Europe/Tallinn", popular: true },
  { name: "Riga", countryCode: "LV", lat: 56.9496, lng: 24.1052, tz: "Europe/Riga", popular: false },
  { name: "Vilnius", countryCode: "LT", lat: 54.6872, lng: 25.2797, tz: "Europe/Vilnius", popular: false },
  // Southeast & East
  { name: "Bucharest", countryCode: "RO", lat: 44.4268, lng: 26.1025, tz: "Europe/Bucharest", popular: false },
  { name: "Sofia", countryCode: "BG", lat: 42.6977, lng: 23.3219, tz: "Europe/Sofia", popular: false },
  { name: "Belgrade", countryCode: "RS", lat: 44.7866, lng: 20.4489, tz: "Europe/Belgrade", popular: false },
  { name: "Istanbul", countryCode: "TR", lat: 41.0082, lng: 28.9784, tz: "Europe/Istanbul", popular: true },
  { name: "Kyiv", countryCode: "UA", lat: 50.4501, lng: 30.5234, tz: "Europe/Kyiv", popular: false },
  { name: "Tbilisi", countryCode: "GE", lat: 41.7151, lng: 44.8271, tz: "Asia/Tbilisi", popular: false },
  // France extras
  { name: "Lyon", countryCode: "FR", lat: 45.7640, lng: 4.8357, tz: "Europe/Paris", popular: false },
  { name: "Toulouse", countryCode: "FR", lat: 43.6047, lng: 1.4442, tz: "Europe/Paris", popular: false },
  // UK extras
  { name: "Manchester", countryCode: "GB", lat: 53.4808, lng: -2.2426, tz: "Europe/London", popular: false },
  { name: "Edinburgh", countryCode: "GB", lat: 55.9533, lng: -3.1883, tz: "Europe/London", popular: false },
  { name: "Cambridge", countryCode: "GB", lat: 52.2053, lng: 0.1218, tz: "Europe/London", popular: false },
  // Nicosia
  { name: "Nicosia", countryCode: "CY", lat: 35.1856, lng: 33.3823, tz: "Asia/Nicosia", popular: false },
];

// Sample events for demo
const SAMPLE_EVENTS = [
  {
    title: "Web Summit 2026",
    description: "The world's largest tech conference returns to Lisbon with 70,000+ attendees, covering AI, SaaS, deep tech, and more.",
    shortDescription: "The world's largest tech conference in Lisbon.",
    category: "general_tech" as const,
    eventType: "conference" as const,
    size: "major" as const,
    startsAt: new Date("2026-11-03T09:00:00+00:00"),
    endsAt: new Date("2026-11-06T18:00:00+00:00"),
    timezone: "Europe/Lisbon",
    isMultiDay: true,
    citySlug: "lisbon",
    venueName: "Altice Arena & FIL",
    isFree: false,
    priceFrom: 695,
    priceTo: 2450,
    websiteUrl: "https://websummit.com",
    registrationUrl: "https://websummit.com/tickets",
    organizerName: "Web Summit",
    source: "manual" as const,
  },
  {
    title: "VivaTech 2026",
    description: "Europe's biggest startup and tech event. Meet 13,000+ startups, top-tier speakers, and innovation leaders in Paris.",
    shortDescription: "Europe's biggest startup and tech event in Paris.",
    category: "startup" as const,
    eventType: "conference" as const,
    size: "major" as const,
    startsAt: new Date("2026-06-11T09:00:00+02:00"),
    endsAt: new Date("2026-06-14T18:00:00+02:00"),
    timezone: "Europe/Paris",
    isMultiDay: true,
    citySlug: "paris",
    venueName: "Paris Expo Porte de Versailles",
    isFree: false,
    priceFrom: 50,
    priceTo: 600,
    websiteUrl: "https://vivatechnology.com",
    registrationUrl: "https://vivatechnology.com/tickets",
    organizerName: "VivaTech",
    source: "manual" as const,
  },
  {
    title: "Slush 2026",
    description: "The world's leading startup event. Two days of networking, pitching, and learning in Helsinki.",
    shortDescription: "The world's leading startup event in Helsinki.",
    category: "startup" as const,
    eventType: "conference" as const,
    size: "major" as const,
    startsAt: new Date("2026-11-19T09:00:00+02:00"),
    endsAt: new Date("2026-11-20T20:00:00+02:00"),
    timezone: "Europe/Helsinki",
    isMultiDay: true,
    citySlug: "helsinki",
    venueName: "Helsinki Expo and Convention Centre",
    isFree: false,
    priceFrom: 295,
    priceTo: 1295,
    websiteUrl: "https://slush.org",
    registrationUrl: "https://slush.org/tickets",
    organizerName: "Slush",
    source: "manual" as const,
  },
  {
    title: "Berlin AI Meetup #47",
    description: "Monthly gathering of AI practitioners in Berlin. This month: practical RAG architectures and lessons learned from production systems.",
    shortDescription: "Monthly AI practitioners meetup in Berlin.",
    category: "ai_ml" as const,
    eventType: "meetup" as const,
    size: "medium" as const,
    startsAt: new Date("2026-05-14T18:30:00+02:00"),
    endsAt: new Date("2026-05-14T21:00:00+02:00"),
    timezone: "Europe/Berlin",
    isMultiDay: false,
    citySlug: "berlin",
    venueName: "Factory Berlin Görlitzer Park",
    venueAddress: "Lohmühlenstraße 65, 12435 Berlin",
    isFree: true,
    websiteUrl: "https://lu.ma/berlin-ai",
    registrationUrl: "https://lu.ma/berlin-ai-47",
    organizerName: "Berlin AI Community",
    source: "manual" as const,
  },
  {
    title: "Amsterdam Blockchain Week",
    description: "A week of blockchain and Web3 events across Amsterdam, featuring talks, workshops, and hackathons.",
    shortDescription: "Week-long blockchain festival across Amsterdam.",
    category: "blockchain_web3" as const,
    eventType: "conference" as const,
    size: "large" as const,
    startsAt: new Date("2026-06-22T09:00:00+02:00"),
    endsAt: new Date("2026-06-28T18:00:00+02:00"),
    timezone: "Europe/Amsterdam",
    isMultiDay: true,
    citySlug: "amsterdam",
    venueName: "Various venues across Amsterdam",
    isFree: false,
    priceFrom: 0,
    priceTo: 499,
    websiteUrl: "https://blockchainweek.amsterdam",
    organizerName: "Amsterdam Blockchain Week Foundation",
    source: "manual" as const,
  },
  {
    title: "London AI Safety Unconference",
    description: "An open-format unconference exploring AI alignment, safety research, and governance. Bring your ideas and join the conversation.",
    shortDescription: "Open-format AI safety unconference in London.",
    category: "ai_ml" as const,
    eventType: "workshop" as const,
    size: "small" as const,
    startsAt: new Date("2026-05-23T10:00:00+01:00"),
    endsAt: new Date("2026-05-23T17:00:00+01:00"),
    timezone: "Europe/London",
    isMultiDay: false,
    citySlug: "london",
    venueName: "Imperial College London",
    isFree: true,
    websiteUrl: "https://aisafetyunconf.org",
    organizerName: "AI Safety London",
    source: "manual" as const,
  },
  {
    title: "European Startup Hackathon",
    description: "48-hour hackathon bringing together 200+ developers from across Europe. Build, ship, and pitch your startup idea.",
    shortDescription: "48-hour pan-European hackathon in Barcelona.",
    category: "startup" as const,
    eventType: "hackathon" as const,
    size: "large" as const,
    startsAt: new Date("2026-07-10T18:00:00+02:00"),
    endsAt: new Date("2026-07-12T18:00:00+02:00"),
    timezone: "Europe/Madrid",
    isMultiDay: true,
    citySlug: "barcelona",
    venueName: "Fira Barcelona",
    isFree: false,
    priceFrom: 25,
    websiteUrl: "https://eustartupshack.eu",
    organizerName: "EU Startup Network",
    source: "manual" as const,
  },
  {
    title: "Stockholm AI & Data Summit",
    description: "Nordic region's premier AI conference featuring talks on LLMs, MLOps, data engineering, and responsible AI.",
    shortDescription: "Nordic premier AI & data conference in Stockholm.",
    category: "ai_ml" as const,
    eventType: "conference" as const,
    size: "large" as const,
    startsAt: new Date("2026-09-15T08:30:00+02:00"),
    endsAt: new Date("2026-09-16T17:00:00+02:00"),
    timezone: "Europe/Stockholm",
    isMultiDay: true,
    citySlug: "stockholm",
    venueName: "Münchenbryggeriet",
    isFree: false,
    priceFrom: 399,
    priceTo: 899,
    websiteUrl: "https://ai-data-summit.se",
    organizerName: "Nordic AI Alliance",
    source: "manual" as const,
  },
  {
    title: "Prague DevTools Meetup",
    description: "Monthly meetup for developer tools enthusiasts. This month: building CLI tools with Go and Rust.",
    shortDescription: "Monthly developer tools meetup in Prague.",
    category: "devtools" as const,
    eventType: "meetup" as const,
    size: "small" as const,
    startsAt: new Date("2026-05-20T18:00:00+02:00"),
    endsAt: new Date("2026-05-20T20:30:00+02:00"),
    timezone: "Europe/Prague",
    isMultiDay: false,
    citySlug: "prague",
    venueName: "Node5 Coworking",
    venueAddress: "Radlická 50, Prague 5",
    isFree: true,
    organizerName: "Prague Dev Community",
    source: "manual" as const,
  },
  {
    title: "Zurich FinTech Forum 2026",
    description: "Switzerland's leading fintech conference, connecting banks, startups, and regulators. Topics include DeFi, digital banking, and embedded finance.",
    shortDescription: "Switzerland's leading fintech conference.",
    category: "fintech" as const,
    eventType: "conference" as const,
    size: "medium" as const,
    startsAt: new Date("2026-10-08T09:00:00+02:00"),
    endsAt: new Date("2026-10-08T18:00:00+02:00"),
    timezone: "Europe/Zurich",
    isMultiDay: false,
    citySlug: "zurich",
    venueName: "Kongresshaus Zurich",
    isFree: false,
    priceFrom: 250,
    priceTo: 750,
    websiteUrl: "https://fintechforum.ch",
    organizerName: "Swiss Finance+Technology Association",
    source: "manual" as const,
  },
  {
    title: "Tallinn Digital Society Conference",
    description: "Estonia's flagship digital government and e-governance conference. Learn from the world's most advanced digital society.",
    shortDescription: "Estonia's flagship digital society conference.",
    category: "general_tech" as const,
    eventType: "conference" as const,
    size: "medium" as const,
    startsAt: new Date("2026-06-04T09:00:00+03:00"),
    endsAt: new Date("2026-06-05T17:00:00+03:00"),
    timezone: "Europe/Tallinn",
    isMultiDay: true,
    citySlug: "tallinn",
    venueName: "Kultuurikatel",
    isFree: false,
    priceFrom: 150,
    websiteUrl: "https://digitalsociety.ee",
    organizerName: "e-Estonia",
    source: "manual" as const,
  },
  {
    title: "Milan Design & UX Week",
    description: "A week of workshops, talks, and exhibitions on design systems, UX research, and product design.",
    shortDescription: "Design and UX conference week in Milan.",
    category: "design_ux" as const,
    eventType: "conference" as const,
    size: "medium" as const,
    startsAt: new Date("2026-09-21T09:00:00+02:00"),
    endsAt: new Date("2026-09-25T17:00:00+02:00"),
    timezone: "Europe/Rome",
    isMultiDay: true,
    citySlug: "milan",
    venueName: "BASE Milano",
    isFree: false,
    priceFrom: 199,
    priceTo: 499,
    websiteUrl: "https://milanodesignweek.tech",
    organizerName: "Milano Design+Tech",
    source: "manual" as const,
  },
];

async function seed() {
  console.log("🌱 Seeding database...");

  // Insert countries
  console.log("  → Countries...");
  const insertedCountries = await db
    .insert(countries)
    .values(COUNTRIES)
    .onConflictDoNothing()
    .returning();
  console.log(`    ✓ ${insertedCountries.length} countries`);

  // Build country code → id map
  const countryMap = new Map(insertedCountries.map((c) => [c.code, c.id]));

  // Insert cities
  console.log("  → Cities...");
  const cityValues = CITIES.map((c) => ({
    name: c.name,
    slug: slugify(c.name, { lower: true, strict: true }),
    countryId: countryMap.get(c.countryCode)!,
    latitude: c.lat,
    longitude: c.lng,
    location: [c.lng, c.lat] as [number, number], // PostGIS: [lng, lat]
    timezone: c.tz,
    isPopular: c.popular,
  }));

  const insertedCities = await db
    .insert(cities)
    .values(cityValues)
    .onConflictDoNothing()
    .returning();
  console.log(`    ✓ ${insertedCities.length} cities`);

  // Build city slug → data map
  const cityMap = new Map(insertedCities.map((c) => [c.slug, c]));

  // Insert sample events
  console.log("  → Sample events...");
  let eventCount = 0;
  for (const evt of SAMPLE_EVENTS) {
    const city = cityMap.get(evt.citySlug);
    if (!city) {
      console.warn(`    ⚠ City not found: ${evt.citySlug}, skipping ${evt.title}`);
      continue;
    }
    const country = insertedCountries.find((c) => c.id === city.countryId);

    await db.insert(events).values({
      title: evt.title,
      slug: slugify(evt.title, { lower: true, strict: true }),
      description: evt.description,
      shortDescription: evt.shortDescription,
      category: evt.category,
      eventType: evt.eventType,
      size: evt.size,
      startsAt: evt.startsAt,
      endsAt: evt.endsAt ?? null,
      timezone: evt.timezone,
      isMultiDay: evt.isMultiDay,
      cityId: city.id,
      countryId: country?.id ?? null,
      venueName: evt.venueName ?? null,
      venueAddress: evt.venueAddress ?? null,
      latitude: city.latitude,
      longitude: city.longitude,
      location: [city.longitude, city.latitude] as [number, number],
      isFree: evt.isFree,
      priceFrom: evt.priceFrom ?? null,
      priceTo: evt.priceTo ?? null,
      websiteUrl: evt.websiteUrl ?? null,
      registrationUrl: evt.registrationUrl ?? null,
      organizerName: evt.organizerName ?? null,
      source: evt.source,
      status: "approved",
    }).onConflictDoNothing();
    eventCount++;
  }
  console.log(`    ✓ ${eventCount} events`);

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
