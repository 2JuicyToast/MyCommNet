import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Users, TrendingUp, Map, Star, ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { PublicStars, PublicFooter } from "@/components/PublicStars";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyCommNet | Keeping Communities Connected" },
      {
        name: "description",
        content:
          "Discover a collaborative space where local expertise, shared resources, and meaningful connections empower your neighborhood to thrive together.",
      },
    ],
  }),
  component: HomePage,
});

const hanken = { fontFamily: "'Hanken Grotesk', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const glassCardStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(30, 41, 59, 0.5)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
};

const features = [
  {
    icon: Calendar,
    color: "#d0bcff",
    bg: "rgba(160,120,255,0.15)",
    title: "Events & Resources",
    desc: "Stay updated with local workshops, festivals, and emergency resources. Find exactly what's happening near you with curated neighborhood guides.",
    action: "Learn More",
    actionTo: "/about" as const,
    actionSearch: undefined,
  },
  {
    icon: Users,
    color: "#4fdbc8",
    bg: "rgba(79,219,200,0.15)",
    title: "Mentorship",
    desc: "Connect with community leaders and subject matter experts. Bridge the gap between potential and experience through local mentorship programs.",
    action: "Find a Mentor",
    actionTo: "/restricted" as const,
    actionSearch: undefined,
  },
  {
    icon: TrendingUp,
    color: "#adc6ff",
    bg: "rgba(173,198,255,0.15)",
    title: "Community Growth",
    desc: "Learn and build lasting connections that matter. Participate in local initiatives that drive infrastructure, education, and shared prosperity.",
    action: "Start Growing",
    actionTo: "/restricted" as const,
    actionSearch: undefined,
  },
];

