import type { EventCategory, EventType } from "./types";

// ============================================================
// Title keyword regexes — applied as overrides
// ============================================================

/** AI/ML research & engineering: building models, training, MLOps */
export const AI_RESEARCH_REGEX =
  /\b(machine.learning|deep.learning|neural.net|NLP|computer.vision|MLOps|MLcon|PyTorch|HuggingFace|training.model|fine.?tun|pre.?train|reinforcement.learning|diffusion.model|transformer|Knowledge.Graph|Embedded.AI|Quantum.AI)\b/i;

/** AI-powered development: using AI to build things, integrating AI */
export const AI_DEV_REGEX =
  /\b(AI|artificial.intelligence|Intelligence.Artificielle|Intelligenza.Artificiale|Inteligencia.Artificial|Kunstig.Intelligens|Yapay.Zeka|LLM|GPT|generative.ai|gen.?ai|Agentic|Copilot|vibe.?cod|AI.agent|Claude|ChatGPT|DeepSeek|Mistral|KI\b|n8n.*AI|MCP|Lovable)\b|\bIA\b/i;

export const DATA_KEYWORD_REGEX =
  /\b(data.science|big.data|analytics|data.engineering|data.platform|data.pipeline|PyData|data2day|Buzzwords|Databricks|Snowflake|Power.?BI|Fabric.User.Group|Data.Community|Data.Meetup|Data.Mesh|dbt|PGConf|Airflow)\b/i;

export const HACKER_MAKER_REGEX =
  /\b(CCC|chaos.communication|chaos.congress|hackerspace|hacker.?night|hacker.?camp|maker.?faire|eth0|emf|electromagnetic.field|gpn|gulasch|sha2|mch|why2|fosdem|hackmeeting|fab.?lab|hakierspejs|repair.caf|OpenLab|electronics.workshop)\b/i;

export const WEB3_KEYWORD_REGEX =
  /\b(web3|blockchain|ethereum|solidity|defi|decentralized|crypto|NFT|smart.contract|DAO)\b/i;

export const DEVOPS_KEYWORD_REGEX =
  /\b(devops|kubernetes|k8s|docker|GitOps|terraform|ansible|CI.?CD|SRE|cloud.native|observability|platform.engineering|CloudNativeCon|KubeCon|OpenTelemetry|AWS.User.Group|AWS.Community|AWS.Meetup|Azure.User.Group|Kafka|Data.Center|Cloud.Native)\b/i;

export const SECURITY_KEYWORD_REGEX =
  /\b(security|cybersecurity|infosec|pentest|CTF|OWASP|appsec|threat|vulnerability|SOC|CONFidence|BSides|Red.Team|SecTalks|Zero.Day|Cyber.Expo|Cyber.Fresque|NIS.2|Ciberseguridad|Segurança.da.Informação|hacking)\b/i;

export const UX_KEYWORD_REGEX =
  /\b(UX|user.experience|design.system|usability|accessibility|a11y|uxcon|SmashingConf|UXDX|WCAG)\b/i;

export const ENTREPRENEURSHIP_REGEX =
  /\b(startup|founder|fundrais|pitch|ProductTank|product.market.fit|venture|accelerator|incubator|CTO.Craft|LeadDev|Product.Management|Engineering.Leadership|Demo.Day|Investor|FinTech)\b/i;

/** Title patterns that indicate non-tech events. Used across all scrapers. */
export const NON_TECH_REGEX =
  /\b(party|DJ\b|clubbing|rave|techno music|cocktail|wine tasting|yoga|pilates|meditation|salon|ceramics|pottery|cooking class|baking|fermentation|welding|tai chi|walking tour|karaoke|chess club|poker night|running club|film festival|fashion show|album launch|live music|board games|woodworking|cosplay|menstrual|knitting|gardening|stock market|router table|sound system|audio.*fundamentals|movie night)\b/i;

export const HARDWARE_IOT_REGEX =
  /\b(robotics|robotica|robot\b|IoT|Internet.of.Things|Arduino|ESP32|Raspberry.Pi|embedded.system|3D.print|3D.design|Stampa.3D|CAD|electronics|circuit|sensor|drone|DJI|hardware|microcontroller|SmartHome|battery)\b/i;

