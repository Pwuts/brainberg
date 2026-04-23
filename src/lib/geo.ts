/**
 * Slug + intro copy for country and city landing pages.
 * Pairs with the static pages under /events/in/.
 */

// ISO-2 code → 1–2 sentence scene character. Seeds the country-intro
// template. Intentionally specific: mention the cities, the communities,
// the tilt. What Google sees here differs per country enough to not look
// templated.
const COUNTRY_SCENE: Record<string, string> = {
  DE: "Germany runs the densest tech-event calendar in continental Europe, anchored by Berlin's deep Rust, Go, data, and AI-applied scenes and complemented by active communities in Munich (embedded, mobility tech), Hamburg (media and product), Frankfurt (cloud and fintech), and Cologne (games, devrel).",
  GB: "The UK tech scene leans heavily on London, which has one of the largest single-city event calendars in Europe across fintech, AI, engineering leadership, and product management. Strong regional hubs continue through Manchester, Edinburgh, Bristol, Cambridge, and Leeds.",
  FR: "France's tech events split between Paris, a major hub for AI research, Web3, and product, and a fast-growing regional circuit across Lyon, Nantes, Lille, Bordeaux, and Toulouse where hardware, games, and open-source communities are particularly strong.",
  ES: "Spain's tech-event calendar is distributed across Barcelona (the largest, with strong software engineering, product, and mobile scenes), Madrid (AI, fintech, startups), Málaga and Valencia (fast-growing remote and nomad communities), and regional hubs like Bilbao and Seville.",
  BE: "Belgian tech events cluster heavily around Brussels, the EU policy center of gravity and home to outsized numbers of tech-policy, AI-governance, and privacy events, alongside engineering communities in Antwerp, Ghent, and Leuven.",
  NL: "The Netherlands punches above its size on tech events. Amsterdam runs one of Europe's strongest applied-AI and product scenes, and Rotterdam, Utrecht, Eindhoven, Delft, and The Hague each sustain specialized communities in design, hardware, embedded, and data.",
  IE: "Ireland's tech-event calendar centers on Dublin, home to the European HQs of most major US cloud providers and a deep meetup circuit across software, DevOps, data, and product. Satellite communities continue to grow in Cork and Galway.",
  IT: "Italian tech events are led by Milan (fintech, enterprise, product) and Rome, with fast-growing scenes in Turin (automotive and mobility), Bologna (open source), Florence, and the remote-work communities emerging around southern Italy.",
  AT: "Vienna hosts the bulk of Austria's tech events, with strong tracks in AI, software engineering, and product, complemented by active communities in Linz, Graz, Salzburg, and Innsbruck.",
  CH: "Switzerland's tech-event calendar punches well above the country's size, anchored by Zurich (ETH and the deep ML-research community around it), Geneva (policy, research institutes), Basel (bio and health tech), Bern, and Lausanne (EPFL).",
  PL: "Poland has one of the fastest-growing tech-event calendars in Europe, distributed across Warsaw (largest and most varied), Kraków (deep software engineering and games), Wrocław, Poznań, Gdańsk, and a rising startup scene in several regional cities.",
  PT: "Lisbon runs Portugal's densest tech-event calendar, supercharged by Web Summit and the startup inflow of the last several years. Porto, Braga, and the wider country sustain a growing remote-work-adjacent event scene.",
  SE: "Sweden's tech-event calendar is anchored by Stockholm, one of Europe's strongest product, fintech, and games hubs, with meaningful scenes in Gothenburg (hardware, automotive) and Malmö (games and design).",
  DK: "Copenhagen runs one of the most design-forward tech-event calendars in Europe (UX Copenhagen, Design Matters) alongside strong product, fintech, and green-tech communities, with Aarhus sustaining its own active meetup scene.",
  CZ: "Prague leads the Czech tech-event calendar across software engineering, games, and DevOps, with Brno hosting a surprisingly deep developer scene around Masaryk University, Red Hat, and the local product ecosystem.",
  NO: "Norwegian tech events split between Oslo (the bulk of the calendar across software, AI, and product), Bergen, Trondheim (robotics, engineering education), and Stavanger (energy tech).",
  FI: "Helsinki drives Finland's tech-event calendar, most famously via Slush, alongside year-round communities in product, games, and AI, with Tampere, Oulu (5G, embedded), and Turku running their own scenes.",
  HU: "Budapest runs the majority of Hungary's tech events, with particularly strong software engineering, data, and games communities, complemented by smaller scenes in Debrecen and Szeged.",
  RO: "Romanian tech events are split across Bucharest (the largest calendar, broad coverage) and Cluj-Napoca, which has a disproportionately strong software-engineering community. Timișoara and Iași host growing scenes alongside.",
  RS: "Belgrade leads Serbia's tech-event calendar, with Novi Sad close behind. Together they sustain active software engineering, games, and AI communities.",
  LU: "Luxembourg's tech events lean on its position as a European fintech and data-protection hub, plus the outsized EU institutional presence in the city.",
  GR: "Athens and Thessaloniki run Greece's tech-event calendar, with a fast-growing software engineering and startup scene in both cities.",
  BG: "Sofia anchors Bulgaria's tech-event calendar, with Plovdiv and Varna hosting smaller but active communities. The country is particularly strong on software engineering and outsourcing-adjacent events.",
  HR: "Zagreb leads Croatia's tech events, with a growing games and product scene, complemented by Rijeka and Split.",
  EE: "Estonia's tech-event calendar is remarkable for its size given the country's population. Tallinn runs dense calendars across software, digital-government, product, and startups, with Tartu hosting a smaller but active community.",
  LV: "Riga leads Latvia's tech-event calendar across software engineering, product, and the growing startup scene.",
  LT: "Vilnius and Kaunas anchor Lithuania's tech events, with strong communities in software engineering, fintech, and games.",
  SK: "Bratislava hosts most of Slovakia's tech events, complemented by Košice's growing software-engineering scene.",
  SI: "Ljubljana leads Slovenia's tech-event calendar, with a particularly strong reputation for startup and founder events.",
  MT: "Valletta and the surrounding area host Malta's tech events, historically concentrated around iGaming and more recently expanding into AI and fintech.",
};