function HomePage() {
  return (
    <div
      style={{
        backgroundColor: "#0b1326",
        color: "#dae2fd",
        fontFamily: "'Inter', sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        .mcn-glass:hover {
          background: rgba(15,23,42,0.85) !important;
          border-color: rgba(139,92,246,0.45) !important;
          transform: translateY(-4px);
        }
      `}</style>

      <PublicStars />
      <PublicNav activePage="home" />

      <main className="pt-[72px]" style={{ position: "relative", zIndex: 10 }}>
        {/* ── Hero ── */}
        <section
          className="relative min-h-[85vh] flex items-center justify-center px-6 overflow-hidden"
          style={{ background: "radial-gradient(circle at 50% 50%, #1e1b4b 0%, #0b1326 100%)" }}
        >
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <div
              className="absolute rounded-full animate-pulse"
              style={{
                top: "25%",
                left: "25%",
                width: 500,
                height: 500,
                background: "rgba(160,120,255,0.2)",
                filter: "blur(120px)",
              }}
            />
            <div
              className="absolute rounded-full animate-pulse"
              style={{
                bottom: "25%",
                right: "25%",
                width: 600,
                height: 600,
                background: "rgba(5,102,217,0.1)",
                filter: "blur(150px)",
                animationDelay: "2s",
              }}
            />
          </div>

          <div className="relative z-10 max-w-5xl text-center mx-auto">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
              style={{ background: "rgba(34,42,61,0.6)", border: "1px solid rgba(73,68,84,1)" }}
            >
              <Star className="h-4 w-4" style={{ color: "#4fdbc8" }} />
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: "#cbc3d7", ...mono }}
              >
                Explore &amp; Connect Together
              </span>
            </div>

            <h1
              className="font-black mb-6"
              style={{
                ...hanken,
                fontSize: "clamp(40px,8vw,64px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                background: "linear-gradient(180deg,#ffffff 0%,#dae2fd 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Keeping Communities <br className="hidden md:block" />
              <span
                style={{
                  background: "linear-gradient(90deg,#a078ff,#0566d9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Connected.
              </span>
            </h1>

            <p
              className="text-lg leading-relaxed max-w-2xl mx-auto mb-10"
              style={{ color: "#cbc3d7" }}
            >
              Discover a collaborative space where local expertise, shared resources, and meaningful
              connections empower your neighborhood to thrive together.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                search={{ tab: "signup" } as any}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base transition-transform hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(90deg,#a078ff,#0566d9)",
                  color: "#ffffff",
                  boxShadow: "0 8px 20px rgba(160,120,255,0.3)",
                }}
              >
                Join the Community
              </Link>
              <Link
                to="/map"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-white/10"
                style={{ border: "1px solid rgba(73,68,84,0.8)", color: "#dae2fd" }}
              >
                <Map className="h-5 w-5" />
                Explore the Map
              </Link>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-16 px-6" style={{ backgroundColor: "#0b1326" }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ color: "#dae2fd", ...hanken }}>
                Explore Your Local Community
              </h2>
              <p className="text-base max-w-xl mx-auto" style={{ color: "#cbc3d7" }}>
                Explore a dynamic landscape of opportunities, from local workshops to collaborative
                networks, all designed to strengthen your neighborhood's heartbeat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="mcn-glass p-8 rounded-xl flex flex-col"
                    style={glassCardStyle}
                  >
                    <div
                      className="w-14 h-14 rounded-lg flex items-center justify-center mb-6"
                      style={{ background: f.bg }}
                    >
                      <Icon className="h-8 w-8" style={{ color: f.color }} />
                    </div>
                    <h3
                      className="text-2xl font-semibold mb-4"
                      style={{ color: "#dae2fd", ...hanken }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-base flex-grow leading-relaxed" style={{ color: "#cbc3d7" }}>
                      {f.desc}
                    </p>
                    <Link
                      to={f.actionTo}
                      search={f.actionSearch}
                      className="mt-6 flex items-center gap-2 font-bold group w-fit"
                      style={{ color: f.color }}
                    >
                      <span>{f.action}</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="py-16 px-6 overflow-hidden relative"
          style={{ backgroundColor: "#131b2e" }}
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 relative z-10">
            <div className="flex-1 text-left">
              <h2
                className="font-bold mb-6"
                style={{
                  ...hanken,
                  fontSize: "clamp(28px,5vw,40px)",
                  lineHeight: 1.2,
                  color: "#dae2fd",
                }}
              >
                Ready to make your neighborhood <span style={{ color: "#4fdbc8" }}>stronger</span>?
              </h2>
              <p className="text-lg mb-10 max-w-xl leading-relaxed" style={{ color: "#cbc3d7" }}>
                Join our growing community and help us build a more connected world, one block at a
                time.
              </p>
              <div className="flex items-center gap-6 flex-wrap">
                <Link
                  to="/login"
                  search={{ tab: "signup" } as any}
                  className="px-8 py-4 rounded-xl font-bold text-base transition-all hover:brightness-110"
                  style={{ backgroundColor: "#dae2fd", color: "#0b1326" }}
                >
                  Get Started Free
                </Link>
                {/* Explore Local Groups — not yet built, intentionally 404 */}
                <a
                  href={`${import.meta.env.BASE_URL}explore-local-groups`}
                  className="font-bold text-base transition-all hover:text-white pb-1"
                  style={{ color: "#dae2fd", borderBottom: "1px solid rgba(218,226,253,0.3)" }}
                >
                  Explore Local Groups
                </a>
              </div>
            </div>

            <div className="flex-1 w-full">
              <div
                className="rounded-2xl overflow-hidden relative"
                style={{
                  aspectRatio: "16/9",
                  ...glassCardStyle,
                  border: "1px solid rgba(73,68,84,0.5)",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  className="w-full h-full bg-cover bg-center opacity-60"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCdhAMJzZlC9IMT2naY2kmjIMvzBgmzmpy8tSrqzotYeXssLnDzIRy9s4TeMEYoSp1lzhPtFQaBzZfbSrUEUQh8novmnibblIfLHBolNBVUUVzOnp96MtnirHVPNgUa6NazFMSBx33dR8FXhPl0AtWZkzsozFREn8OVP7FFopZVyMicM4ZT8qld6pj4cOun2V2Kq-SNaVLOyDVCXN7OaLWD3qLXGKHxIXUQCse91SoWKeNDrNNjqRcTQiMtO0bxIU3GsK2bn5ULGw')",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, #0b1326, transparent)" }}
                />
                <div
                  className="absolute bottom-4 left-4 right-4 p-4 rounded-lg flex items-center justify-between"
                  style={{
                    background: "rgba(11,19,38,0.85)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(73,68,84,0.5)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(160,120,255,0.2)" }}
                    >
                      <Users className="h-5 w-5" style={{ color: "#d0bcff" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#dae2fd", ...mono }}>
                        Community Hub
                      </p>
                      <p className="text-xs" style={{ color: "#cbc3d7" }}>
                        42 Active Local Events
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/login"
                    search={{ tab: "signup" } as any}
                    className="text-sm font-bold px-4 py-2 rounded-lg transition-all hover:bg-white/10"
                    style={{ color: "#d0bcff", border: "1px solid rgba(160,120,255,0.3)" }}
                  >
                    Join Room
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
