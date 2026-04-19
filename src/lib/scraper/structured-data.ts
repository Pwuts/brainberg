import { parse, HTMLElement } from "node-html-parser";

/**
 * Shared structured-data extractors for Schema.org Event content.
 *
 * Two formats are supported:
 * - JSON-LD (regex-based — no DOM needed)
 * - Microdata (DOM walk via node-html-parser)
 *
 * Both produce the same shape (`ExtractedEvent`) so downstream scrapers
 * can normalize them uniformly.
 */

export interface ExtractedEvent {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string;
  identifier?: string;
  eventAttendanceMode?: string;
  venueName?: string;
  venueAddress?: string;
  cityName?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  organizerName?: string;
  organizerUrl?: string;
  price?: number | string;
  currency?: string;
  /** Raw parsed object (for debugging / future field access). */
  raw: Record<string, unknown>;
}

// ============================================================
// JSON-LD
// ============================================================

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject { [k: string]: JsonValue }

/** Matches any Schema.org *Event @type (Event, EducationEvent, etc). */
function defaultTypeFilter(type: string): boolean {
  return type.endsWith("Event");
}

/** Extract all JSON-LD Event objects from an HTML page. */
export function extractJsonLdEvents(
  html: string,
  typeFilter: (type: string) => boolean = defaultTypeFilter,
): ExtractedEvent[] {
  const out: ExtractedEvent[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    let data: JsonValue;
    try {
      data = JSON.parse(match[1]) as JsonValue;
    } catch {
      continue;
    }
    for (const item of flattenJsonLd(data)) {
      const type = item["@type"];
      if (typeof type === "string" && typeFilter(type)) {
        out.push(jsonLdToExtracted(item));
      }
    }
  }
  return out;
}

/** Flatten nested @graph / arrays so we can walk every item at one level. */
function flattenJsonLd(data: JsonValue): JsonObject[] {
  const out: JsonObject[] = [];
  const stack: JsonValue[] = [data];
  while (stack.length) {
    const v = stack.pop();
    if (Array.isArray(v)) {
      stack.push(...v);
    } else if (v && typeof v === "object") {
      out.push(v);
      const graph = (v as JsonObject)["@graph"];
      if (graph) stack.push(graph);
    }
  }
  return out;
}

