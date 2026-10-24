import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { GeoapifyMap } from "@/components/GeoapifyMap";
import { AddressSearch } from "@/components/AddressSearch";
import {
  geoapifyPlaces,
  geoapifyPlaceDetails,
  geoapifyRoute,
  distanceKm,
  formatMiles,
  formatDuration,
  safeExternalUrl,
  type Location,
  type Place,
  type RouteResult,
  type TravelMode,
} from "@/lib/geoapify";
import {
  Footprints,
  Car,
  Bike,
  ChevronDown,
  ChevronUp,
  List,
  Map as MapIcon,
  LocateFixed,
  Navigation,
  ExternalLink,
  Phone,
  Clock,
  Building2,
  BookOpen,
  Info,
  AlertCircle,
  Loader2,
  ArrowLeft,
  X,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map — MyCommNet" },
      {
        name: "description",
        content: "Find resources, explore routes, and get where you need to go.",
      },
      { property: "og:title", content: "Map — MyCommNet" },
      {
        property: "og:description",
        content: "Find resources, explore routes, and get where you need to go.",
      },
    ],
  }),
  component: MapPage,
});

const DEFAULT_LAT = 33.749;
const DEFAULT_LON = -84.388;

const filterChips = [
  { id: "all", label: "All Resources", categoryKey: "education.library,activity.community_center" },
  { id: "libraries", label: "Libraries", categoryKey: "education.library" },
  { id: "centers", label: "Community Centers", categoryKey: "activity.community_center" },
  { id: "wifi", label: "Wi-Fi", categoryKey: "" },
  { id: "computers", label: "Computers", categoryKey: "" },
  { id: "jobs", label: "Jobs", categoryKey: "" },
  { id: "training", label: "Training", categoryKey: "" },
  { id: "transport", label: "Transport", categoryKey: "" },
  { id: "events", label: "Events", categoryKey: "" },
];

const reviewCategories = [
  "Cleanliness",
  "Staff Attentiveness",
  "Accessibility",
  "Overall Experience",
];