export const GAME_DEV_REGEX =
  /\b(game.dev|gamedev|game.development|game.design|indie.game|playtest|game.jam|Unity|Unreal.Engine|Godot|video.?game|videogame|videogioc|jeu.?vid[eé]o|juego|HTML5.game|game.makers|game.summit|games.co.?op)\b/i;

export const POLICY_ETHICS_REGEX =
  /\b(AI.governance|AI.safety|AI.ethic|AI.policy|AI.act|responsible.AI|digital.ethic|tech.ethic|AI.regulation|tech.regulation|AI.compliance|NIS.?2|GDPR|data.protection|policy.practice|governance.risk|tech.policy|digital.rights|algorithmic.accountability)\b/i;

export const LEADERSHIP_PRODUCT_REGEX =
  /\b(CTO.?Craft|LeadDev|engineering.leader|engineering.leadership|tech.lead|principal.dev|platform.engineering.leader|product.management|product.manager|product.owner|ProductTank|product.tank|product.crew|product.mixer|scrum|agile|lean.coffee|team.coach|agile.coach|scrum.master|product.discovery|product.strategy)\b/i;

export const BIO_HEALTH_REGEX =
  /\b(biotech|bio.tech|healthtech|health.tech|medtech|med.tech|digital.health|e.?health|life.science|bioinformatic|genomic|clinical.trial|medical.device|pharma|longevity|digital.medicine|health.?innovation|biohacking|neurotech)\b/i;

// ============================================================
// confs.tech — filename → category
// ============================================================

export const CONFSTECH_CATEGORY_MAP: Record<string, EventCategory> = {
  android: "software_dev",
  css: "design_ux",
  data: "software_dev", // Too broad — title keywords handle AI/data/etc
  devops: "cloud_devops",
  dotnet: "software_dev",
  elixir: "software_dev",
  general: "software_dev",
  golang: "software_dev",
  graphql: "software_dev",
  ios: "software_dev",
  java: "software_dev",
  javascript: "software_dev",
  kotlin: "software_dev",
  leadership: "entrepreneurship",
  networking: "entrepreneurship", // "Community / Networking" on confs.tech
  php: "software_dev",
  product: "entrepreneurship",
  python: "software_dev",
  ruby: "software_dev",
  rust: "software_dev",
  scala: "software_dev",
  security: "security",
  "tech-comm": "software_dev",
  typescript: "software_dev",
  ux: "design_ux",
};

// ============================================================
// dev.events — RSS <category> → category
// ============================================================

export const DEVEVENTS_CATEGORY_MAP: Record<string, EventCategory> = {
  "Artificial Intelligence (AI)": "ai_applied",
  "Machine Learning": "ai_ml_research",
  "Deep Learning": "ai_ml_research",
  Cloud: "cloud_devops",
  DevOps: "cloud_devops",
  "Docker / Kubernetes": "cloud_devops",
  Serverless: "cloud_devops",
  Microservices: "cloud_devops",
  Blockchain: "blockchain_web3",
  Cybersecurity: "security",
  "Data Science": "data_analytics",
  "Big Data / Analytics": "data_analytics",
  "UX / Design": "design_ux",
  FinTech: "entrepreneurship",
  HealthTech: "entrepreneurship",
  Robotics: "software_dev",
  IoT: "software_dev",
  Startup: "entrepreneurship",
  "Open Source": "software_dev",
  Community: "software_dev",
};

export const DEVEVENTS_TYPE_MAP: Record<string, EventType> = {
  conference: "conference",
  meetup: "meetup",
  hackathon: "hackathon",
  workshop: "workshop",
  webinar: "webinar",
};

// ============================================================
// Meetup — topic urlkey → category
// ============================================================

export const MEETUP_TOPIC_MAP: Record<string, EventCategory> = {
  "artificial-intelligence": "ai_applied",
  "machine-learning": "ai_ml_research",
  "deep-learning": "ai_ml_research",
  "natural-language-processing": "ai_ml_research",
  "computer-vision": "ai_ml_research",
  "data-science": "data_analytics",
  "data-analytics": "data_analytics",
  "big-data": "data_analytics",
  blockchain: "blockchain_web3",
  web3: "blockchain_web3",
  ethereum: "blockchain_web3",
  "cloud-computing": "cloud_devops",
  devops: "cloud_devops",
  kubernetes: "cloud_devops",
  "amazon-web-services": "cloud_devops",
  docker: "cloud_devops",
  cybersecurity: "security",
  "information-security": "security",
  "ux-design": "design_ux",
  "user-experience": "design_ux",
  fintech: "entrepreneurship",
  "health-tech": "entrepreneurship",
  robotics: "hardware_iot",
  "internet-of-things": "hardware_iot",
  startup: "entrepreneurship",
  entrepreneurship: "entrepreneurship",
  maker: "hacker_maker",
  hackerspace: "hacker_maker",
  "open-source": "software_dev",
  "software-development": "software_dev",
  "web-development": "software_dev",
  javascript: "software_dev",
  python: "software_dev",
  golang: "software_dev",
  rust: "software_dev",
};

