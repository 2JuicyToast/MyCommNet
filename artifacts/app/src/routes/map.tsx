import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { GeoapifyMap } from "@/components/GeoapifyMap";
import {
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
          <GeoapifyMap />
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
