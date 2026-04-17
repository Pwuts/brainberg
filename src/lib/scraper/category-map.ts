import type { EventCategory, EventType } from "./types";

// ============================================================
// AI keyword regex — applied as override on titles
// ============================================================

export const AI_KEYWORD_REGEX =
  /\b(AI|artificial.intelligence|machine.learning|deep.learning|neural.net|LLM|GPT|NLP|computer.vision|generative.ai|gen.?ai|transformer|diffusion.model|reinforcement.learning|MLOps|MLcon|Agentic|Copilot)\b/i;

export const DATA_KEYWORD_REGEX =
  /\b(data.science|big.data|analytics|data.engineering|data.platform|data.pipeline|PyData|data2day|Buzzwords|Databricks|Snowflake|Power.?BI|Fabric.User.Group|Data.Community|Data.Meetup|Data.Mesh)\b/i;

export const HACKER_MAKER_REGEX =
  /\b(CCC|chaos.communication|chaos.congress|hacker|hackerspace|maker.?faire|eth0|emf|electromagnetic.field|gpn|gulasch|sha2|mch|why2|fosdem|hackmeeting|fab.?lab|hakierspejs)\b/i;

export const WEB3_KEYWORD_REGEX =
  /\b(web3|blockchain|ethereum|solidity|defi|decentralized|crypto|NFT|smart.contract|DAO)\b/i;

export const DEVOPS_KEYWORD_REGEX =
  /\b(devops|kubernetes|k8s|docker|GitOps|terraform|ansible|CI.?CD|SRE|cloud.native|observability|platform.engineering|CloudNativeCon|KubeCon|OpenTelemetry|AWS.User.Group|AWS.Community|AWS.Meetup|Azure.User.Group|Kafka)\b/i;

export const SECURITY_KEYWORD_REGEX =
  /\b(security|cybersecurity|infosec|pentest|CTF|OWASP|appsec|threat|vulnerability|SOC|CONFidence|BSides|Red.Team|SecTalks)\b/i;

export const UX_KEYWORD_REGEX =
  /\b(UX|user.experience|design.system|usability|accessibility|a11y|uxcon|SmashingConf|UXDX)\b/i;

// ============================================================
// confs.tech — filename → category
// ============================================================

export const CONFSTECH_CATEGORY_MAP: Record<string, EventCategory> = {
  android: "general_tech",
  css: "design_ux",
  data: "general_tech", // Too broad — title keywords handle AI/data_science/etc
  devops: "cloud_infra",
  dotnet: "general_tech",
  elixir: "general_tech",
  general: "general_tech",
  golang: "general_tech",
  graphql: "devtools",
  ios: "general_tech",
  java: "general_tech",
  javascript: "general_tech",
  kotlin: "general_tech",
  leadership: "general_tech", // Engineering leadership, not startup
  networking: "general_tech",
  php: "general_tech",
  product: "startup",
  python: "general_tech",
  ruby: "general_tech",
  rust: "general_tech",
  scala: "general_tech",
  security: "cybersecurity",
  "tech-comm": "general_tech",
  typescript: "general_tech",
  ux: "design_ux",
};

// ============================================================
// dev.events — RSS <category> → category
// ============================================================

export const DEVEVENTS_CATEGORY_MAP: Record<string, EventCategory> = {
  "Artificial Intelligence (AI)": "ai_ml",
  "Machine Learning": "ai_ml",
  "Deep Learning": "ai_ml",
  Cloud: "cloud_infra",
  DevOps: "cloud_infra",
  "Docker / Kubernetes": "cloud_infra",
  Serverless: "cloud_infra",
  Microservices: "cloud_infra",
  Blockchain: "blockchain_web3",
  Cybersecurity: "cybersecurity",
  "Data Science": "data_science",
  "Big Data / Analytics": "data_science",
  "UX / Design": "design_ux",
  FinTech: "fintech",
  HealthTech: "healthtech",
  Robotics: "robotics",
  IoT: "robotics",
  Startup: "startup",
  "Open Source": "general_tech",
  Community: "general_tech",
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
  "artificial-intelligence": "ai_ml",
  "machine-learning": "ai_ml",
  "deep-learning": "ai_ml",
  "natural-language-processing": "ai_ml",
  "computer-vision": "ai_ml",
  "data-science": "data_science",
  "data-analytics": "data_science",
  "big-data": "data_science",
  blockchain: "blockchain_web3",
  web3: "blockchain_web3",
  ethereum: "blockchain_web3",
  "cloud-computing": "cloud_infra",
  devops: "cloud_infra",
  kubernetes: "cloud_infra",
  "amazon-web-services": "cloud_infra",
  docker: "cloud_infra",
  cybersecurity: "cybersecurity",
  "information-security": "cybersecurity",
  "ux-design": "design_ux",
  "user-experience": "design_ux",
  fintech: "fintech",
  "health-tech": "healthtech",
  robotics: "robotics",
  "internet-of-things": "robotics",
  startup: "startup",
  entrepreneurship: "startup",
  maker: "hacker_maker_community",
  hackerspace: "hacker_maker_community",
  "open-source": "general_tech",
  "software-development": "general_tech",
  "web-development": "general_tech",
  javascript: "general_tech",
  python: "general_tech",
  golang: "general_tech",
  rust: "general_tech",
};

// ============================================================
// Eventbrite — category_id → category
// ============================================================

export const EVENTBRITE_CATEGORY_MAP: Record<string, EventCategory> = {
  "101": "general_tech", // Science & Technology
  "102": "general_tech", // Science & Technology (alt)
};

// ============================================================
// Category resolution with title-based overrides
// ============================================================

/** Check title against all keyword regexes. Returns a category override or null.
 *  Order matters: more specific categories take priority. */
function titleOverride(title: string): EventCategory | null {
  if (HACKER_MAKER_REGEX.test(title)) return "hacker_maker_community";
  if (AI_KEYWORD_REGEX.test(title)) return "ai_ml";
  if (WEB3_KEYWORD_REGEX.test(title)) return "blockchain_web3";
  if (SECURITY_KEYWORD_REGEX.test(title)) return "cybersecurity";
  if (DEVOPS_KEYWORD_REGEX.test(title)) return "cloud_infra";
  if (DATA_KEYWORD_REGEX.test(title)) return "data_science";
  if (UX_KEYWORD_REGEX.test(title)) return "design_ux";
  return null;
}

/** Resolve category from a lookup map + title keywords. */
export function resolveCategory(
  lookupKey: string | undefined,
  lookupMap: Record<string, EventCategory>,
  title: string,
): EventCategory {
  // Title-based overrides take priority
  const override = titleOverride(title);
  if (override) return override;

  if (lookupKey && lookupMap[lookupKey]) return lookupMap[lookupKey];

  return "general_tech";
}

/** Resolve category from an array of tags/topics (first match wins). */
export function resolveCategoryFromTags(
  tags: string[],
  lookupMap: Record<string, EventCategory>,
  title: string,
): EventCategory {
  // Title-based overrides take priority
  const override = titleOverride(title);
  if (override) return override;

  for (const tag of tags) {
    if (lookupMap[tag]) return lookupMap[tag];
  }

  return "general_tech";
}
