import type { ReadonlyURLSearchParams } from "next/navigation";

/**
 * URL params holding the map's center and zoom (`/map?lat=52.37&lng=4.89&zoom=12`).
 * They describe the view, not the selection, so they're kept apart from the
 * filter params: changing them doesn't refetch events or count as a filter.
 */
export const MAP_VIEW_PARAMS = ["lat", "lng", "zoom"];

const MIN_ZOOM = 1;
const MAX_ZOOM = 19;
/** ~11 m at the equator; plenty for a map view and keeps URLs short. */
const COORD_DECIMALS = 4;

export interface MapView {
  center: [number, number];
  zoom: number;
}

type SearchParamsLike = URLSearchParams | ReadonlyURLSearchParams;

/** The map view from the URL, or null if it's missing or invalid. */
export function parseMapView(searchParams: SearchParamsLike): MapView | null {
  const [lat, lng, zoom] = MAP_VIEW_PARAMS.map((p) => searchParams.get(p));
  if (lat === null || lng === null || zoom === null) return null;

  const view: MapView = { center: [Number(lat), Number(lng)], zoom: Number(zoom) };
  const [la, ln] = view.center;
  const valid =
    Number.isFinite(la) &&
    Math.abs(la) <= 90 &&
    Number.isFinite(ln) &&
    Math.abs(ln) <= 180 &&
    Number.isFinite(view.zoom) &&
    view.zoom >= MIN_ZOOM &&
    view.zoom <= MAX_ZOOM;
  return valid ? view : null;
}

/**
 * Record the current view in the URL. Uses history.replaceState rather than
 * router.replace: no navigation or server request per pan, no history entry
 * per pan, and Next.js still syncs useSearchParams with it.
 */
export function writeMapView(center: { lat: number; lng: number }, zoom: number) {
  const params = new URLSearchParams(window.location.search);
  params.set("lat", String(roundCoord(center.lat)));
  params.set("lng", String(roundCoord(center.lng)));
  params.set("zoom", String(zoom));
  window.history.replaceState(null, "", `?${params.toString()}`);
}

/** The query string without the map-view params, i.e. just the filters. */
export function withoutMapView(searchParams: SearchParamsLike): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  for (const p of MAP_VIEW_PARAMS) params.delete(p);
  return params;
}

/** Only the map-view params, e.g. to keep the view when clearing filters. */
export function onlyMapView(searchParams: SearchParamsLike): URLSearchParams {
  const params = new URLSearchParams();
  for (const p of MAP_VIEW_PARAMS) {
    const value = searchParams.get(p);
    if (value !== null) params.set(p, value);
  }
  return params;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(COORD_DECIMALS));
}
