import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

const FALLBACK_CENTER: [number, number] = [33.749, -84.388];
const DEFAULT_ZOOM = 12;

function getCoordinate(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value?.trim()) return fallback;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max
    ? coordinate
    : fallback;
}

const defaultCenter: [number, number] = [
  getCoordinate(import.meta.env.VITE_MAP_DEFAULT_LAT, FALLBACK_CENTER[0], -90, 90),
  getCoordinate(import.meta.env.VITE_MAP_DEFAULT_LNG, FALLBACK_CENTER[1], -180, 180),
];

const attribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> &middot; <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a>';

export function GeoapifyMap() {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const [tileState, setTileState] = useState<"loading" | "loaded" | "error">("loading");
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim();

  useEffect(() => {
    if (!apiKey || !mapElementRef.current) return;

    let disposed = false;
    let map: LeafletMap | undefined;

    void import("leaflet").then((L) => {
      if (disposed || !mapElementRef.current) return;

      map = L.map(mapElementRef.current, {
        center: defaultCenter,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      const tileLayer = L.tileLayer(
        `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(apiKey)}`,
        {
          maxZoom: 20,
          attribution,
        },
      );

      tileLayer.on("tileload", () => setTileState("loaded"));
      tileLayer.on("tileerror", () => {
        console.error("Geoapify map tile request failed.");
        setTileState("error");
      });

      tileLayer.addTo(map);
      requestAnimationFrame(() => map?.invalidateSize());
    });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [apiKey]);

  const statusMessage = !apiKey
    ? "Add VITE_GEOAPIFY_API_KEY in Replit Secrets to load map tiles."
    : tileState === "error"
      ? "Map tiles could not load. Check the Geoapify key, allowed domains, and quota."
      : tileState === "loading"
        ? "Loading map tiles…"
        : null;

  return (
    <div className="relative h-full min-h-[320px] w-full bg-surface-2">
      <div
        ref={mapElementRef}
        aria-label="Interactive map. Use the plus and minus controls to zoom, or drag to pan."
        className="absolute inset-0 z-0"
      />
      {statusMessage && (
        <div
          role={tileState === "error" ? "alert" : "status"}
          className="absolute left-1/2 top-4 z-[1000] w-[min(92%,28rem)] -translate-x-1/2 rounded-xl border border-border bg-background/95 px-4 py-3 text-center text-sm shadow-card-soft backdrop-blur"
        >
          {statusMessage}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-5 left-4 z-[1000] rounded-full bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-card-soft backdrop-blur">
        Default map view · not your location
      </div>
    </div>
  );
}
