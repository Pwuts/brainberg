import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import slugify from "slugify";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { resolveLocation } from "@/lib/scraper/city-resolver";
import { resolveCategory, resolveEventType } from "@/lib/scraper/category-map";
import { moderateEvent } from "@/lib/scraper/ai-moderate";
import type { NormalizedEvent } from "@/lib/scraper/types";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const submitSchema = z
  .object({
    title: z.string().min(3).max(300),
    description: z.string().min(10).max(10000),
    websiteUrl: z.string().url(),
    startsAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
    endsAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
    timezone: z.string().default("Europe/London"),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    cityName: z.string().optional(),
    countryCode: z.string().length(2).optional(),
    isOnline: z.boolean().default(false),
    organizerName: z.string().max(300).optional(),
    organizerEmail: z.string().email().optional(),
    turnstileToken: z.string().optional(),
  })
  .refine((d) => d.isOnline || (d.cityName && d.countryCode), {
    message: "Location is required for in-person events",
    path: ["cityName"],
  });

function makeSlug(title: string, date: Date, suffix?: string): string {
  const dateStr = date.toISOString().slice(0, 10);
  const parts = [title, dateStr];
  if (suffix) parts.push(suffix);
  return slugify(parts.join(" "), { lower: true, strict: true }).slice(0, 350);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rl = rateLimit(`submit:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } },
    );
  }

  let body: z.infer<typeof submitSchema>;
  try {
    body = submitSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const captcha = await verifyTurnstile(body.turnstileToken, ip);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 400 },
    );
  }

  try {
    const startsAt = new Date(body.startsAt);
    const endsAt = body.endsAt ? new Date(body.endsAt) : undefined;

    const location = body.cityName && body.countryCode
      ? await resolveLocation(body.cityName, body.countryCode)
      : { cityId: null, countryId: null, latitude: null, longitude: null };

    // Auto-categorize from title
    const category = resolveCategory(undefined, {}, body.title);
    const eventType = resolveEventType(body.title) ?? "other";

    // AI moderation (if available)
    let status: "approved" | "pending" = "pending"; // Community submissions default to pending
    let moderatedByAI = false;
    let aiModerationReason: string | null = null;

    const normalized: NormalizedEvent = {
      title: body.title,
      description: body.description,
      category,
      eventType,
      source: "community",
      sourceId: `submit-${Date.now()}`,
      startsAt,
      timezone: body.timezone,
      isOnline: body.isOnline,
      websiteUrl: body.websiteUrl,
      cityName: body.cityName,
      countryCode: body.countryCode,
    };

    const moderation = await moderateEvent(normalized);
    if (moderation) {
      moderatedByAI = true;
      aiModerationReason = moderation.reason;
      if (moderation.decision === "approve" && moderation.confidence > 0.8) {
        status = "approved";
      }
      // Use AI category/type if it overrides
      if (moderation.category) normalized.category = moderation.category;
      if (moderation.eventType) normalized.eventType = moderation.eventType;
    }

    const slug = makeSlug(body.title, startsAt, body.cityName);

    const [inserted] = await db
      .insert(events)
      .values({
        title: body.title,
        slug,
        description: body.description,
        shortDescription: body.description.slice(0, 500),
        category: normalized.category,
        eventType: normalized.eventType,
        startsAt,
        endsAt,
        timezone: body.timezone,
        isMultiDay: !!(endsAt && endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1000),
        cityId: location.cityId,
        countryId: location.countryId,
        venueName: body.venueName,
        venueAddress: body.venueAddress,
        latitude: body.latitude ?? location.latitude,
        longitude: body.longitude ?? location.longitude,
        isOnline: body.isOnline,
        websiteUrl: body.websiteUrl,
        organizerName: body.organizerName,
        organizerEmail: body.organizerEmail,
        source: "community",
        sourceId: `submit-${Date.now()}`,
        status,
        moderatedByAI,
        aiModerationReason,
      })
      .returning({ id: events.id, slug: events.slug });

    return NextResponse.json({
      success: true,
      id: inserted.id,
      slug: inserted.slug,
      status,
    });
  } catch (err) {
    console.error("[submit] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit event" },
      { status: 500 },
    );
  }
}
