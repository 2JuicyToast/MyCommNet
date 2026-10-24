import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  MapPin,
  Wifi,
  Accessibility,
  MonitorSmartphone,
  Volume2,
  Footprints,
  Bus,
  Car,
  Bike,
  ChevronDown,
  List,
  Search,
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

const filters = ["All", "Wi-Fi", "Computers", "Jobs", "Training", "Transport", "Events"];

const pins = [
  { x: 22, y: 35, label: "TechConnect Hub", color: "purple", active: true },
  { x: 60, y: 28, label: "Central Library", color: "teal" },
  { x: 75, y: 55, label: "Atlanta Workforce Center", color: "blue" },
  { x: 40, y: 68, label: "Westside Free Clinic", color: "purple" },
  { x: 30, y: 80, label: "Code for Tomorrow", color: "teal" },
  { x: 85, y: 18, label: "Greenfield Park", color: "blue" },
];

const reviewCategories = [
  "Cleanliness",
  "Staff Attentiveness",
  "Accessibility",
  "Overall Experience",
];

const routes = [
  { icon: Footprints, mode: "Walk", best: true, time: "7 min", detail: "0.4 mi" },
  { icon: Bus, mode: "Bus", time: "10 min", detail: "Route 2 • $2.50", eta: "ETA 9:51 AM" },
  { icon: Car, mode: "Drive", time: "6 min", detail: "1.2 mi" },
  { icon: Bike, mode: "Bike", time: "8 min", detail: "0.9 mi • bike lanes" },
];

function MapPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Atlanta, GA"
        title="Map"
        subtitle="Find resources, explore routes, and get where you need to go."
        actions={
          <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2">
            <List className="h-4 w-4" /> List view
          </button>
        }
      />

      {/* Search + filter chips */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search resources or places..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filters.map((f, i) => (
            <button
              key={f}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium ${
                i === 0
                  ? "bg-gradient-brand text-white shadow-glow-purple"
                  : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
          <button className="whitespace-nowrap rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
            More filters
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Map */}
        <div className="relative h-[460px] overflow-hidden rounded-3xl border border-border/60 bg-surface shadow-card-soft lg:h-[640px]">
          {/* Stylized map */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,oklch(0.58_0.24_295/0.18),transparent_50%),radial-gradient(circle_at_80%_70%,oklch(0.55_0.22_265/0.15),transparent_55%)]" />
          <svg
            className="absolute inset-0 h-full w-full opacity-40"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="oklch(0.96 0.005 250 / 0.06)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Streets */}
            <path
              d="M0,180 C200,100 400,260 800,140"
              stroke="oklch(0.96 0.005 250 / 0.18)"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M0,360 C300,420 500,260 800,400"
              stroke="oklch(0.96 0.005 250 / 0.18)"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M120,0 C180,300 90,500 240,800"
              stroke="oklch(0.96 0.005 250 / 0.14)"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M520,0 C480,300 600,460 540,800"
              stroke="oklch(0.96 0.005 250 / 0.14)"
              strokeWidth="2.5"
              fill="none"
            />
          </svg>

          {pins.map((p, i) => (
            <div
              key={i}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-full"
            >
              <div
                className={`relative grid h-10 w-10 place-items-center rounded-full text-white shadow-glow-purple ${p.color === "teal" ? "bg-brand-teal" : p.color === "blue" ? "bg-brand-blue" : "bg-brand-purple"} ${p.active ? "ring-4 ring-white/20 scale-110" : ""}`}
              >
                <MapPin className="h-5 w-5" />
              </div>
              {p.active && (
                <div className="absolute left-1/2 top-12 w-56 -translate-x-1/2 rounded-xl border border-border bg-background/95 p-3 text-xs shadow-card-soft backdrop-blur">
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-muted-foreground">Computer Lab + Wi-Fi</p>
                </div>
              )}
            </div>
          ))}

          {/* You are here */}
          <div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-teal opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-teal" />
            </span>
            You are here
          </div>
        </div>

        {/* Location card */}
        <div className="rounded-3xl border border-border/60 bg-surface shadow-card-soft">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-teal">
                  ✓ Verified
                </span>
                <h2 className="mt-2 font-display text-2xl font-bold">TechConnect Hub</h2>
                <p className="text-sm text-muted-foreground">Computer Lab + Wi-Fi</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              456 Peachtree St NE
              <br />
              Atlanta, GA 30308
            </p>
            <p className="mt-2 text-xs">
              <span className="font-semibold text-brand-teal">Open now</span> · Closes 8:00 PM
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {[
                { icon: Wifi, label: "Free Wi-Fi", sub: "High Speed" },
                { icon: Accessibility, label: "Accessible", sub: "Wheelchair" },
                { icon: MonitorSmartphone, label: "Computers", sub: "25+ available" },
                { icon: Volume2, label: "Quiet Space", sub: "Yes" },
              ].map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.label}
                    className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2"
                  >
                    <Icon className="h-4 w-4 text-brand-teal" />
                    <div>
                      <p className="font-medium">{a.label}</p>
                      <p className="text-[10px] text-muted-foreground">{a.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/60 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Community Reviews</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Community reviews coming soon.
            </p>
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

          <div className="border-t border-border/60 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">How do you want to get there?</h3>
              <button className="flex items-center gap-1 text-xs text-muted-foreground">
                Leave now <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {routes.map((r) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.mode}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${r.best ? "border-brand-teal/50 bg-brand-teal/5" : "border-border/60 bg-surface-2"}`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-background">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {r.mode}{" "}
                        {r.best && (
                          <span className="ml-1 rounded-full bg-brand-teal/20 px-1.5 py-0.5 text-[10px] text-brand-teal">
                            Best route
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.detail}
                        {r.eta ? ` · ${r.eta}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{r.time}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              ⓘ Routes use real-time data and may change.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