// ============================================================
// Eventbrite — category_id → category
// ============================================================

export const EVENTBRITE_CATEGORY_MAP: Record<string, EventCategory> = {
  "101": "software_dev",
  "102": "software_dev",
};

// ============================================================
// Category resolution with title-based overrides
// ============================================================

/** Check title against all keyword regexes. Returns a category override or null.
 *  Order matters: more specific categories take priority.
 *  AI research regex is checked before AI dev regex so research-specific
 *  terms (MLOps, PyTorch, training) win over generic "AI" matches.
 *  Policy/ethics is checked before AI so "AI Governance" → policy_ethics,
 *  not ai_applied. */
function titleOverride(title: string): EventCategory | null {
  if (HACKER_MAKER_REGEX.test(title)) return "hacker_maker";
  if (POLICY_ETHICS_REGEX.test(title)) return "policy_ethics";
  if (AI_RESEARCH_REGEX.test(title)) return "ai_ml_research";
  if (AI_DEV_REGEX.test(title)) return "ai_applied";
  if (GAME_DEV_REGEX.test(title)) return "game_dev";
  if (WEB3_KEYWORD_REGEX.test(title)) return "blockchain_web3";
  if (SECURITY_KEYWORD_REGEX.test(title)) return "security";
  if (DEVOPS_KEYWORD_REGEX.test(title)) return "cloud_devops";
  if (DATA_KEYWORD_REGEX.test(title)) return "data_analytics";
  if (UX_KEYWORD_REGEX.test(title)) return "design_ux";
  if (BIO_HEALTH_REGEX.test(title)) return "bio_health";
  if (HARDWARE_IOT_REGEX.test(title)) return "hardware_iot";
  if (LEADERSHIP_PRODUCT_REGEX.test(title)) return "leadership_product";
  if (ENTREPRENEURSHIP_REGEX.test(title)) return "entrepreneurship";
  return null;
}

/** Resolve category from a lookup map + title keywords. */
export function resolveCategory(
  lookupKey: string | undefined,
  lookupMap: Record<string, EventCategory>,
  title: string,
): EventCategory {
  const override = titleOverride(title);
  if (override) return override;

  if (lookupKey && lookupMap[lookupKey]) return lookupMap[lookupKey];

  return "software_dev";
}

/** Resolve category from an array of tags/topics (first match wins). */
export function resolveCategoryFromTags(
  tags: string[],
  lookupMap: Record<string, EventCategory>,
  title: string,
): EventCategory {
  const override = titleOverride(title);
  if (override) return override;

  for (const tag of tags) {
    if (lookupMap[tag]) return lookupMap[tag];
  }

  return "software_dev";
}

// ============================================================
// Event type resolution from title
// ============================================================

/** Infer event type from title keywords. Returns null if no match. */
export function resolveEventType(title: string): EventType | null {
  if (/\b(ISTQB|certification.(course|training|exam)|training.course|academy.(class|training)|Odoo.Academy|Foundation.Exam)\b/i.test(title)) return "training";
  if (/\b(workshop|bootcamp|masterclass|hands.on|lab.day|coding.gym|dojo)\b/i.test(title)) return "workshop";
  if (/\b(hackathon|hack.day|hack.night|CodeRetreat)\b/i.test(title)) return "hackathon";
  if (/\b(coworking|co.?working|cowork|code.and.coffee|coding.and.coffee|coding.&.coffee)\b/i.test(title)) return "coworking";
  if (/\b(webinar|online.event)\b/i.test(title)) return "webinar";
  if (/\b(networking|social|mixer|stammtisch|afterwork|drinks|breakfast|coffee|apéro|brunch|beer|club)\b/i.test(title)) return "networking";
  if (/\b(conference|summit|congress|forum|expo|symposium|convention)\b/i.test(title)) return "conference";
  return null;
}
