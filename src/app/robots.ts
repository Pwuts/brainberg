import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /events?… filter permutations produce a near-infinite crawl
        // surface that dilutes budget. Dedicated landing pages (P1) are
        // the canonical ranking targets for filtered views.
        disallow: ["/admin", "/api", "/events?*"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
