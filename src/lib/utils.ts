import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_LABELS: Record<string, string> = {
  ai_ml: "AI & ML",
  blockchain_web3: "Blockchain & Web3",
  devtools: "Developer Tools",
  cloud_infra: "Cloud & Infra",
  cybersecurity: "Cybersecurity",
  data_science: "Data Science",
  design_ux: "Design & UX",
  fintech: "FinTech",
  healthtech: "HealthTech",
  robotics: "Robotics",
  startup: "Startup",
  general_tech: "General Tech",
  other: "Other",
};

export const CATEGORY_COLORS: Record<string, string> = {
  ai_ml: "bg-purple-100 text-purple-800",
  blockchain_web3: "bg-orange-100 text-orange-800",
  devtools: "bg-blue-100 text-blue-800",
  cloud_infra: "bg-cyan-100 text-cyan-800",
  cybersecurity: "bg-red-100 text-red-800",
  data_science: "bg-green-100 text-green-800",
  design_ux: "bg-pink-100 text-pink-800",
  fintech: "bg-emerald-100 text-emerald-800",
  healthtech: "bg-teal-100 text-teal-800",
  robotics: "bg-amber-100 text-amber-800",
  startup: "bg-indigo-100 text-indigo-800",
  general_tech: "bg-slate-100 text-slate-800",
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
