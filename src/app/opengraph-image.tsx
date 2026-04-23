import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Brainberg — AI & Tech Events Across Europe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const [totalResult] = await db
    .select({ count: count() })
    .from(events)
    .where(
      and(
        eq(events.status, "approved"),
        // Include currently running multi-day events.
        sql`COALESCE(${events.endsAt}, ${events.startsAt}) >= now()`,
      ),
    );

  const total = totalResult?.count ?? 0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1a1030 0%, #0f0a1e 50%, #1a0a2e 100%)",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(139, 92, 246, 0.15)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -60,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "rgba(79, 70, 229, 0.12)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 100,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "rgba(236, 72, 153, 0.08)",
          display: "flex",
        }}
      />

      {/* Zap icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 72,
          height: 72,
          borderRadius: 16,
          background: "rgba(139, 92, 246, 0.25)",
          marginBottom: 24,
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: "white",
          lineHeight: 1.1,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span>Brainberg</span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: "#a78bfa",
          marginTop: 12,
          display: "flex",
        }}
      >
        AI & Tech Events Across Europe
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 48,
          marginTop: 40,
          fontSize: 20,
          color: "rgba(255,255,255,0.7)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "white" }}>
            {total}+
          </span>
          <span>upcoming events</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "white" }}>40+</span>
          <span>countries</span>
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          fontSize: 18,
          color: "rgba(255,255,255,0.4)",
          display: "flex",
        }}
      >
        brainberg.eu
      </div>
    </div>,
    { ...size },
  );
}
