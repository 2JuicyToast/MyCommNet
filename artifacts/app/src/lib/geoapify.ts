export type Location = { lat: number; lon: number; formatted: string };
export type Place = Location & {
  place_id: string;
  name?: string;
  categories?: string[];
  opening_hours?: string;
  website?: string;
  contact?: { phone?: string; website?: string };
};
type FeatureCollection = { features: { properties: Place }[] };

export async function geoapify(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<Place[]> {
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim();
  if (!key) throw new Error("Map services need VITE_GEOAPIFY_API_KEY in Replit Secrets.");
  const query = new URLSearchParams({ ...params, apiKey: key });
  let response: Response;
  try {
    response = await fetch(`https://api.geoapify.com/${path}?${query}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Cannot reach Geoapify. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Geoapify rejected the request. Check the key and allowed website domains."
        : response.status === 429
          ? "Geoapify request limit reached. Wait a moment and retry."
          : `Geoapify request failed (${response.status}). Please retry.`,
    );
  }
  const data = (await response.json()) as FeatureCollection;
  if (!Array.isArray(data.features)) throw new Error("Geoapify returned an unexpected response.");
  return data.features.map((feature) => feature.properties).filter(
    (place) => Number.isFinite(place.lat) && Number.isFinite(place.lon),
  );
}

export function distanceKm(from: Location, to: Location) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(to.lat - from.lat) / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat))
    * Math.sin(radians(to.lon - from.lon) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
