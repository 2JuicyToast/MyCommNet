import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { Location, Place } from "@/lib/geoapify";
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

type MapProps = {
  focus: Location | null;
  searched: Location | null;
  current: (Location & { accuracy: number }) | null;
  starting: Location | null;
  resources: Place[];
  selectedId?: string;
  onSelect: (place: Place) => void;
  onAreaChange: (area: Location & { radius: number }) => void;
};

export function GeoapifyMap({ focus, searched, current, starting, resources, selectedId, onSelect, onAreaChange }: MapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const areaCallback = useRef(onAreaChange);
  areaCallback.current = onAreaChange;
  const [ready, setReady] = useState(false);
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
      mapRef.current = map;
      const reportArea = () => {
        if (!map) return;
        const center = map.getCenter();
        const radius = Math.min(50000, Math.max(1000, map.distance(center, map.getBounds().getNorthEast())));
        areaCallback.current({ lat: center.lat, lon: center.lng, formatted: "Current map area", radius });
      };
      map.on("moveend", reportArea);
      reportArea();
      setReady(true);

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
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    if (ready && focus) mapRef.current?.setView([focus.lat, focus.lon], 14);
  }, [focus, ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let disposed = false;
    let layer: import("leaflet").LayerGroup | undefined;
    void import("leaflet").then((L) => {
      if (disposed || !mapRef.current) return;
      layer = L.layerGroup().addTo(mapRef.current);
      function marker(location: Location, color: string, label: string, size = 14, action?: () => void) {
        const icon = L.divIcon({
          className: "",
          html: `<span style="display:block;width:${size}px;height:${size}px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 0 0 2px ${color}"></span>`,
          iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        });
        const point = L.marker([location.lat, location.lon], { icon, title: label, alt: label });
        // Text nodes avoid rendering external place names as HTML.
        const tooltip = document.createElement("span");
        tooltip.textContent = label;
        point.bindTooltip(tooltip).addTo(layer!);
        if (action) point.on("click", action);
      }
      if (current) {
        L.circle([current.lat, current.lon], { radius: current.accuracy, color: "#2563eb", fillOpacity: 0.12 }).addTo(layer);
        marker(current, "#2563eb", "My current location", 18);
      }
      if (starting) marker(starting, "#f59e0b", "Manual starting address", 16);
      if (searched) marker(searched, "#a855f7", `Searched area: ${searched.formatted}`, 18);
      resources.forEach((place) => marker(place, place.place_id === selectedId ? "#ef4444" : "#0d9488",
        `Resource: ${place.name || place.formatted}`, place.place_id === selectedId ? 24 : 16, () => onSelect(place)));
    });
    return () => { disposed = true; layer?.remove(); };
  }, [ready, searched, current, starting, resources, selectedId, onSelect]);

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
        {current ? "Blue: GPS" : "Default view is not your location"} · Purple: search · Teal: resource · Red: selected · Amber: start
      </div>
    </div>
  );
}
