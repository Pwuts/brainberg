import type { Metadata } from "next";

const SITE_NAME = "Brainberg";
const SITE_URL = "https://brainberg.eu";
const DEFAULT_DESCRIPTION =
  "Discover AI meetups, tech conferences, hackathons, and startup events across Europe.";

export interface BuildMetadataInput {
  /** Page-specific title. Already formatted (no "| Brainberg" suffix). */
  title: string;
  /** Falls back to the site default if omitted. */
  description?: string;
  /**
   * Absolute or root-relative image URL.
   * - `string` → use this exact image.
   * - omitted → fall back to the root `/opengraph-image`.
   * - `null` → don't set `images` at all, so the route's file-convention
   *   `opengraph-image.tsx` (if any) takes over.
   */
  image?: string | null;
  imageAlt?: string;
  /** Canonical path, e.g. "/events". Composes with SITE_URL. */
  path?: string;
  /** Open Graph type. Defaults to "website". */
  type?: "website" | "article";
  /** When true, Next.js will apply the title template "%s | Brainberg". */
  useTemplate?: boolean;
}

/**
 * Build a Next.js Metadata object where the document title, Open Graph
 * title/description, and Twitter card title/description stay in sync.
 *
 * Without this helper, setting only `metadata.title` on a page leaves
 * `openGraph.title` defaulting to the root layout's value — so the shared
 * preview ends up showing the site's generic title regardless of which page
 * someone linked.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    image,
    imageAlt,
    path,
    type = "website",
    useTemplate = true,
  } = input;

  const url = path ? `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}` : SITE_URL;

  // Resolve image fallback semantics:
  //   undefined → root OG image
  //   null      → omit `images` entirely so Next.js's route-segment
  //               opengraph-image.tsx (if any) takes over
  //   string    → explicit image
  const resolvedImage: string | null =
    image === undefined ? DEFAULT_OG_IMAGE : image;

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    title,
    description,
    url,
    siteName: SITE_NAME,
    type,
    locale: "en_US",
  };
  const twitter: NonNullable<Metadata["twitter"]> = {
    card: "summary_large_image",
    title,
    description,
  };
  if (resolvedImage) {
    openGraph.images = [{ url: resolvedImage, alt: imageAlt ?? title }];
    twitter.images = [resolvedImage];
  }

  return {
    title: useTemplate ? title : { absolute: title },
    description,
    alternates: path ? { canonical: url } : undefined,
    openGraph,
    twitter,
  };
}

/** Root OG image URL, resolved against metadataBase. */
export const DEFAULT_OG_IMAGE = "/opengraph-image";

/** Root metadata — exposed so layout.tsx and non-helper consumers can share constants. */
export const SITE_METADATA_BASE = new URL(SITE_URL);
export { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION };
