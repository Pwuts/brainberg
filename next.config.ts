import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // LAN dev access (e.g. phone hitting the dev server). Configure per-machine
  // via NEXT_DEV_ORIGINS in .env.local — comma-separated host list.
  allowedDevOrigins:
    process.env.NEXT_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.lumacdn.com" },
      { protocol: "https", hostname: "img.evbuc.com" },
      { protocol: "https", hostname: "secure.meetupstatic.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
