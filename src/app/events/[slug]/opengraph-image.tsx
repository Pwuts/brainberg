import { ImageResponse } from "next/og";
import { getEventBySlug } from "@/lib/events";
import { countryFlag, formatEventDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Brainberg event";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Fallback OG image for events that don't carry their own imageUrl. When the
 * event page's openGraph.images is set (because event.imageUrl was present),
 * Next.js prefers that and this file-convention image is not used.
 */
export default async function EventOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getEventBySlug(slug);

  // Render a minimal card even if the event disappeared — the URL shouldn't
  // 404 in a social preview cache.
  const title = result?.event.title ?? "Brainberg";
  const date = result
    ? formatEventDate(
        result.event.startsAt,
        result.event.endsAt,
        result.event.timezone,
      )
    : "";
  const locationLabel = result
    ? result.event.isOnline
      ? "Online"
      : [result.city?.name, result.country ? countryFlag(result.country.code) : null]
          .filter(Boolean)
          .join(" ")
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #1a1030 0%, #0f0a1e 50%, #1a0a2e 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles — match the root OG look */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(139, 92, 246, 0.15)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: "rgba(79, 70, 229, 0.12)",
            display: "flex",
          }}
        />

        {/* Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#a78bfa",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: -0.5,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(139, 92, 246, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
            </svg>
          </div>
          <span style={{ color: "white" }}>Brainberg</span>
        </div>

        {/* Event title — clamped to 3 lines via webkit line-clamp */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "white",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
              color: "white",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              gap: 32,
              fontSize: 28,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {date ? <span>{date}</span> : null}
            {locationLabel ? (
              <span style={{ color: "#a78bfa" }}>· {locationLabel}</span>
            ) : null}
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(255,255,255,0.45)",
            fontSize: 20,
          }}
        >
          <span>brainberg.eu</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
