"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  EVENT_TYPE_LABELS,
  countryFlag,
  formatEventDate,
} from "@/lib/utils";
import type { MapEvent } from "@/lib/events";

// Fix Leaflet default marker icons (broken in bundlers)
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Category → marker color mapping
const MARKER_COLORS: Record<string, string> = {
  ai_ml_research: "#9333ea",  // purple
  ai_powered_dev: "#7c3aed",  // violet
  software_dev: "#475569",    // slate
  data_analytics: "#16a34a",  // green
  cloud_devops: "#0891b2",    // cyan
  security: "#dc2626",        // red
  design_ux: "#ec4899",       // pink
  blockchain_web3: "#ea580c", // orange
  entrepreneurship: "#4f46e5",// indigo
  hacker_maker: "#65a30d",    // lime
  other: "#6b7280",           // gray
};

// Size → scale factor for markers
const SIZE_SCALES: Record<string, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
  major: 1.45,
};

function createCategoryIcon(category: string, size: string | null): L.DivIcon {
  const color = MARKER_COLORS[category] ?? "#6b7280";
  const scale = SIZE_SCALES[size ?? ""] ?? 1;
  const w = Math.round(28 * scale);
  const h = Math.round(36 * scale);
  return L.divIcon({
    className: "",
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
    html: `<svg width="${w}" height="${h}" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`,
  });
}

function createClusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 36 : count < 100 ? 42 : 48;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: oklch(0.47 0.17 281);
      border: 3px solid white;
      border-radius: 50%;
      color: white;
      font-size: ${size < 42 ? 13 : 14}px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
  });
}

// Simple client-side clustering
function clusterMarkers(
  events: MapEvent[],
  map: L.Map
): { clusters: { lat: number; lng: number; events: MapEvent[] }[] } {
  const zoom = map.getZoom();
  const clusterRadius = Math.max(20, 80 - zoom * 5);
  const clusters: { lat: number; lng: number; events: MapEvent[] }[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    if (assigned.has(i)) continue;
    const ev = events[i];
    const point = map.latLngToContainerPoint([ev.latitude, ev.longitude]);
    const cluster: MapEvent[] = [ev];
    assigned.add(i);

    for (let j = i + 1; j < events.length; j++) {
      if (assigned.has(j)) continue;
      const other = events[j];
      const otherPoint = map.latLngToContainerPoint([
        other.latitude,
        other.longitude,
      ]);
      const dist = point.distanceTo(otherPoint);
      if (dist < clusterRadius) {
        cluster.push(other);
        assigned.add(j);
      }
    }

    const avgLat =
      cluster.reduce((s, e) => s + e.latitude, 0) / cluster.length;
    const avgLng =
      cluster.reduce((s, e) => s + e.longitude, 0) / cluster.length;
    clusters.push({ lat: avgLat, lng: avgLng, events: cluster });
  }

  return { clusters };
}

// Center of Europe
const DEFAULT_CENTER: [number, number] = [50.0, 10.0];
const DEFAULT_ZOOM = 5;

function MapEvents({
  onMoveEnd,
}: {
  onMoveEnd: () => void;
}) {
  useMapEvents({
    moveend: onMoveEnd,
    zoomend: onMoveEnd,
  });
  return null;
}

function FitBounds({ events }: { events: MapEvent[] }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (events.length > 0 && !hasFitted.current) {
      const bounds = L.latLngBounds(
        events.map((e) => [e.latitude, e.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      hasFitted.current = true;
    }
  }, [events, map]);

  return null;
}

export function EventMap({
  onVisibleEventsChange,
}: {
  onVisibleEventsChange?: (events: MapEvent[]) => void;
}) {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [clusters, setClusters] =
    useState<{ lat: number; lng: number; events: MapEvent[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const onVisibleRef = useRef(onVisibleEventsChange);
  onVisibleRef.current = onVisibleEventsChange;

  // Fetch events whenever filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    setLoading(true);
    fetch(`/api/events/map?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams]);

  // Recluster + compute visible events when map moves or events change
  const recluster = useCallback(() => {
    if (!mapRef.current || events.length === 0) {
      setClusters([]);
      onVisibleRef.current?.([]);
      return;
    }
    const { clusters } = clusterMarkers(events, mapRef.current);
    setClusters(clusters);

    // Filter to events within current viewport
    const bounds = mapRef.current.getBounds();
    const visible = events.filter((e) =>
      bounds.contains([e.latitude, e.longitude])
    );
    onVisibleRef.current?.(visible);
  }, [events]);

  useEffect(() => {
    recluster();
  }, [recluster]);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-1000 flex items-center justify-center bg-background/50">
          <div className="rounded-lg bg-background px-4 py-2 text-sm text-muted-foreground shadow-md">
            Loading events...
          </div>
        </div>
      )}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMoveEnd={recluster} />
        <FitBounds events={events} />

        {clusters.map((cluster, i) =>
          cluster.events.length === 1 ? (
            <SingleMarker key={cluster.events[0].id} event={cluster.events[0]} />
          ) : (
            <ClusterMarker
              key={`cluster-${i}`}
              lat={cluster.lat}
              lng={cluster.lng}
              events={cluster.events}
            />
          )
        )}
      </MapContainer>
      <div className="absolute bottom-4 left-4 z-1000 rounded-lg bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur-sm">
        {events.length} event{events.length !== 1 ? "s" : ""} on map
      </div>
    </div>
  );
}

function SingleMarker({ event }: { event: MapEvent }) {
  const icon = createCategoryIcon(event.category, event.size);
  const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category;
  const categoryColor =
    CATEGORY_COLORS[event.category] ?? "bg-gray-100 text-gray-800";
  const typeLabel = EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;

  return (
    <Marker position={[event.latitude, event.longitude]} icon={icon}>
      <Popup className="event-popup" maxWidth={280} minWidth={200}>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor}`}
            >
              {categoryLabel}
            </span>
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
              {typeLabel}
            </span>
            {event.isFree && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Free
              </span>
            )}
          </div>
          <a
            href={`/events/${event.slug}`}
            className="block text-sm font-semibold leading-tight text-foreground hover:text-primary"
          >
            {event.title}
          </a>
          <p className="text-xs text-muted-foreground">
            {formatEventDate(event.startsAt, event.endsAt, event.timezone)}
          </p>
          {(event.cityName || event.countryCode) && (
            <p className="text-xs text-muted-foreground">
              {event.cityName}
              {event.cityName && event.countryCode && ", "}
              {event.countryCode && (
                <>
                  {countryFlag(event.countryCode)} {event.countryName}
                </>
              )}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

function ClusterMarker({
  lat,
  lng,
  events,
}: {
  lat: number;
  lng: number;
  events: MapEvent[];
}) {
  const map = useMap();
  const icon = createClusterIcon(events.length);

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{
        click: () => {
          const bounds = L.latLngBounds(
            events.map((e) => [e.latitude, e.longitude])
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        },
      }}
    >
      <Popup maxWidth={280} minWidth={200}>
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {events.length} events in this area
          </p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {events.slice(0, 8).map((event) => (
              <a
                key={event.id}
                href={`/events/${event.slug}`}
                className="block rounded px-1 py-0.5 text-xs hover:bg-accent"
              >
                <span className="font-medium">{event.title}</span>
                <br />
                <span className="text-muted-foreground">
                  {formatEventDate(event.startsAt, event.endsAt, event.timezone)}
                </span>
              </a>
            ))}
            {events.length > 8 && (
              <p className="px-1 text-xs text-muted-foreground">
                +{events.length - 8} more — zoom in to see all
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
