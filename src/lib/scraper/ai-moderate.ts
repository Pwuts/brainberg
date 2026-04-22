import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import type { NormalizedEvent } from "./types";
import { eventCategoryEnum, eventTypeEnum } from "@/lib/db/schema";

// ============================================================
// Types
// ============================================================

type EventCategory = (typeof eventCategoryEnum.enumValues)[number];
type EventType = (typeof eventTypeEnum.enumValues)[number];

export interface ModerationResult {
  decision: "approve" | "pending" | "reject";
  category: EventCategory | null;
  eventType: EventType | null;
  reason: string;
  confidence: number;
}

const CATEGORIES = eventCategoryEnum.enumValues;
const EVENT_TYPES = eventTypeEnum.enumValues;

const responseSchema = z.object({
  decision: z.enum(["approve", "pending", "reject"]),
  category: z.enum(CATEGORIES).nullable(),
  eventType: z.enum(EVENT_TYPES).nullable(),
  reason: z.string().transform((s) => s.slice(0, 500)),
  confidence: z.number().min(0).max(1),
});

// ============================================================
// Client & guide caching
// ============================================================

let client: Anthropic | null = null;
let cachedGuide: string | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function getModerationGuide(): string {
  if (!cachedGuide) {
    try {
      cachedGuide = readFileSync(
        join(process.cwd(), "MODERATING.md"),
        "utf-8",
      );
    } catch {
      // Fallback for Docker where MODERATING.md may not be at process.cwd()
      cachedGuide = "Use your best judgment to determine if this is a European tech event.";
    }
  }
  return cachedGuide;
}

// ============================================================
// System prompt (cached across scraper run via prompt caching)
// ============================================================

function buildSystemPrompt(): string {
  const guide = getModerationGuide();
  return `You are a content moderator for Brainberg.eu, a European tech event aggregator.

<moderating-guide>
${guide}
</moderating-guide>

Your task: evaluate a scraped event and decide whether it belongs on the platform, and verify its category and type.

Respond with a JSON object matching this exact schema:
{
  "reason": "<1-2 sentence explanation>",
  "decision": "approve" | "pending" | "reject",
  "category": "<valid category or null to keep current>",
  "eventType": "<valid type or null to keep current>",
  "confidence": <0.0 to 1.0>
}

Valid categories: ${CATEGORIES.join(", ")}
Valid event types: ${EVENT_TYPES.join(", ")}

Rules:
- If category and eventType from the scraper seem correct, set them to null (no override needed).
- Only override when you're confident the scraper got it wrong.
- "approve": clearly an event that fits the platform.
- "pending": probably fits but something is ambiguous — err on the side of pending over reject.
- "reject": clearly not a fit (not for our target audience, spam, pure marketing, non-European in-person event).
- Respond ONLY with the JSON object, no other text.`;
}

// ============================================================
// Event prompt
// ============================================================

function buildEventPrompt(event: NormalizedEvent): string {
  const parts = [
    `Title: ${event.title}`,
    `Current category: ${event.category}`,
    `Current type: ${event.eventType}`,
    `Source: ${event.source}`,
  ];

  if (event.tags?.length) {
    parts.push(`Tags: ${event.tags.join(", ")}`);
  }

  if (event.cityName || event.countryCode) {
    parts.push(`Location: ${[event.cityName, event.countryCode].filter(Boolean).join(", ")}${event.isOnline ? " (+ online)" : ""}`);
  } else if (event.isOnline) {
    parts.push("Location: Online");
  }

  if (event.venueName) {
    parts.push(`Venue: ${event.venueName}`);
  }
  if (event.venueAddress) {
    parts.push(`Venue address: ${event.venueAddress}`);
  }
  if (event.organizerName) {
    parts.push(`Organizer: ${event.organizerName}`);
  }

  if (event.description) {
    parts.push(`Description: ${event.description.slice(0, 800)}`);
  }

  return stripLoneSurrogates(parts.join("\n"));
}

const LONE_SURROGATE_RE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function stripLoneSurrogates(s: string): string {
  return s.replace(LONE_SURROGATE_RE, "\uFFFD");
}

// ============================================================
// Main moderation function
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Moderate an event using Claude Haiku.
 * Returns null if API key is not set or if the API call fails (graceful fallback).
 */
export async function moderateEvent(
  event: NormalizedEvent,
): Promise<ModerationResult | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildEventPrompt(event);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : null;

      if (!text) {
        console.warn(`[ai-moderate] Empty response for "${event.title}"`);
        return null;
      }

      // Parse JSON — handle potential markdown code blocks
      const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
      const parsed = JSON.parse(jsonStr);
      const result = responseSchema.parse(parsed);

      return result;
    } catch (err) {
      const isLastAttempt = attempt === 2;
      const isRateLimit = err instanceof Anthropic.RateLimitError;
      const log = isLastAttempt ? console.error : console.warn;

      log(
        `[ai-moderate] Failed for "${event.title}" (attempt ${attempt + 1}):`,
        err instanceof Error ? err.message : err,
      );

      if (isLastAttempt) return null;

      if (isRateLimit) {
        console.warn("[ai-moderate] Rate limited, retrying in 2s...");
        await sleep(2000);
      }
      // Non-rate-limit errors (bad JSON, schema violation, transient API
      // failure) — retry immediately. The model often emits a valid
      // response on the second try.
    }
  }

  return null;
}
