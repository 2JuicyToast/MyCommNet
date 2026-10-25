export type Location = { lat: number; lon: number; formatted: string };

export type Place = Location & {
  place_id: string;
  name?: string;
  categories?: string[];
  address_line1?: string;
  address_line2?: string;
  opening_hours?: string;
  website?: string;
  contact?: { phone?: string; website?: string; email?: string };
  facilities?: Record<string, boolean | string | number>;
  description?: string;
};

export type TravelMode = "drive" | "transit" | "bicycle" | "walk";

export type RouteStep = {
  text: string;
  distanceMeters: number;
  timeSeconds: number;
};

export type RouteResult = {
  mode: TravelMode;
  distanceMeters: number;
  timeSeconds: number;
  coordinates: [number, number][]; // [lat, lon] for Leaflet
  steps: RouteStep[];
};

type GeoapifyFeature<T> = {
  properties: T;
  geometry?: {
    type: "LineString" | "MultiLineString" | "Point";
    coordinates: any;
  };
};

type FeatureCollection<T> = {
  features: GeoapifyFeature<T>[];
};

function getApiKey(): string {
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim();
  if (!key) {
    throw new Error("Map services need VITE_GEOAPIFY_API_KEY in .env.local.");
  }
  return key;
}

export async function geoapify(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<Place[]> {
  const key = getApiKey();
  const query = new URLSearchParams({ ...params, apiKey: key });
  let response: Response;
  try {
    response = await fetch(`https://api.geoapify.com/${path}?${query}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Cannot reach Geoapify. Check your connection and try again.");
  }
  if (!response.ok) {
    let errMessage = `Geoapify request failed (${response.status}).`;
    try {
      const errJson = await response.json();
      if (errJson?.message) errMessage = errJson.message;
    } catch {
      // Ignore json parse error
    }
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Geoapify rejected the request. Check the key and allowed website domains."
        : response.status === 429
          ? "Geoapify request limit reached. Wait a moment and retry."
          : errMessage,
    );
  }
  const data = (await response.json()) as FeatureCollection<Place>;
  if (!Array.isArray(data.features)) throw new Error("Geoapify returned an unexpected response.");
  return data.features
    .map((feature) => feature.properties)
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon));
}

export async function geoapifyAutocomplete(
  text: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  if (!text.trim()) return [];
  return geoapify("v1/geocode/autocomplete", { text: text.trim(), limit: "6" }, signal);
}

export async function geoapifyPlaces(
  options: {
    categories: string;
    lat: number;
    lon: number;
    radiusMeters?: number;
    limit?: number;
  },
  signal?: AbortSignal,
): Promise<Place[]> {
  const radius = Math.min(50000, Math.max(1000, Math.round(options.radiusMeters || 5000)));
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const filter = `circle:${options.lon},${options.lat},${radius}`;
  const bias = `proximity:${options.lon},${options.lat}`;

  return geoapify(
    "v2/places",
    {
      categories: options.categories,
      filter,
      bias,
      limit: limit.toString(),
    },
    signal,
  );
}

export const PUBLIC_TRANSPORT_CATEGORIES = [
  "transport.bus.stop",
  "transport.bus.station",
  "transport.train.station",
  "transport.tram.stop",
  "transport.subway.station",
  "transport.public",
].join(",");

export function isTransportCategory(category: string): boolean {
  return category.startsWith("transport.");
}

export async function geoapifyPlaceDetails(
  placeId: string,
  signal?: AbortSignal,
): Promise<Place | null> {
  const key = getApiKey();
  const query = new URLSearchParams({ id: placeId, apiKey: key });
  let response: Response;
  try {
    response = await fetch(`https://api.geoapify.com/v2/place-details?${query}`, { signal });
  } catch (error) {
    if (signal?.aborted) return null;
    throw new Error("Cannot reach Geoapify. Check your connection and try again.");
  }
  if (!response.ok) return null;
  const data = (await response.json()) as FeatureCollection<Place>;
  if (!Array.isArray(data.features) || data.features.length === 0) return null;
  return data.features[0].properties;
}

export async function geoapifyRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  mode: TravelMode,
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const key = getApiKey();
  const waypoints = `${from.lat},${from.lon}|${to.lat},${to.lon}`;
  const query = new URLSearchParams({
    waypoints,
    mode,
    apiKey: key,
  });

  let response: Response;
  try {
    response = await fetch(`https://api.geoapify.com/v1/routing?${query}`, { signal });
  } catch (error) {
    if (signal?.aborted) return null;
    throw new Error("Cannot reach Geoapify routing service. Check your connection.");
  }

  if (!response.ok) {
    let errMessage = `Routing request failed (${response.status}).`;
    try {
      const errJson = await response.json();
      if (errJson?.message) errMessage = errJson.message;
    } catch {
      // Ignore
    }
    throw new Error(errMessage);
  }

  const data = await response.json();
  if (!Array.isArray(data.features) || data.features.length === 0) return null;

  const feature = data.features[0];
  const props = feature.properties || {};
  const distanceMeters = Number(props.distance) || 0;
  const timeSeconds = Number(props.time) || 0;

  // Extract coordinates for Leaflet polyline: [lat, lon]
  const coordinates: [number, number][] = [];
  const geom = feature.geometry;
  if (geom) {
    if (geom.type === "LineString" && Array.isArray(geom.coordinates)) {
      geom.coordinates.forEach(([lon, lat]: [number, number]) => {
        if (Number.isFinite(lat) && Number.isFinite(lon)) coordinates.push([lat, lon]);
      });
    } else if (geom.type === "MultiLineString" && Array.isArray(geom.coordinates)) {
      geom.coordinates.forEach((line: [number, number][]) => {
        if (Array.isArray(line)) {
          line.forEach(([lon, lat]) => {
            if (Number.isFinite(lat) && Number.isFinite(lon)) coordinates.push([lat, lon]);
          });
        }
      });
    }
  }

  // Extract turn-by-turn steps
  const steps: RouteStep[] = [];
  if (Array.isArray(props.legs)) {
    props.legs.forEach((leg: any) => {
      if (Array.isArray(leg.steps)) {
        leg.steps.forEach((step: any) => {
          if (step.instruction?.text) {
            steps.push({
              text: step.instruction.text,
              distanceMeters: Number(step.distance) || 0,
              timeSeconds: Number(step.time) || 0,
            });
          }
        });
      }
    });
  }

  return {
    mode,
    distanceMeters,
    timeSeconds,
    coordinates,
    steps,
  };
}

export function distanceKm(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(radians(to.lat - from.lat) / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(radians(to.lon - from.lon) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatMiles(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs} hr ${remainingMins} min` : `${hrs} hr`;
}

export function safeExternalUrl(url?: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    // If lacks protocol, try prepend https://
    try {
      const parsed = new URL(`https://${trimmed}`);
      if (parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch {
      return null;
    }
  }
  return null;
}