// Fallback sentence for countries not in COUNTRY_SCENE. Kept
// generic-but-usable.
const DEFAULT_COUNTRY_SCENE =
  "Tech events across this country span the usual mix of meetups, conferences, hackathons, and community gatherings.";

export interface CountryLanding {
  pageTitle: string;
  metaDescription: string;
  intro: string;
}

export function countrySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCountryLanding(
  country: { code: string; name: string },
  topCities: string[],
): CountryLanding {
  const scene = COUNTRY_SCENE[country.code] ?? DEFAULT_COUNTRY_SCENE;
  const citiesClause =
    topCities.length > 0
      ? `Active cities on Brainberg right now include ${formatListWithConjunction(topCities)}.`
      : "";
  const closing =
    "Brainberg aggregates listings from multiple event platforms and community calendars into a single European feed, so the full schedule for the country shows up in one chronological view instead of spread across separate platforms.";
  return {
    pageTitle: `Tech Events in ${country.name}`,
    metaDescription: `Upcoming tech, AI, and startup events in ${country.name}. Conferences, meetups, hackathons, and workshops across every major city, aggregated in one place.`,
    intro: [scene, citiesClause, closing].filter(Boolean).join(" "),
  };
}

export interface CityLanding {
  pageTitle: string;
  metaDescription: string;
  intro: string;
}

