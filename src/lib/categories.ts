import type { eventCategoryEnum } from "@/lib/db/schema";

export type EventCategory = (typeof eventCategoryEnum.enumValues)[number];

export interface CategoryLanding {
  /** URL slug. Human-friendly hyphenated form of the enum value. */
  slug: string;
  /** H1 on the landing page, optimized for "{X} events in Europe" queries. */
  pageTitle: string;
  /**
   * Compact label used on combined landing pages (e.g. "Applied AI" in
   * "Applied AI Events in Berlin") and in breadcrumbs. 1–3 words when
   * possible.
   */
  comboLabel: string;
  /** <meta name="description">. Kept under 160 chars. */
  metaDescription: string;
  /** Intro copy rendered above the event grid. 200–400 words, specific, non-generic. */
  intro: string;
}

// Skip `other`. It's a grab-bag with no coherent audience, so a landing
// page risks being thin content.
export const CATEGORY_LANDING: Record<
  Exclude<EventCategory, "other">,
  CategoryLanding
> = {
  ai_ml_research: {
    slug: "ai-ml-research",
    pageTitle: "AI & ML Research Events in Europe",
    comboLabel: "AI & ML Research",
    metaDescription:
      "AI and ML research events across Europe: deep-learning meetups, computer vision, NLP, quantum AI, and research-oriented conferences.",
    intro:
      "Europe's AI and ML research scene is a long tail of university labs, community research groups, and practitioner-run meetups that together punch well above their weight globally. This page covers the research end of the AI/ML event calendar: deep-learning meetups, computer vision and NLP groups, paper-reading clubs, and research-oriented conferences. It's aimed at ML engineers, applied researchers, and PhD students who care about how the models work, rather than how to integrate them into a product (that's the Applied AI category).\n\nAnchor events include the MLcon series (Berlin, Munich, Amsterdam, London), PyData conferences, and regional deep-learning meetups like the Vienna Deep Learning Meetup. Quantum AI and quantum-computing events sit here too, since the European quantum community is research-heavy and overlaps meaningfully with the ML research crowd. Topics cover training and serving frameworks, fine-tuning technique, evaluation, quantization, model architectures, and the infrastructure that makes experimentation tractable.\n\nBrainberg aggregates these into a single chronological European view. For the deluge of \"how to ship a feature with an LLM\" events, see the Applied AI category instead.",
  },
  ai_applied: {
    slug: "applying-ai",
    pageTitle: "AI Integration & Applied AI Events in Europe",
    comboLabel: "Applying AI",
    metaDescription:
      "AI and LLM application and integration events in Europe. Agents, Copilot, RAG, production AI, and the meetups where engineers actually ship it.",
    intro:
      '"AI research" and "AI in production" are two pretty different worlds at this point. This page collects events from the production side: how teams integrate LLMs into real products, build agents that are worth trusting, wire up RAG pipelines that don\'t quietly hallucinate, and ship Copilot-style features without breaking the rest of the app. Agentic coding is a particularly active thread right now, with dedicated meetups and studios popping up across the continent.\n\nTopics on these agendas skew concrete: prompt engineering as discipline (not as vibe), tool use and function calling, evaluation harnesses, cost and latency tradeoffs between frontier models, structured outputs, guardrails, multimodal inputs, AI-assisted development, and the operational muscle needed to keep an AI product running overnight. Expect talks from product engineering teams at Dutch and German scaleups, Parisian AI studios, London consultancies, and the widening pool of "AI engineer" meetups now running in most major European cities.\n\nThis is also where vendor ecosystems meet practitioners. Anthropic, OpenAI, and Mistral community events land here, as do LangChain, LlamaIndex, GitHub Copilot Dev Days, Microsoft Fabric AI sessions, AWS User Group AI workshops, and generic agent-framework meetups. A large share of the scene runs in local languages: French "IA" events, German "KI" meetups, Italian "IA" workshops, so don\'t filter by language unless you mean to. If your job involves shipping a feature that uses a model rather than training one, this is the category to subscribe to. Brainberg pulls these into a single European-wide feed so nothing disappears into a local community app.',
  },
  software_dev: {
    slug: "software-engineering",
    pageTitle: "Software Engineering Events in Europe",
    comboLabel: "Software Engineering",
    metaDescription:
      "Programming language, framework, and architecture events across Europe. Python, Rust, Go, TypeScript, React, backend systems, and the craft of building software.",
    intro:
      'This is the widest category on Brainberg, because software engineering itself spans a huge range of events: language user groups (Python, Rust, Go, TypeScript, Kotlin, Elixir, Ruby, Zig), framework communities (React, Svelte, Next.js, Vue, Laravel, Django, NixOS), backend architecture tracks, testing and QA tracks (ISTQB certification courses, mutation testing, test-automation workshops), refactoring and DDD circles, hackathons, and the long tail of "thoughtful engineering" meetups that don\'t fit neatly under any specific stack.\n\nThe community layer is broader than just language meetups. Women-in-Tech groups are active in most major cities (IT Women Talks, SheTech, Women in Tech Glasgow, REAL TALK and more), CoderDojo chapters run youth coding sessions across Europe, and the after-work/tech-social rhythm (Afterwork Drinks, Tech Mixers, Code Review evenings) fills out the week between structured meetups. GOTO Copenhagen, International JavaScript Conference Munich, Code BEAM Stockholm, Heapcon Belgrade, and Devoxx anchor the conference side.\n\nEvery major European tech city runs a weekly rotation of these. Berlin\'s Rust and Go scenes are deep; Amsterdam and London have strong functional programming communities; Paris runs some of the best TypeScript and full-stack events on the continent; the Nordic cities punch above their weight on language design and systems programming. Dublin, Barcelona, Lisbon, Zurich, and Munich each sustain multiple active user groups. Because "software engineering" is so broad, this page is most useful when you combine it with a location filter. Brainberg aggregates all of this, so the full schedule for a given city shows up in one view instead of scattered across separate platforms.',
  },
  data_analytics: {
    slug: "data-analytics",
    pageTitle: "Data & Analytics Events in Europe",
    comboLabel: "Data & Analytics",
    metaDescription:
      "Data engineering, analytics, and BI events across Europe. dbt, Snowflake, Databricks, data pipelines, warehousing, and the communities around them.",
    intro:
      'The modern data stack has a vocal European community. This page collects events for the engineers, analysts, and analytics engineers doing the work: Databricks and Snowflake user groups, Microsoft Fabric and Power BI community meetups (a particularly active series across the continent), dbt meetups, Airflow and dagster practitioner events, PyData conferences, data-engineering guild nights, PostgreSQL and PGConf events, and the growing list of "we ship a data product" meetups at scaleups across the continent.\n\nSubjects trend practical: cost control on cloud warehouses, incremental models, lineage and testing, moving from batch to streaming (Kafka, Flink, ClickHouse), data contracts, semantic layers, lakehouse architectures, and the politics of data teams inside larger engineering orgs. BI and product-analytics events sit here too: Power BI community groups, Tableau, Hex, Amplitude, PostHog, Mixpanel communities, plus web-analytics gatherings like MeasureCamp. Anchor conferences include Big Data Minds, Data Innovation Summit, Business Intelligence Summit, data2day, and Berlin Buzzwords.\n\nBerlin and Amsterdam are probably the densest hubs in Europe for this category, with Berlin leaning toward data engineering and Amsterdam toward analytics engineering. London, Dublin, Paris, Stockholm, Copenhagen, and the Baltics all sustain active groups as well. Brainberg consolidates these into a single feed, so you don\'t have to chase ten community mailing lists to find the next evening meetup in your city.',
  },
  cloud_devops: {
    slug: "cloud-devops",
    pageTitle: "Cloud & DevOps Events in Europe",
    comboLabel: "Cloud & DevOps",
    metaDescription:
      "Kubernetes, AWS, Azure, GCP, platform engineering, and SRE events across Europe, from evening meetups to KubeCon and DevOpsDays.",
    intro:
      "Cloud infrastructure and operations events in Europe split between the big annual anchors (KubeCon + CloudNativeCon EU, DevOpsDays in a dozen cities, AWS re:Invent viewing parties, HashiConf) and the monthly community rhythm of Kubernetes user groups, Cloud Native meetups, and platform-engineering guild nights. This page tracks both.\n\nExpect deep-dives on Kubernetes operators, multi-cluster patterns, GitOps (Argo, Flux), service meshes (Istio, Linkerd, Cilium), observability stacks (Prometheus, Grafana, OpenTelemetry), incident management and SRE practice, FinOps, and the platform-engineering conversation that has absorbed a big chunk of what used to be called DevOps. Cloud-provider-specific user groups for AWS, Azure, and GCP are listed here too, alongside the regional HashiCorp and SUSE communities.\n\nThe geography follows where the cloud providers have European presence. Dublin, Amsterdam, Frankfurt, Paris, London, and the Nordic capitals are the hubs, but there are active Kubernetes communities in almost every tech city on the continent. Brainberg pulls these listings together, so you can see a unified European schedule without visiting four separate platforms.",
  },
  security: {
    slug: "security",
    pageTitle: "Cybersecurity & InfoSec Events in Europe",
    comboLabel: "Cybersecurity",
    metaDescription:
      "European cybersecurity conferences, BSides, AppSec, and infosec meetups. Local OWASP chapters and BSides events across the continent.",
    intro:
      "European infosec has its own character: community-run, less vendor-dominated than its US counterpart, and unusually healthy at the meetup layer. This page tracks the conferences, BSides events, OWASP chapter meetings, AppSec sessions, red-team/blue-team meetups, and capture-the-flag gatherings that make up that scene.\n\nAt the large end, you'll find Black Hat EU, Hack.lu, Hack in Paris, NorthSec, CONFidence (Kraków), No Hat (Italy), FOSDEM's security track, and the BSides family that covers cities across the continent (Porto, Budapest, Kraków, Luxembourg, Prague, and beyond). At the community end, OWASP chapter meetups run in every significant tech city, alongside HackTheBox community meetups, Cyber Fresque awareness events, and active local groups for cloud security, cryptography, and reverse engineering. The Chaos Computer Club congresses and related hacker-culture events live in the adjacent Hacker & Maker category rather than here, since the audience and tone are distinct.\n\nTopics span the real breadth of the field: web and mobile AppSec, cloud security (the Kubernetes and AWS attack surfaces in particular), threat modeling, incident response, malware analysis, red teaming, hardware hacking, privacy and cryptography, plus the policy/regulatory tracks that have grown around NIS2, the Cyber Resilience Act, and related European frameworks. Brainberg aggregates these into one feed, so the full European schedule lives in a single view.",
  },
  design_ux: {
    slug: "design-ux",
    pageTitle: "Design & UX Events in Europe",
    comboLabel: "Design & UX",
    metaDescription:
      "User experience, product design, and design-systems events across Europe. UX Copenhagen, Config, Design Matters, and the meetup circuit behind them.",
    intro:
      "Design events in Europe cluster around a few well-known anchors (UX Copenhagen, Config EU, Design Matters Copenhagen/Warsaw, UX London, UXLx Lisbon, uxcon Vienna, UXDX EMEA, Awwwards Conferences, Beyond Tellerrand, Pixel Pioneers, Hatch, Milan Design & UX Week), surrounded by a dense local meetup scene for product designers, UX researchers, design-systems practitioners, and the accessibility community. This page tracks both.\n\nCoverage includes product and interaction design, UX research and usability testing, design systems (Figma variables, tokens, component governance), service design and behavioral design, accessibility (WCAG, inclusive design, screen-reader testing), content design, and the design-engineering hybrid role that has grown into its own community. The AI-meets-design crossover is particularly active right now: Figma AI jams, human-centered AI-design talks, and sessions on what AI tools change about the practice show up regularly on the calendar. You'll also find design-ops and team-leadership tracks for people running design practices, plus typography and brand-design events for folks whose work sits closer to that side of the discipline.\n\nGeographically, Copenhagen, Amsterdam, Berlin, London, Stockholm, and Helsinki sustain the densest monthly meetup rhythm. Vienna, Warsaw, Brno, Barcelona, and Lisbon have fast-growing scenes, and the larger annual conferences rotate between these cities. Brainberg aggregates listings into a single chronological European view, so designers can see what's upcoming without subscribing to a dozen local lists.",
  },
  blockchain_web3: {
    slug: "blockchain-web3",
    pageTitle: "Web3 & Blockchain Events in Europe",
    comboLabel: "Web3 & Blockchain",
    metaDescription:
      "Ethereum, DeFi, smart-contract, and Web3 events across Europe. EthCC, Devconnect, and the community meetups that orbit them.",
    intro:
      "Europe's blockchain and Web3 event calendar is a mix of Bitcoin-first meetups, general blockchain communities, and the big-tent conferences that pull both crowds together. This page aggregates all of it: Bitcoin-only gatherings in cities like Lille, Belgrade, and Mallorca; broader blockchain meetups across Italy, Austria, and Germany; local Solana and DeFi builder events; and larger conferences like European Blockchain Convention, Amsterdam Blockchain Week, and Vienna Blockchain Week.\n\nThe flavor varies a lot by city. Ethereum events (EthCC in Paris, ETHBerlin, ETHPrague, Devconnect satellites) draw the protocol and ZK-research crowd, while the Bitcoin-focused calendar leans toward a different community with more sound-money and open-source framing. Enterprise-blockchain content (certifications, corporate-networking evenings) fills out the middle. NFT, DAO tooling, and smart-contract-dev meetups show up throughout, often under broader \"blockchain meetup\" umbrellas rather than as dedicated series.\n\nIf you're doing protocol work, building on an L1 or L2, running a local community, or just looking for a Bitcoin pub meet, this is the feed. Brainberg pulls these together so the scattered Web3 event calendar shows up in one European view instead of split across a dozen platforms.",
  },
  entrepreneurship: {
    slug: "entrepreneurship",
    pageTitle: "Startup & Entrepreneurship Events in Europe",
    comboLabel: "Startup",
    metaDescription:
      "Startup conferences, founder meetups, pitch nights, and product events across Europe. Slush, Web Summit, TNW, and the community circuit behind them.",
    intro:
      "Startup events in Europe span everything from the headline conferences (Slush in Helsinki, Web Summit in Lisbon, The Next Web in Amsterdam, VivaTech in Paris, Bits & Pretzels in Munich, Wolves Summit, Latitude59) down to the weekly rhythm of pitch nights, founder coffee mornings, investor AMAs, and product-management meetups that every significant tech city sustains.\n\nCoverage is broad on purpose: early-stage founder events (first-hire, MVP, fundraising fundamentals), growth-stage content (Series-A-and-beyond ops, people and finance), product-management meetups (Mind The Product, ProductTank), sales and GTM events, and the VC-adjacent content that brings founders and investors into the same room. Accelerators and studios like Antler, EF, Seedcamp, and Hacker House run their own recurring event series in their host cities, and those are aggregated here too.\n\nGeographically, the scene is led by London, Berlin, Paris, Amsterdam, Stockholm, Lisbon, and Helsinki, with fast-growing founder communities in Warsaw, Barcelona, Dublin, Zurich, Copenhagen, and the Baltics. Brainberg pulls these listings into a single European schedule, so founders don't have to stitch together a picture from a dozen local ecosystems.",
  },
  hardware_iot: {
    slug: "hardware-iot",
    pageTitle: "Hardware, Robotics & IoT Events in Europe",
    comboLabel: "Hardware & IoT",
    metaDescription:
      "Hardware, robotics, embedded, and IoT events in Europe. Embedded World, robotics meetups, Arduino/ESP32 nights, and the maker-adjacent hardware scene.",
    intro:
      'Hardware, robotics, and IoT events in Europe run a wider range than most categories, from evening workshops where beginners solder their first ESP32 weather station to week-long industrial trade shows. On one end sit the big anchor conferences: Embedded World in Nuremberg (probably the largest event of its kind in the world), Hannovermesse, Battery Tech Expo, Quantum Industry Day, IoT Tech Expo. On the other end sit the community workshops: 3D printing for beginners, laser-cutter training, drone filming workshops, Raspberry Pi and Arduino club nights, microbial fuel cell experiments, and the long tail of fab-lab and makerspace sessions that introduce new people to the tools.\n\nTopics include firmware development (Rust on embedded, Zephyr, FreeRTOS), hardware design and prototyping (KiCad, EDA tools), robotics (ROS user groups, hobbyist and industrial robotics, drones), 3D printing and CNC communities, the RISC-V ecosystem, sensor networks and LPWAN (LoRa, NB-IoT), industrial IoT, broadcast and video-over-IP engineering (SMPTE ST-2110), energy and battery tech, and the growing "physical AI" conversation that bridges robotics with ML. Kids-focused robotics series also run regularly in Italy and elsewhere.\n\nBerlin, Munich, Zurich, Delft, Eindhoven, Grenoble, and the Nordic capitals are strong hubs, but the community-workshop layer spreads much further. Ireland, Italy, Austria, and Belgium all run active calendars. Brainberg aggregates this broad range, so you can see the full European schedule, from evening Arduino sessions to week-long industrial trade shows.',
  },
  hacker_maker: {
    slug: "hacker-maker-community",
    pageTitle: "Hacker Camps & Maker Events in Europe",
    comboLabel: "Hacker & Maker",
    metaDescription:
      "European hacker camps, maker faires, and community congresses: CCC, MCH, SHA, CCCamp, EMF, and the wider hackerspace scene.",
    intro:
      "This is the culture-heavy corner of the European tech event calendar: hackerspaces, community congresses, outdoor hacker camps, and the maker-faire circuit. It traces a lineage back to the Chaos Computer Club and has grown into one of Europe's most distinctive community-event traditions. Equivalents exist elsewhere in the world, but few are as long-running or as well-attended as the European ones.\n\nAnchor events include the CCC's annual Chaos Communication Congress and its outdoor counterpart Chaos Communication Camp, the regional CCC-family gatherings (GPN / Gulaschprogrammiernacht, FSCK, and friends), BornHack (Denmark), Electromagnetic Field / EMF Camp (UK), Fri3d Camp (Belgium), and past/future editions of May Contain Hackers (Netherlands) and Still Hacking Anyway. Around them runs the continent-wide circuit of hackerspace open days, maker faires, fab-lab workshops, repair cafés, and community digital-freedom events.\n\nContent spans hardware hacking and reverse engineering, privacy and digital-rights activism, retrocomputing, art-and-code projects, lockpicking and physical security, amateur radio, embedded development, 3D printing, biohacking, and the unusually wide political and ethical conversation these communities sustain around technology. If \"hacker\" to you means curiosity and community rather than cybercrime, this is the scene. Brainberg keeps a hand-curated roster of the major camps and aggregates hackerspace events from across the continent, so the full European view shows up in one place.",
  },
  game_dev: {
    slug: "game-dev",
    pageTitle: "Game Development Events in Europe",
    comboLabel: "Game Development",
    metaDescription:
      "Game development conferences, jams, and meetups in Europe. Gamescom, Devcom, Reboot Develop, Nordic Game, and the local indie and studio scene.",
    intro:
      "European game development splits between two rhythms: the big annual anchor conferences (Gamescom and Devcom in Cologne, Reboot Develop in Dubrovnik, Nordic Game in Malmö, Develop:Brighton, Game Access in Brno, Game Connection Paris, FÍS Games Summit in Ireland, Slovenia Games Meetup) and the month-by-month community rhythm of engine-specific meetups (Godot Stammtisch, Unreal Engine sessions), GameDev meetups, playtest nights, game jams, and studio open evenings in the cities with working industries behind them.\n\nContent covers the full stack of game development: engines (Unity, Unreal, Godot, Bevy), graphics programming, audio and sound design, narrative and writing, game design practice, ML inference for games, monetization and publishing, live-ops, and the business side of running studios. Indie and small-team content dominates the community meetup scene; the larger conferences bring in AAA studios and platform holders.\n\nThe industry is dense in the Nordics (Stockholm, Copenhagen, Malmö, Helsinki), the UK (Brighton, London, Guildford, Edinburgh/Dundee), Poland (Warsaw, Kraków), Germany (Berlin, Cologne, Hamburg, Bayreuth, Karlsruhe), and France (Paris, Lyon, Montpellier), with growing scenes in the Baltics, Slovenia, and southern Europe. Brainberg aggregates game-dev events into a single schedule, so developers can track their local scene plus the continental-scale events in one view.",
  },
  policy_ethics: {
    slug: "policy-ethics",
    pageTitle: "Tech Policy, Ethics & AI Governance Events in Europe",
    comboLabel: "Tech Policy & Ethics",
    metaDescription:
      "Tech policy, AI governance, digital ethics, and regulation events in Europe. AI Act, NIS2, DSA/DMA, and the policy and research community around them.",
    intro:
      "European tech-policy and ethics events have grown into their own circuit, driven largely by the AI conversation and by the continent's unusually active relationship with tech regulation. This page covers the bigger conversations about technology rather than the hands-on building: AI governance, AI ethics, responsible-AI leadership, digital ethics, tech-in-society discussions, and the intersection of AI with education, law, and public institutions.\n\nMost current events are AI-flavored: AI in education, AI and public-sector decision-making, AI ethics reading groups, book-club-style evenings, and university-hosted symposia. Formal regulatory briefings around the AI Act, NIS2, DSA/DMA, and related European frameworks show up when they happen, alongside broader digital-rights conferences like RightsCon and MozFest, but they're the minority here rather than the center of gravity.\n\nExpect events across Ireland, Germany, Italy, France, the Nordics, and the Low Countries, often hosted by universities, research institutes, think tanks, or civil-society organizations. Brainberg aggregates this scene so the fragmented policy-and-ethics landscape shows up in one feed rather than scattered across institutional mailing lists.",
  },
  leadership_product: {
    slug: "leadership-product-management",
    pageTitle: "Engineering Leadership & Product Events in Europe",
    comboLabel: "Engineering Leadership",
    metaDescription:
      "Engineering leadership, CTO, and product-management events across Europe. LeadDev, CTO Craft, Mind The Product, and the meetup circuit for managers.",
    intro:
      "Events for engineering managers, CTOs, product leaders, and the people running technical teams sit in their own category. There's enough specific content for senior-plus practitioners that putting it under \"software engineering\" would bury it. This page tracks conferences and meetups aimed at the people leading the work rather than doing it directly.\n\nAnchor conferences: LeadDev London and LeadDev Berlin, CTO Craft Con, Mind The Product's European events, ProductTank chapters, EMCon, Refactor, and the Agile/Scrum community's mixed calendar of large conferences and local meetups. On the product side, the cross-over with entrepreneurship events is real; a lot of product-management content also appears under that category when it's founder-focused rather than manager-focused.\n\nTopics include engineering-team scaling, hiring and org design, performance and review frameworks, eng-productivity measurement, platform-team patterns, engineering-strategy setting, the CTO/VPE role transition, technical-fellow/staff-engineer tracks, and the long-running conversation about how product and engineering should collaborate. Brainberg aggregates these across the continent, so eng-leadership events for every major European city show up in one schedule.",
  },
  bio_health: {
    slug: "bio-health-tech",
    pageTitle: "Bio & Health Tech Events in Europe",
    comboLabel: "Bio & Health Tech",
    metaDescription:
      "Biotech, healthtech, digital health, and bioinformatics events across Europe. HLTH Europe, Health 2.0, and the research and startup communities around them.",
    intro:
      "European bio and health tech events cover a wide stack. At one end sits deep biotech research and bioinformatics meetups; at the other, medical-device and digital-health conferences plus the healthtech-startup and investor events that have grown around cities with strong hospital-research ecosystems. This page tracks the technical and practitioner-oriented end of that calendar.\n\nAnchor events include HLTH Europe and the AI-in-healthcare conferences (AI & Cancer, AI in Health and Care), med-tech summits like Medtech Innovation and MaxPotent Pharma, healthtech-founder gatherings such as Biotech & Friends and MedTech Startups networking, plus digital-health summer schools and longevity-focused days. On the community side, bioinformatics meetups, ML-for-biology reading groups, and techbio innovator evenings run regularly in cities with teaching hospitals and biotech clusters.\n\nIreland and the UK carry an outsized share of the current calendar, alongside strong activity in Switzerland (Basel, Zurich), the Netherlands (Amsterdam), Germany (Munich), and the Nordics. Brainberg aggregates this sector so the health and bio events are surfaced alongside the rest of the European tech schedule instead of hiding in sector-specific listings.",
  },
};

export const ALL_CATEGORY_LANDINGS = Object.entries(CATEGORY_LANDING) as Array<
  [Exclude<EventCategory, "other">, CategoryLanding]
>;

const SLUG_TO_CATEGORY: Record<
  string,
  Exclude<EventCategory, "other">
> = Object.fromEntries(
  ALL_CATEGORY_LANDINGS.map(([enumValue, meta]) => [meta.slug, enumValue]),
);

export function categoryFromSlug(slug: string): Exclude<EventCategory, "other"> | null {
  return SLUG_TO_CATEGORY[slug] ?? null;
}

export function categoryToSlug(category: EventCategory): string | null {
  if (category === "other") return null;
  return CATEGORY_LANDING[category].slug;
}
