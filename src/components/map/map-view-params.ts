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

/** Events-page params that the map's event API understands as-is. */
const SHARED_FILTER_PARAMS = [
  "country",
  "city",
  "category",
  "type",
  "size",
  "from",
  "to",
  "tzo",
  "free",
  "online",
  "q",
];
/** The events page's location-filter default (see LocationFilter). */
const DEFAULT_RADIUS_KM = 100;
/** Closest zoom a radius maps to; the smallest radius option is 25 km. */
const MAX_RADIUS_ZOOM = 13;

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

/**
 * The /map URL for the selection on an events page. Filters both pages share
 * carry over, URL params winning over a landing page's fixed `baseFilters`.
 * The map has no radius filter, so a "near <place>" filter becomes the
 * initial view instead: centered on the place, zoomed to roughly that
 * radius. Sorting and paging have no map equivalent and are dropped.
 */
export function mapHrefFromEventFilters(
  searchParams: SearchParamsLike,
  baseFilters: Record<string, string> = {},
): string {
  const params = new URLSearchParams(baseFilters);
  for (const p of SHARED_FILTER_PARAMS) {
    const value = searchParams.get(p);
    if (value) params.set(p, value);
  }

  const lat = Number(searchParams.get("lat") || NaN);
  const lng = Number(searchParams.get("lng") || NaN);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const radius = Number(searchParams.get("radius")) || DEFAULT_RADIUS_KM;
    params.set("lat", String(roundCoord(lat)));
    params.set("lng", String(roundCoord(lng)));
    params.set("zoom", String(zoomForRadius(radius)));
  }

  const query = params.toString();
  return query ? `/map?${query}` : "/map";
}

/** Roughly fits a circle of that radius in a typical viewport: each zoom
 *  level halves the visible span, and zoom 9 shows about 50 km around the
 *  center. */
function zoomForRadius(radiusKm: number): number {
  const zoom = Math.round(14 - Math.log2(radiusKm / 1.25));
  return Math.min(MAX_RADIUS_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function roundCoord(value: number): number {
  return Number(value.toFixed(COORD_DECIMALS));
}