// Handwritten intros for the cities that carry the bulk of the event
// volume and the most SEO value. Others fall back to the generic
// template below.
const CITY_LANDING_HANDWRITTEN: Record<string, CityLanding> = {
  berlin: {
    pageTitle: "Tech Events in Berlin",
    metaDescription:
      "Upcoming tech events in Berlin. AI, Rust, Go, data engineering, product, and startup meetups plus conferences like re:publica and beyond.",
    intro:
      "Berlin runs one of the densest tech-event calendars in Europe. The scene is distinctively community-driven: a large share of the city's meetups run in English, many of them out of independent spaces rather than corporate offices, and the rhythm is nightly rather than monthly. Rust, Go, Python, TypeScript, and the growing applied-AI community are all particularly strong, alongside deep traditions in hacker culture (the Chaos Computer Club's Berlin chapter), privacy, and open source.\n\nOn the conference side, the city hosts re:publica, Data Natives, AI Engineer Summit EU offshoots, a fleet of European KubeCon satellite events, and the annual Chaos Communication Congress in the winter. Startup and founder content runs in parallel across spaces like Factory, Betahaus, and the various accelerator-run venues, with Slush satellites and TechCrunch events passing through.",
  },
  london: {
    pageTitle: "Tech Events in London",
    metaDescription:
      "Upcoming tech events in London. AI, fintech, engineering leadership, product, and the deep meetup scene across the UK's largest tech hub.",
    intro:
      "London has one of the largest single-city tech-event calendars in the world. Every major engineering discipline sustains multiple monthly meetups here (AI-applied, ML research, backend, frontend, cloud, DevOps, security, data), and every major international conference has a London edition or satellite. Engineering leadership is unusually strong: LeadDev London is effectively a pilgrimage event, and CTO Craft, staff-engineer communities, and product-management meetups (Mind The Product) run year-round.\n\nFintech and AI dominate the conference calendar, matching where the city's tech capital concentrates. Community venues run across Shoreditch, King's Cross, and Southwark, with larger events filling the ExCeL and the QEII. Expect something worth attending most evenings of the week.",
  },
  paris: {
    pageTitle: "Tech Events in Paris",
    metaDescription:
      "Upcoming tech events in Paris. AI research, Web3 (EthCC), product, startups, and the deep French developer community.",
    intro:
      "Paris hosts one of Europe's most serious AI-research scenes. Mistral, Hugging Face, Kyutai, and a long list of labs cluster here, and the conference calendar reflects that with dense ML and applied-AI events. The city is also Europe's de facto Web3 capital thanks to EthCC each July, with a steady rhythm of Ethereum, ZK, and L2 community events in between.\n\nOn the broader software side, there's strong coverage of TypeScript, React, Python, DevOps, and product management, with VivaTech in June anchoring the startup-and-industry side of the calendar. Conferences are bilingual-friendly: a growing share of events run in English, though French-first events are still common and worth it for locals.",
  },
  amsterdam: {
    pageTitle: "Tech Events in Amsterdam",
    metaDescription:
      "Upcoming tech events in Amsterdam. Applied AI, product, data, engineering, and the deep meetup circuit across the Dutch tech scene.",
    intro:
      "Amsterdam runs one of the strongest applied-AI event calendars in Europe. The city is full of product engineering teams actually shipping AI features, which shows up as depth in LLM integration, agent, RAG, and evaluation-focused meetups. Product management and design events are also unusually strong here (The Next Web, Mind The Product, Config EU satellites), as is the data-engineering scene around dbt and Snowflake.\n\nThe calendar is almost entirely in English. Evening meetups run nightly in the city center and Noord; larger conferences fill the RAI. The Dutch scene is distinctively mixed between scaleups, remote-first teams, and EU-HQ offices, which gives the event content an unusually product- and engineering-leadership-heavy tilt compared to more research-focused European cities.",
  },
  dublin: {
    pageTitle: "Tech Events in Dublin",
    metaDescription:
      "Upcoming tech events in Dublin. Cloud, DevOps, data, AI, and the engineering meetups centered on Ireland's EMEA-HQ cluster.",
    intro:
      "Dublin's tech-event calendar reflects the city's role as EMEA HQ for most major US cloud, SaaS, and social-media companies. AWS, Azure, GCP, Salesforce, Meta, Google, Microsoft, Stripe, and HubSpot all run recurring developer events here, alongside an independent meetup scene covering Kubernetes, data engineering, AI-applied, product, and engineering leadership.\n\nConferences run year-round out of the RDS and the Convention Centre. Web Summit, despite moving primarily to Lisbon, still has Dublin connections, and the startup-ecosystem backbone is strong via organizations like NDRC and Dogpatch Labs. The calendar leans English-language and international.",
  },
  barcelona: {
    pageTitle: "Tech Events in Barcelona",
    metaDescription:
      "Upcoming tech events in Barcelona. Software engineering, product, mobile, and the Spanish developer-community hub.",
    intro:
      "Barcelona runs Spain's largest tech-event calendar. Software engineering meetups are particularly deep: Python, JavaScript, and the various mobile communities (iOS, Android, cross-platform) all sustain strong monthly rhythms. The product-management and design scenes are active alongside, partly fueled by the concentration of international scaleups and remote teams in the city.\n\nMobile World Congress is the headline annual event, bringing telecom, mobile, and increasingly AI-in-mobile content to the city each spring. Beyond MWC, Smart City Expo and a growing calendar of AI and data events fill out the conference side. The mix of Catalan, Spanish, and English makes the community event scene unusually diverse.",
  },
  lisbon: {
    pageTitle: "Tech Events in Lisbon",
    metaDescription:
      "Upcoming tech events in Lisbon. Web Summit, startups, AI, product, and the deep English-language meetup scene.",
    intro:
      "Lisbon's tech-event calendar has grown fast. Web Summit each November anchors the year and pulls an enormous international founder-and-investor crowd into the city. In between, there's a dense week-by-week rhythm of meetups covering AI-applied, software engineering, product, design, and the startup ecosystem that continues to expand with remote-first teams relocating here.\n\nThe scene is almost entirely English-language, which makes it unusually accessible for international visitors. Venues cluster around Santos, Marquês de Pombal, and the renovated LX Factory; larger events tend to be in the FIL and Altice Arena. Expect fewer deep-technical research tracks than Berlin or Paris, and more product-and-founder content.",
  },
  zurich: {
    pageTitle: "Tech Events in Zurich",
    metaDescription:
      "Upcoming tech events in Zurich. ML research (ETH), software engineering, data, and the Swiss developer community.",
    intro:
      "Zurich sustains one of the most research-dense tech-event calendars in Europe, anchored by ETH Zurich and the broader Swiss research ecosystem. ML-research, systems, and programming-languages communities are particularly strong. This is one of the places in Europe where compiler, distributed-systems, and cryptography research still has a community event presence in the form of guild nights, reading groups, and visiting-speaker series.\n\nBeyond the research corner, there's a solid calendar around data engineering, DevOps, and finance-and-insurance tech reflecting the city's industries. Google's Zurich office hosts a steady drumbeat of developer events, as do the local chapters of most major open-source communities.",
  },
  munich: {
    pageTitle: "Tech Events in Munich",
    metaDescription:
      "Upcoming tech events in Munich. Embedded, mobility, software engineering, and the Bavarian tech community.",
    intro:
      "Munich's tech-event calendar is shaped by the city's industries: automotive, aerospace, and engineering-heavy enterprise. Embedded, robotics, and mobility events are unusually strong here, as are engineering leadership and enterprise-architecture communities. BMW, Siemens, Airbus, and their extended supplier ecosystems keep the hardware-and-systems side of the calendar busy.\n\nOn the software side, there's a solid rhythm of Python, Go, Java, and cloud meetups, and the city has been growing a reputation on AI-applied events via both Munich-based startups and the TU München ecosystem. TUM's research side adds a thin but real ML-research meetup layer. Oktoberfest season aside, evening meetups run year-round in the city center and around Munich Riem.",
  },
  copenhagen: {
    pageTitle: "Tech Events in Copenhagen",
    metaDescription:
      "Upcoming tech events in Copenhagen. UX Copenhagen, Design Matters, product, and the design-forward Danish tech scene.",
    intro:
      "Copenhagen is probably the most design-forward tech-event city in Europe. UX Copenhagen and Design Matters both anchor the global design conference calendar from here, and the local meetup scene reflects that with an unusually strong weight of product-design, UX-research, and design-systems content. Beyond design, the city has a healthy fintech scene and a growing green-tech event rhythm.\n\nThe software engineering side is anchored by a handful of active meetups (Kotlin, Python, functional programming) and a steady rhythm of product-management events. Venues cluster around the Carlsberg district, Nørrebro, and the canal-side offices near Indre By; larger conferences typically fill the Bella Center.",
  },
  stockholm: {
    pageTitle: "Tech Events in Stockholm",
    metaDescription:
      "Upcoming tech events in Stockholm. Product, fintech, games, and the deep Swedish developer community.",
    intro:
      "Stockholm has one of Europe's strongest product, fintech, and games-industry event calendars. The city's concentration of consumer-facing scaleups (Klarna, Spotify, iZettle, King, Mojang) shows up in unusually strong product-management, growth, and data-product event content. Events that in other cities would be engineering-focused tilt toward product experimentation and metric-driven design here.\n\nThe games scene is equally distinctive thanks to Stockholm's role as one of Europe's game-development capitals. Beyond that, there's a steady rhythm of software engineering, DevOps, and AI-applied meetups. English is the default working language for essentially all of the event scene.",
  },
  vienna: {
    pageTitle: "Tech Events in Vienna",
    metaDescription:
      "Upcoming tech events in Vienna. AI, software engineering, product, and the Austrian developer community.",
    intro:
      "Vienna sustains an active tech-event calendar across AI, software engineering, product, and a growing startup ecosystem. The city benefits from TU Wien's research output and a mix of scaleups and established-enterprise tech teams, giving the calendar a balanced tilt between applied research and engineering-practitioner content.\n\nExpect steady monthly cadences for Python, JavaScript, cloud, and data communities, plus a growing set of applied-AI meetups. The WeAreDevelopers World Congress is the largest annual anchor event. Venues cluster around the city center and the Technische Universität, with larger events filling the Messe Wien.",
  },
  brussels: {
    pageTitle: "Tech Events in Brussels",
    metaDescription:
      "Upcoming tech events in Brussels. FOSDEM, tech policy, AI governance, and the EU-centered tech community.",
    intro:
      "Brussels is unusually weighted toward tech-policy and open-source events because of the EU institutions concentrated in the city. FOSDEM each February is one of the largest open-source conferences in the world and draws tens of thousands. Around it, the calendar is full of AI-governance, data-protection, cybersecurity-policy, and platform-regulation events that reflect Brussels' role as the policy capital of European tech.\n\nBeyond policy, there's a healthy community meetup scene across software engineering, DevOps, and data. Less dense than Paris or London, but with several very active monthly groups. English dominates the international events; local community events run across French, Dutch, and English.",
  },
  madrid: {
    pageTitle: "Tech Events in Madrid",
    metaDescription:
      "Upcoming tech events in Madrid. AI, fintech, software engineering, and the Spanish tech-startup scene.",
    intro:
      "Madrid runs the second of Spain's two main tech-event scenes. The calendar leans toward fintech, AI-applied, enterprise software, and the fast-growing startup ecosystem, with a steady rhythm of Python, JavaScript, and DevOps meetups. South Summit each spring anchors the startup side of the year.\n\nVenues cluster around Matadero Madrid, Google Campus Madrid, and the various office-based meetup hosts; larger events fill IFEMA. Events run largely in Spanish, though international meetups increasingly run in English or hybrid.",
  },
  prague: {
    pageTitle: "Tech Events in Prague",
    metaDescription:
      "Upcoming tech events in Prague. Software engineering, games, DevOps, and the Czech developer community.",
    intro:
      "Prague has a surprisingly deep software-engineering event calendar for its size, helped by a dense concentration of product-engineering teams (JetBrains, Avast, GoodData, and a long list of international offices) plus a strong Czech developer community. Games are a local specialty (the Czech games industry punches far above its weight), and game-dev meetups run throughout the year.\n\nBeyond that, there's a consistent rhythm of Python, JavaScript, DevOps, and data meetups. Events frequently run bilingual in Czech and English, with international and industry events defaulting to English.",
  },
};

const MIN_LANDING_EVENTS = 3;

export { MIN_LANDING_EVENTS };

export function cityLanding(
  citySlug: string,
  cityName: string,
  countryName: string,
): CityLanding {
  const handwritten = CITY_LANDING_HANDWRITTEN[citySlug];
  if (handwritten) return handwritten;
  return buildGenericCityLanding(cityName, countryName);
}

function buildGenericCityLanding(cityName: string, countryName: string): CityLanding {
  return {
    pageTitle: `Tech Events in ${cityName}`,
    metaDescription: `Upcoming tech events in ${cityName}, ${countryName}.`,
    // Minimal and honest: a single sentence that's true whether the city
    // hosts one event a year or dozens a week. Handwritten intros in
    // CITY_LANDING_HANDWRITTEN cover the scenes worth saying more about;
    // other cities get this stub.
    intro: `Upcoming tech events in ${cityName}, ${countryName}.`,
  };
}

export function formatListWithConjunction(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