function MapPage() {
  // Location states
  const [currentLocation, setCurrentLocation] = useState<(Location & { accuracy: number }) | null>(null);
  const [manualStartLocation, setManualStartLocation] = useState<Location | null>(null);
  const [searchLocation, setSearchLocation] = useState<Location | null>(null);
  const [mapArea, setMapArea] = useState<{ lat: number; lon: number; radius: number }>({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
    radius: 5000,
  });
  const [focusLocation, setFocusLocation] = useState<Location | null>(null);
  const [mapMovedSinceSearch, setMapMovedSinceSearch] = useState(false);

  // Geolocation UI states
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showManualStartInput, setShowManualStartInput] = useState(false);

  // Resource states
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [unsupportedNotice, setUnsupportedNotice] = useState<string | null>(null);
  const [resources, setResources] = useState<Place[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  // Selected resource & details
  const [selectedResource, setSelectedResource] = useState<Place | null>(null);
  const [resourceDetails, setResourceDetails] = useState<Place | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Routing states
  const [travelMode, setTravelMode] = useState<TravelMode>("walk");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showTurnByTurn, setShowTurnByTurn] = useState(false);

  // Mobile view toggle (Map vs List)
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  // Effective starting point for directions
  const startingPoint: Location | null =
    manualStartLocation ||
    (currentLocation
      ? { lat: currentLocation.lat, lon: currentLocation.lon, formatted: "My Current Location" }
      : null);

  // Active category identifier for Geoapify Places
  const activeCategoryKey =
    filterChips.find((f) => f.id === selectedFilter)?.categoryKey ||
    "education.library,activity.community_center";

  // Search resources around a given center
  const loadResources = useCallback(
    async (lat: number, lon: number, radius = 5000) => {
      setIsLoadingResources(true);
      setResourcesError(null);
      setMapMovedSinceSearch(false);
      try {
        const places = await geoapifyPlaces({
          categories: activeCategoryKey,
          lat,
          lon,
          radiusMeters: radius,
          limit: 25,
        });
        setResources(places);
        if (places.length === 0) {
          setResourcesError("No community resources found in this area. Try panning or expanding your search.");
        }
      } catch (err: any) {
        setResourcesError(err.message || "Failed to load community resources.");
      } finally {
        setIsLoadingResources(false);
      }
    },
    [activeCategoryKey],
  );

  // Initial load
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadResources(DEFAULT_LAT, DEFAULT_LON, 5000);
    }
  }, [loadResources]);

  // Refetch when category filter changes
  const prevFilter = useRef(selectedFilter);
  useEffect(() => {
    if (prevFilter.current !== selectedFilter) {
      prevFilter.current = selectedFilter;
      const targetLat = searchLocation?.lat || mapArea.lat;
      const targetLon = searchLocation?.lon || mapArea.lon;
      loadResources(targetLat, targetLon, mapArea.radius);
    }
  }, [selectedFilter, searchLocation, mapArea, loadResources]);

  // Handle Area Autocomplete selection
  function handleSelectSearchArea(place: Location) {
    setSearchLocation(place);
    setFocusLocation(place);
    loadResources(place.lat, place.lon, 5000);
  }

  // Handle "Use My Location"
  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please enter a starting address manually.");
      setShowManualStartInput(true);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const loc = {
          lat: latitude,
          lon: longitude,
          formatted: "My Current Location",
          accuracy,
        };
        setCurrentLocation(loc);
        setFocusLocation({ lat: latitude, lon: longitude, formatted: "My Current Location" });

        // If no resources were loaded yet, load around current location
        if (resources.length === 0) {
          loadResources(latitude, longitude, 5000);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location access was denied. If using an embedded preview window, browser permissions may be blocked; try opening the standalone preview at http://localhost:3000 directly. You can also enter a starting address manually below.",
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("Location information is unavailable on your device or network. Please enter a starting address manually.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location request timed out. Please try again or enter a starting address manually.");
        } else {
          setLocationError("Could not retrieve your location. Please enter a starting address manually.");
        }
        setShowManualStartInput(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  // Handle Resource Selection
  function handleSelectResource(place: Place) {
    setSelectedResource(place);
    setResourceDetails(null);
    setRouteResult(null);
    setRouteError(null);
    setShowTurnByTurn(false);
    setFocusLocation(place);

    // Fetch rich place details if place_id exists
    if (place.place_id) {
      setIsLoadingDetails(true);
      geoapifyPlaceDetails(place.place_id)
        .then((details) => {
          if (details) setResourceDetails(details);
        })
        .catch(() => {
          // Fall back gracefully to base place
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }

  // Calculate Route when resource, startingPoint, or travelMode changes
  useEffect(() => {
    if (!selectedResource || !startingPoint) {
      setRouteResult(null);
      setRouteError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingRoute(true);
    setRouteError(null);

    geoapifyRoute(
      { lat: startingPoint.lat, lon: startingPoint.lon },
      { lat: selectedResource.lat, lon: selectedResource.lon },
      travelMode,
      controller.signal,
    )
      .then((res) => {
        if (!controller.signal.aborted) {
          setRouteResult(res);
          setIsLoadingRoute(false);
          if (!res) {
            setRouteError(`No ${travelMode} route could be calculated between these two locations.`);
          }
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setRouteResult(null);
          setIsLoadingRoute(false);
          setRouteError(err.message || "Failed to calculate directions.");
        }
      });

    return () => controller.abort();
  }, [selectedResource, startingPoint, travelMode]);

  // Handle filter chip clicks
  function handleFilterClick(chip: (typeof filterChips)[0]) {
    if (chip.categoryKey) {
      setSelectedFilter(chip.id);
      setUnsupportedNotice(null);
    } else {
      setSelectedFilter(chip.id);
      setUnsupportedNotice(
        `Geoapify Places does not index "${chip.label}" as an independent search category. Showing nearby libraries and community centers which commonly provide public access to ${chip.label.toLowerCase()}.`,
      );
    }
  }

  // Resource details object (merges base place and fetched details)
  const activePlace = resourceDetails || selectedResource;

  const isLibrary = activePlace?.categories?.some((c) => c.includes("library"));
  const isCommunityCenter = activePlace?.categories?.some((c) => c.includes("community_center"));
  const categoryLabel = isLibrary ? "Public Library" : isCommunityCenter ? "Community Center" : "Community Facility";

  // Straight line distance
  const straightLineDistanceMeters =
    startingPoint && activePlace
      ? distanceKm(startingPoint, activePlace) * 1000
      : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Community Map & Navigation"
        title="Map"
        subtitle="Discover nearby libraries, community centers, and directions."
        actions={
          <button
            type="button"
            onClick={() => setMobileView((v) => (v === "map" ? "list" : "map"))}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2 lg:hidden"
          >
            {mobileView === "map" ? (
              <>
                <List className="h-4 w-4" /> View List ({resources.length})
              </>
            ) : (
              <>
                <MapIcon className="h-4 w-4" /> View Map
              </>
            )}
          </button>
        }
      />

      {/* Top Search & Controls Row */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Main Address Search */}
          <AddressSearch
            placeholder="Search address, neighborhood, or city…"
            onSelect={handleSelectSearchArea}
            onClear={() => setSearchLocation(null)}
          />

          {/* Use My Location Button */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-brand-teal/50 hover:bg-surface-2 disabled:opacity-60"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
            ) : (
              <LocateFixed className="h-4 w-4 text-brand-teal" />
            )}
            <span>{currentLocation ? "GPS Active" : "Use my location"}</span>
          </button>

          {/* Toggle Manual Start Button */}
          <button
            type="button"
            onClick={() => setShowManualStartInput((v) => !v)}
            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
              manualStartLocation
                ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-border bg-surface hover:bg-surface-2"
            }`}
          >
            <Navigation className="h-4 w-4" />
            <span>{manualStartLocation ? "Start Set" : "Directions start…"}</span>
          </button>
        </div>

        {/* Manual Start Address Field (Conditional) */}
        {showManualStartInput && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex-1">
              <AddressSearch
                label="Directions Starting Address"
                placeholder="Enter custom starting location for directions…"
                initialValue={manualStartLocation?.formatted || ""}
                onSelect={(loc) => setManualStartLocation(loc)}
                onClear={() => setManualStartLocation(null)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowManualStartInput(false)}
              className="mt-4 rounded-lg p-2 text-muted-foreground hover:bg-surface-2"
              title="Close manual start input"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Geolocation Error Alert */}
        {locationError && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="font-semibold">Location Access</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">{locationError}</p>
            </div>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="text-amber-700 hover:text-amber-900 dark:text-amber-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterChips.map((chip) => {
            const isSelected = selectedFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleFilterClick(chip)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? "bg-gradient-brand text-white shadow-glow-purple"
                    : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Unsupported Category Notice */}
        {unsupportedNotice && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-2/70 px-3.5 py-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-brand-teal" />
            <div className="flex-1">{unsupportedNotice}</div>
            <button
              type="button"
              onClick={() => setUnsupportedNotice(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Map & Details / List */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* Left Column: Interactive Map */}
        <div
          className={`relative h-[480px] overflow-hidden rounded-3xl border border-border/60 bg-surface shadow-card-soft lg:block lg:h-[720px] ${
            mobileView === "list" ? "hidden" : "block"
          }`}
        >
          {isLoadingResources && (
            <div className="absolute left-4 top-4 z-[1000] flex items-center gap-2 rounded-full border border-border bg-background/95 px-3.5 py-1.5 text-xs font-medium shadow-card-soft backdrop-blur">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-teal" />
              Searching resources…
            </div>
          )}

          <GeoapifyMap
            focus={focusLocation}
            searched={searchLocation}
            current={currentLocation}
            starting={manualStartLocation}
            resources={resources}
            selectedId={selectedResource?.place_id}
            routePolyline={routeResult?.coordinates}
            onSelect={handleSelectResource}
            onAreaChange={(area) => {
              setMapArea(area);
              setMapMovedSinceSearch(true);
            }}
            showSearchThisArea={mapMovedSinceSearch}
            onSearchThisArea={() => loadResources(mapArea.lat, mapArea.lon, mapArea.radius)}
          />
        </div>

        {/* Right Column: Resource Details or List of Resources */}
        <div className={`space-y-5 ${mobileView === "map" ? "hidden lg:block" : "block"}`}>
          {activePlace ? (
            /* Resource Details Panel */
            <div className="rounded-3xl border border-border/60 bg-surface shadow-card-soft">
              {/* Back to List Button */}
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedResource(null);
                    setResourceDetails(null);
                    setRouteResult(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to nearby list ({resources.length})
                </button>
                {isLoadingDetails && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin text-brand-teal" /> Loading details…
                  </span>
                )}
              </div>

              {/* Resource Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isLibrary
                          ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {isLibrary ? <BookOpen className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                      {categoryLabel}
                    </span>
                    <h2 className="mt-2 font-display text-2xl font-bold">
                      {activePlace.name || activePlace.formatted}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activePlace.address_line1 || activePlace.formatted}
                    </p>
                    {activePlace.address_line2 && (
                      <p className="text-xs text-muted-foreground">{activePlace.address_line2}</p>
                    )}
                  </div>
                </div>

                {/* Straight-line distance tag */}
                {straightLineDistanceMeters !== null && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-teal">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Approx. {formatMiles(straightLineDistanceMeters)} straight-line from starting point</span>
                  </div>
                )}

                {/* Opening Hours */}
                <div className="mt-4 flex items-start gap-2 text-xs">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <div>
                    <span className="font-semibold">Hours: </span>
                    <span className="text-muted-foreground">
                      {activePlace.opening_hours || "Opening hours: Not provided"}
                    </span>
                  </div>
                </div>

                {/* Contact and Website */}
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  {activePlace.contact?.phone ? (
                    <a
                      href={`tel:${activePlace.contact.phone.replace(/[^0-9+]/g, "")}`}
                      className="flex items-center gap-1.5 font-medium text-brand-teal hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" /> {activePlace.contact.phone}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> Phone: Not provided
                    </span>
                  )}

                  {safeExternalUrl(activePlace.website) ? (
                    <a
                      href={safeExternalUrl(activePlace.website)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-medium text-brand-teal hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Visit website
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ExternalLink className="h-3.5 w-3.5" /> Website: Not provided
                    </span>
                  )}
                </div>

                {/* Factual description */}
                <div className="mt-4 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    A public {categoryLabel.toLowerCase()} serving the local community. Resource details verified from
                    Geoapify &amp; OpenStreetMap records.
                  </p>
                </div>
              </div>

              {/* Community Reviews Card (Preserved styling with "Coming Soon") */}
              <div className="border-t border-border/60 p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold">Community Reviews</h3>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">Community reviews coming soon.</p>
                <div className="space-y-2.5">
                  {reviewCategories.map((label) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-muted-foreground">Not rated</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full w-0 rounded-full bg-gradient-brand" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distance and Directions Card */}
              <div className="border-t border-border/60 p-6">
                <div className="mb-3">
                  <h3 className="font-display text-sm font-semibold">How do you want to get there?</h3>
                  <p className="text-xs text-muted-foreground">
                    {startingPoint
                      ? `Starting from: ${startingPoint.formatted}`
                      : "Choose a starting point above (or click below) to view directions."}
                  </p>
                </div>

                {!startingPoint ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-2/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      To calculate travel routes, select a starting point:
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
                      >
                        <LocateFixed className="h-3.5 w-3.5 text-brand-teal" /> Use my location
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualStartInput(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
                      >
                        <Navigation className="h-3.5 w-3.5 text-amber-500" /> Enter starting address
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Travel Mode Selector */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { mode: "walk" as TravelMode, label: "Walk", icon: Footprints },
                        { mode: "drive" as TravelMode, label: "Drive", icon: Car },
                        { mode: "bicycle" as TravelMode, label: "Bike", icon: Bike },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = travelMode === item.mode;
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() => setTravelMode(item.mode)}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-medium transition ${
                              isSelected
                                ? "border-brand-teal/60 bg-brand-teal/10 text-brand-teal shadow-sm"
                                : "border-border bg-surface-2 hover:bg-surface"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Route Details Banner */}
                    {isLoadingRoute && (
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
                        Calculating {travelMode} route…
                      </div>
                    )}

                    {routeError && (
                      <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted-foreground">
                        {routeError}
                      </div>
                    )}

                    {routeResult && !isLoadingRoute && (
                      <div className="rounded-2xl border border-border/80 bg-surface-2/60 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold text-foreground">
                              {formatDuration(routeResult.timeSeconds)}{" "}
                              <span className="text-xs font-normal text-muted-foreground">(estimated)</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatMiles(routeResult.distanceMeters)} route distance
                            </p>
                          </div>
                          <span className="rounded-full bg-brand-teal/15 px-2.5 py-1 text-[11px] font-semibold text-brand-teal">
                            {travelMode.toUpperCase()}
                          </span>
                        </div>

                        {/* Turn-by-turn toggle */}
                        {routeResult.steps.length > 0 && (
                          <div className="mt-3 border-t border-border/60 pt-3">
                            <button
                              type="button"
                              onClick={() => setShowTurnByTurn((v) => !v)}
                              className="flex w-full items-center justify-between text-xs font-medium text-foreground hover:text-brand-teal"
                            >
                              <span>
                                {showTurnByTurn ? "Hide" : "View"} turn-by-turn directions ({routeResult.steps.length}{" "}
                                steps)
                              </span>
                              {showTurnByTurn ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {showTurnByTurn && (
                              <ol className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1 text-xs text-muted-foreground">
                                {routeResult.steps.map((step, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-surface text-[10px] font-semibold">
                                      {idx + 1}
                                    </span>
                                    <div className="flex-1">
                                      <p className="text-foreground">{step.text}</p>
                                      {step.distanceMeters > 0 && (
                                        <p className="text-[10px] text-muted-foreground">
                                          {formatMiles(step.distanceMeters)}
                                        </p>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground">
                      ⓘ Route travel times are estimates based on standard speeds and distance, not live-traffic or
                      continuous GPS navigation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Resource List (Default right-hand view when no resource is selected) */
            <div className="rounded-3xl border border-border/60 bg-surface shadow-card-soft">
              <div className="border-b border-border/60 p-5">
                <h2 className="font-display text-lg font-bold">Nearby Community Resources</h2>
                <p className="text-xs text-muted-foreground">
                  Showing {resources.length} verified libraries and community centers in this area. Click any resource
                  to view details and directions.
                </p>
              </div>

              {resourcesError && (
                <div className="p-5 text-center text-xs text-muted-foreground">
                  <p>{resourcesError}</p>
                </div>
              )}

              {isLoadingResources ? (
                <div className="flex items-center justify-center gap-2 p-12 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
                  Loading resources…
                </div>
              ) : resources.length === 0 && !resourcesError ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="font-medium text-foreground">No resources loaded</p>
                  <p className="mt-1">
                    Try searching an address above or click &ldquo;Use my location&rdquo; to find community centers and libraries.
                  </p>
                </div>
              ) : (
                <div className="max-h-[620px] divide-y divide-border/60 overflow-y-auto">
                  {resources.map((place) => {
                    const isLib = place.categories?.some((c) => c.includes("library"));
                    const isCtr = place.categories?.some((c) => c.includes("community_center"));
                    const tag = isLib ? "Library" : isCtr ? "Community Center" : "Resource";

                    const dist = startingPoint ? distanceKm(startingPoint, place) * 1000 : null;

                    return (
                      <button
                        key={place.place_id || place.formatted}
                        type="button"
                        onClick={() => handleSelectResource(place)}
                        className="group flex w-full items-start gap-3 p-4 text-left transition hover:bg-surface-2"
                      >
                        <span
                          className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                            isLib
                              ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {isLib ? <BookOpen className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-brand-teal">
                              {place.name || place.formatted}
                            </h3>
                            {dist !== null && (
                              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                                {formatMiles(dist)}
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {place.address_line1 || place.formatted}
                          </p>
                          <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {tag}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
