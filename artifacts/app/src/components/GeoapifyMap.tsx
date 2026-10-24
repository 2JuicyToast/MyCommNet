import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Polyline as LeafletPolyline, LayerGroup as LeafletLayerGroup } from "leaflet";
import type { Location, Place } from "@/lib/geoapify";
import { RefreshCw } from "lucide-react";
import "leaflet/dist/leaflet.css";

const FALLBACK_CENTER: [number, number] = [33.749, -84.388];
const DEFAULT_ZOOM = 13;

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
  focus?: Location | null;
  searched?: Location | null;
  current?: (Location & { accuracy: number }) | null;
  starting?: Location | null;
  resources?: Place[];
  selectedId?: string;
  routePolyline?: [number, number][];
  onSelect?: (place: Place) => void;
  onAreaChange?: (area: Location & { radius: number }) => void;
  onSearchThisArea?: () => void;
  showSearchThisArea?: boolean;
};

export function GeoapifyMap({
  focus,
  searched,
  current,
  starting,
  resources = [],
  selectedId,
  routePolyline,
  onSelect,
  onAreaChange,
  onSearchThisArea,
  showSearchThisArea = false,
}: MapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const areaCallback = useRef(onAreaChange);
  areaCallback.current = onAreaChange;
  const [ready, setReady] = useState(false);
  const [tileState, setTileState] = useState<"loading" | "loaded" | "error">("loading");
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim();

  // Initialize Map
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
        if (!map || !areaCallback.current) return;
        const center = map.getCenter();
        const bounds = map.getBounds();
        const radius = Math.min(50000, Math.max(1000, map.distance(center, bounds.getNorthEast())));
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

  // Handle focus changes
  useEffect(() => {
    if (ready && focus && mapRef.current) {
      mapRef.current.setView([focus.lat, focus.lon], 14, { animate: true });
    }
  }, [focus, ready]);

  // Handle Markers & Route Polyline
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let disposed = false;
    let markerLayer: LeafletLayerGroup | undefined;
    let polylineLayer: LeafletPolyline | undefined;

    void import("leaflet").then((L) => {
      if (disposed || !mapRef.current) return;
      markerLayer = L.layerGroup().addTo(mapRef.current);

      function createMarker(
        location: { lat: number; lon: number },
        color: string,
        label: string,
        size = 16,
        isHighlight = false,
        action?: () => void,
      ) {
        const borderStyle = isHighlight
          ? "border: 3px solid white; box-shadow: 0 0 0 3px #ef4444, 0 4px 10px rgba(0,0,0,0.3)"
          : "border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2)";

        const icon = L.divIcon({
          className: "",
          html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};${borderStyle};cursor:pointer;"></span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const point = L.marker([location.lat, location.lon], {
          icon,
          title: label,
          alt: label,
          zIndexOffset: isHighlight ? 1000 : 10,
        });

        const tooltip = document.createElement("span");
        tooltip.textContent = label;
        tooltip.style.fontWeight = isHighlight ? "bold" : "normal";
        point.bindTooltip(tooltip, { direction: "top", offset: [0, -size / 2] }).addTo(markerLayer!);

        if (action) point.on("click", action);
      }

      // 1. Current GPS location marker + accuracy circle
      if (current) {
        L.circle([current.lat, current.lon], {
          radius: Math.max(20, current.accuracy),
          color: "#2563eb",
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          weight: 1.5,
        }).addTo(markerLayer);
        createMarker(current, "#2563eb", "My Current Location", 18, false);
      }

      // 2. Manual starting address marker
      if (starting) {
        createMarker(starting, "#f59e0b", `Start: ${starting.formatted}`, 18, false);
      }

      // 3. Search area marker
      if (searched) {
        createMarker(searched, "#a855f7", `Search Area: ${searched.formatted}`, 18, false);
      }

      // 4. Resources markers with collision jitter
      const coordMap = new Map<string, number>();

      resources.forEach((place) => {
        const key = `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`;
        const count = coordMap.get(key) || 0;
        coordMap.set(key, count + 1);

        // Slight offset if overlapping so all markers remain visible and clickable
        const angle = count * 1.25;
        const offset = count * 0.00015;
        const adjustedLat = place.lat + (count > 0 ? Math.sin(angle) * offset : 0);
        const adjustedLon = place.lon + (count > 0 ? Math.cos(angle) * offset : 0);

        const isSelected = place.place_id === selectedId;
        const isLibrary = place.categories?.some((c) => c.includes("library"));
        const isCommunityCenter = place.categories?.some((c) => c.includes("community_center"));

        const color = isSelected
          ? "#ef4444"
          : isLibrary
            ? "#0284c7"
            : isCommunityCenter
              ? "#059669"
              : "#0d9488";

        const categoryTag = isLibrary ? "Library" : isCommunityCenter ? "Community Center" : "Resource";
        const label = `${place.name || place.formatted} (${categoryTag})`;

        createMarker(
          { lat: adjustedLat, lon: adjustedLon },
          color,
          label,
          isSelected ? 24 : 16,
          isSelected,
          onSelect ? () => onSelect(place) : undefined,
        );
      });

      // 5. Route Polyline
      if (routePolyline && routePolyline.length > 1) {
        polylineLayer = L.polyline(routePolyline, {
          color: "#7c3aed",
          weight: 5,
          opacity: 0.85,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(mapRef.current);

        mapRef.current.fitBounds(polylineLayer.getBounds(), { padding: [50, 50] });
      }
    });

    return () => {
      disposed = true;
      markerLayer?.remove();
      polylineLayer?.remove();
    };
  }, [ready, searched, current, starting, resources, selectedId, routePolyline, onSelect]);

  const statusMessage = !apiKey
    ? "Add VITE_GEOAPIFY_API_KEY in .env.local to load map tiles."
    : tileState === "error"
      ? "Map tiles could not load. Check the Geoapify key, allowed domains, and quota."
      : tileState === "loading"
        ? "Loading map tiles…"
        : null;

  return (
    <div className="relative h-full min-h-[360px] w-full bg-surface-2">
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

      {/* Floating "Search this area" button */}
      {showSearchThisArea && onSearchThisArea && (
        <button
          type="button"
          onClick={onSearchThisArea}
          className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-4 py-2 text-xs font-semibold text-foreground shadow-card-soft backdrop-blur transition hover:bg-surface-2 hover:shadow active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5 text-brand-teal" />
          Search this area
        </button>
      )}

      {/* Map Legend */}
      <div className="pointer-events-none absolute bottom-4 left-3 z-[1000] hidden flex-wrap gap-2 rounded-xl bg-background/90 px-3 py-2 text-[11px] text-muted-foreground shadow-card-soft backdrop-blur sm:flex">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" /> Current GPS
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" /> Start
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]" /> Library
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" /> Community Center
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" /> Selected
        </span>
      </div>
    </div>
  );
}
