import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_LABELS: Record<string, string> = {
  ai_ml_research: "AI/ML Research & Engineering",
  ai_powered_dev: "AI-Powered Development",
  software_dev: "Software Engineering",
  data_analytics: "Data & Analytics",
  cloud_devops: "Cloud & DevOps",
  security: "Security",
  design_ux: "Design & UX",
  blockchain_web3: "Web3 & Blockchain",
  entrepreneurship: "Entrepreneurship",
  hacker_maker: "Hacker / Maker",
  other: "Other",
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  ai_ml_research: "Building models, training, MLOps, research papers, frameworks like PyTorch & Hugging Face",
  ai_powered_dev: "Using AI to build things — AI agents, Copilot, vibe coding, integrating LLM APIs",
  software_dev: "Languages, frameworks, architecture, testing — the craft of building software",
  data_analytics: "Data engineering, BI, databases, pipelines, analytics platforms",
  cloud_devops: "Infrastructure, Kubernetes, AWS/Azure/GCP, platform engineering, SRE",
  security: "Cybersecurity, privacy, AppSec, pentesting, threat modeling",
  design_ux: "User experience, accessibility, design systems, usability",
  blockchain_web3: "Blockchain, DeFi, smart contracts, decentralization",
  entrepreneurship: "Startups, product management, leadership, fundraising, growth",
  hacker_maker: "Hacker camps, hackerspaces, maker faires, DIY hardware, community congresses",
  other: "Events that don't fit other categories",
};

export const CATEGORY_COLORS: Record<string, string> = {
  ai_ml_research: "bg-purple-100 text-purple-800",
  ai_powered_dev: "bg-violet-100 text-violet-800",
  software_dev: "bg-slate-100 text-slate-800",
  data_analytics: "bg-green-100 text-green-800",
  cloud_devops: "bg-cyan-100 text-cyan-800",
  security: "bg-red-100 text-red-800",
  design_ux: "bg-pink-100 text-pink-800",
  blockchain_web3: "bg-orange-100 text-orange-800",
  entrepreneurship: "bg-indigo-100 text-indigo-800",
  hacker_maker: "bg-lime-100 text-lime-800",
  other: "bg-gray-100 text-gray-800",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: "Conference",
  meetup: "Meetup",
  hackathon: "Hackathon",
  workshop: "Workshop",
  webinar: "Webinar",
  networking: "Networking",
  demo_day: "Demo Day",
  panel: "Panel",
  career_fair: "Career Fair",
  other: "Other",
};

export const SIZE_LABELS: Record<string, string> = {
  small: "< 50",
  medium: "50–200",
  large: "200–1000",
  major: "1000+",
};

export const SOURCE_LABELS: Record<string, string> = {
  manual: "Hardcoded",
  community: "Community",
  luma: "Luma",
  eventbrite: "Eventbrite",
  meetup: "Meetup",
  confs_tech: "confs.tech",
  dev_events: "dev.events",
  other: "Other",
};

// Country flag emoji from ISO code
export function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function formatEventDate(
  startsAt: Date,
  endsAt: Date | null,
  timezone: string
): string {
  const start = new Date(startsAt);
  const dateStr = start.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timezone,
  });
  const timeStr = start.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  if (endsAt) {
    const end = new Date(endsAt);
    const endTimeStr = end.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
    return `${dateStr} · ${timeStr} – ${endTimeStr}`;
  }

  return `${dateStr} · ${timeStr}`;
}