function str(v: JsonValue | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function num(v: JsonValue | undefined): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function jsonLdToExtracted(item: JsonObject): ExtractedEvent {
  const location = item.location;
  const locObj = (Array.isArray(location) ? location[0] : location) as JsonObject | undefined;
  const address = locObj?.address as JsonObject | undefined;
  const geo = locObj?.geo as JsonObject | undefined;
  const organizer = item.organizer as JsonObject | undefined;
  const offers = (Array.isArray(item.offers) ? item.offers[0] : item.offers) as JsonObject | undefined;
  const image = item.image;
  const imageUrl = typeof image === "string"
    ? image
    : Array.isArray(image)
      ? (typeof image[0] === "string" ? image[0] : undefined)
      : (image && typeof image === "object" ? str((image as JsonObject).url) : undefined);

  return {
    name: str(item.name),
    description: str(item.description),
    startDate: str(item.startDate),
    endDate: str(item.endDate),
    url: str(item.url),
    image: imageUrl,
    identifier: str(item.identifier),
    eventAttendanceMode: str(item.eventAttendanceMode),
    venueName: str(locObj?.name),
    venueAddress: str(address?.streetAddress),
    cityName: str(address?.addressLocality),
    countryCode: str(address?.addressCountry),
    latitude: num(geo?.latitude),
    longitude: num(geo?.longitude),
    organizerName: str(organizer?.name),
    organizerUrl: str(organizer?.url),
    price: (typeof offers?.price === "number" || typeof offers?.price === "string") ? offers.price : undefined,
    currency: str(offers?.priceCurrency),
    raw: item,
  };
}

// ============================================================
// Microdata
// ============================================================

/**
 * Extract all Schema.org Microdata Event blocks from an HTML page.
 *
 * Walks `[itemscope][itemtype]` elements whose itemtype contains the given
 * substring (defaults to any `Event`), collects nested `[itemprop]` values
 * respecting `[itemscope]` boundaries.
 */
export function extractMicrodataEvents(
  html: string,
  itemtypeSubstr: string = "Event",
): ExtractedEvent[] {
  const root = parse(html);
  const out: ExtractedEvent[] = [];
  for (const el of root.querySelectorAll("[itemscope][itemtype]")) {
    const itemtype = el.getAttribute("itemtype") ?? "";
    if (!itemtype.includes(itemtypeSubstr)) continue;
    const props = collectItemprops(el);
    out.push(microdataToExtracted(props));
  }
  return out;
}

/** Collect itemprop values into a plain object, recursing into nested itemscope children. */
function collectItemprops(root: HTMLElement): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  walk(root, props, true);
  return props;

  function walk(node: HTMLElement, target: Record<string, unknown>, isRoot: boolean) {
    for (const child of node.childNodes) {
      // childNodes includes text nodes; node-html-parser exposes HTMLElement for element nodes
      if (!(child instanceof HTMLElement)) continue;
      const propName = child.getAttribute?.("itemprop");
      const hasScope = child.hasAttribute?.("itemscope");

      if (propName) {
        if (hasScope) {
          // Nested scope — collect its itemprops into a sub-object
          const nested: Record<string, unknown> = {};
          walk(child, nested, false);
          assignProp(target, propName, nested);
        } else {
          assignProp(target, propName, readPropValue(child));
          // Don't descend — itemprop values are terminal for non-scoped elements
        }
        continue;
      }
      if (hasScope && !isRoot) {
        // A nested scope without itemprop — ignore
        continue;
      }
      // Plain container: keep walking
      walk(child, target, false);
    }
  }

  function assignProp(target: Record<string, unknown>, key: string, value: unknown) {
    if (target[key] === undefined) {
      target[key] = value;
    } else if (Array.isArray(target[key])) {
      (target[key] as unknown[]).push(value);
    } else {
      target[key] = [target[key], value];
    }
  }

  function readPropValue(el: HTMLElement): string {
    // Priority: content > datetime > href (for <a>/<link>) > src (for <img>) > textContent
    const content = el.getAttribute("content");
    if (content) return content;
    const datetime = el.getAttribute("datetime");
    if (datetime) return datetime;
    const tag = el.tagName?.toLowerCase();
    if (tag === "a" || tag === "link") {
      const href = el.getAttribute("href");
      if (href) return href;
    }
    if (tag === "img") {
      const src = el.getAttribute("src");
      if (src) return src;
    }
    return (el.textContent ?? "").trim();
  }
}

function microdataToExtracted(p: Record<string, unknown>): ExtractedEvent {
  const location = firstOf(p.location) as Record<string, unknown> | undefined;
  const address = firstOf(location?.address) as Record<string, unknown> | undefined;
  const geo = firstOf(location?.geo) as Record<string, unknown> | undefined;
  const organizer = firstOf(p.organizer) as Record<string, unknown> | undefined;
  const offers = firstOf(p.offers) as Record<string, unknown> | undefined;

  const imageVal = firstOf(p.image);
  const image = typeof imageVal === "string"
    ? imageVal
    : typeof imageVal === "object" && imageVal !== null
      ? (imageVal as Record<string, unknown>).url as string | undefined
      : undefined;

  const parsePrice = (v: unknown): number | string | undefined => {
    if (typeof v === "number" || typeof v === "string") return v;
    return undefined;
  };
  const parseNum = (v: unknown): number | undefined => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    }
    return undefined;
  };

  return {
    name: stringVal(p.name),
    description: stringVal(p.description),
    startDate: stringVal(p.startDate),
    endDate: stringVal(p.endDate),
    url: stringVal(p.url),
    image,
    identifier: stringVal(p.identifier),
    eventAttendanceMode: stringVal(p.eventAttendanceMode),
    venueName: stringVal(location?.name),
    venueAddress: stringVal(address?.streetAddress),
    cityName: stringVal(address?.addressLocality),
    countryCode: stringVal(address?.addressCountry),
    latitude: parseNum(geo?.latitude),
    longitude: parseNum(geo?.longitude),
    organizerName: stringVal(organizer?.name),
    organizerUrl: stringVal(organizer?.url),
    price: parsePrice(offers?.price),
    currency: stringVal(offers?.priceCurrency),
    raw: p,
  };
}

function firstOf(v: unknown): unknown {
  return Array.isArray(v) ? v[0] : v;
}

function stringVal(v: unknown): string | undefined {
  const x = firstOf(v);
  return typeof x === "string" ? x : undefined;
}
