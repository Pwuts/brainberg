"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapCity {
  id: number;
  name: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  approvedEventCount: number;
  totalEventCount: number;
}

const DEFAULT_CENTER: [number, number] = [50.0, 10.0];
const DEFAULT_ZOOM = 4;

function FitBounds({ cities }: { cities: MapCity[] }) {
  const map = useMap();
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (cities.length === 0) return;
    const key = cities
      .map((c) => c.id)
      .sort((a, b) => a - b)
      .join(",");
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    const bounds = L.latLngBounds(cities.map((c) => [c.latitude, c.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
  }, [cities, map]);

  return null;
}

function markerRadius(eventCount: number): number {
  if (eventCount >= 20) return 11;
  if (eventCount >= 5) return 9;
  if (eventCount >= 1) return 7;
  return 5;
}

function markerColor(eventCount: number): string {
  if (eventCount >= 20) return "#7c3aed";
  if (eventCount >= 5) return "#6366f1";
  if (eventCount >= 1) return "#64748b";
  return "#cbd5e1";
}

export default function CitiesMap({ cities }: { cities: MapCity[] }) {
  return (
    <div className="relative h-120 overflow-hidden rounded-lg border">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds cities={cities} />
        {cities.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.latitude, c.longitude]}
            radius={markerRadius(c.approvedEventCount)}
            pathOptions={{
              color: "white",
              weight: 1.5,
              fillColor: markerColor(c.approvedEventCount),
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.countryCode} — {c.countryName}
                </p>
                <p className="text-xs">
                  {c.approvedEventCount} approved
                  {c.totalEventCount !== c.approvedEventCount && (
                    <> ({c.totalEventCount} total)</>
                  )}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 z-1000 rounded-md bg-background/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
        {cities.length} cit{cities.length === 1 ? "y" : "ies"} shown
      </div>
    </div>
  );
}
