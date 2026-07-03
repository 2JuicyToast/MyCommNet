import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Rocket, Search } from "lucide-react";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../hooks/useAuth";
import { PublicNav } from "../components/PublicNav";

function NotFoundComponent() {
  const starFieldRef = useRef<HTMLDivElement>(null);
  const nebula1Ref = useRef<HTMLDivElement>(null);
  const nebula2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      const intensity = 15;
      if (starFieldRef.current)
        starFieldRef.current.style.transform = `translate(${x * intensity}px, ${y * intensity}px)`;
      if (nebula1Ref.current)
        nebula1Ref.current.style.transform = `translate(${x * intensity * 0.6}px, ${y * intensity * 0.6}px)`;
      if (nebula2Ref.current)
        nebula2Ref.current.style.transform = `translate(${x * intensity * 1.2}px, ${y * intensity * 1.2}px)`;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: "#020617", color: "#dae2fd", overflowX: "hidden" }}
    >
      <PublicNav />

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center relative overflow-hidden px-6 py-24 pt-[calc(72px+6rem)]">
        {/* Background */}
        <div
          ref={starFieldRef}
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: -1,
            background: "radial-gradient(circle at 50% 50%, #0b1326 0%, #020617 100%)",
            transition: "transform 0.1s ease-out",
          }}
        />
        <div
          ref={nebula1Ref}
          className="absolute pointer-events-none"
          style={{
            top: -200,
            right: -200,
            width: 800,
            height: 800,
            borderRadius: "50%",
            filter: "blur(120px)",
            opacity: 0.15,
            background: "radial-gradient(circle, #a078ff, transparent)",
            zIndex: 0,
            transition: "transform 0.1s ease-out",
          }}
        />
        <div
          ref={nebula2Ref}
          className="absolute pointer-events-none"
          style={{
            bottom: -200,
            left: -200,
            width: 800,
            height: 800,
            borderRadius: "50%",
            filter: "blur(120px)",
            opacity: 0.15,
            background: "radial-gradient(circle, #0566d9, transparent)",
            zIndex: 0,
            transition: "transform 0.1s ease-out",
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center max-w-2xl mx-auto flex flex-col items-center">
          {/* 404 with orbiting dot */}
          <div
            className="relative mb-8 flex items-center justify-center"
            style={{ padding: "24px 0" }}
          >
            <style>{`
              @keyframes orbit404 {
                from { transform: rotate(0deg) translateX(130px) rotate(0deg); }
                to   { transform: rotate(360deg) translateX(130px) rotate(-360deg); }
              }
              .orbit-dot-404 {
                position: absolute;
                top: 50%; left: 50%;
                width: 11px; height: 11px;
                margin-top: -5.5px; margin-left: -5.5px;
                border-radius: 50%;
                background: #4fdbc8;
                box-shadow: 0 0 8px #4fdbc8, 0 0 18px rgba(79,219,200,0.7), 0 0 3px #fff;
                animation: orbit404 3.5s linear infinite;
                pointer-events: none;
              }
            `}</style>
            <div className="orbit-dot-404" />
            <h1
              className="font-black select-none leading-none"
              style={{
                fontSize: "clamp(100px,18vw,180px)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.02em",
                background: "linear-gradient(135deg, #d0bcff 0%, #adc6ff 50%, #4fdbc8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 15px rgba(208,188,255,0.3))",
              }}
            >
              404
            </h1>
          </div>

          {/* Glass card */}
          <div
            className="p-8 rounded-xl max-w-lg w-full"
            style={{
              background: "rgba(15,23,42,0.6)",
              backdropFilter: "blur(16px)",
              border: "1px solid #1e293b",
            }}
          >
            <h2
              className="text-2xl font-bold mb-4"
              style={{ color: "#dae2fd", fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              Lost in the Cosmos?
            </h2>
            <p className="text-base mb-8 leading-relaxed" style={{ color: "#cbc3d7" }}>
              The page you're looking for is too far out, or has drifted out of orbit. Let's get you
              back to the community.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-8 h-11 rounded-lg font-bold text-sm transition-all"
              style={{
                background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)",
                boxShadow: "0 4px 15px rgba(160,120,255,0.3)",
                color: "#fff",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.filter = "brightness(1.1)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.filter = "";
                (e.currentTarget as HTMLAnchorElement).style.transform = "";
              }}
            >
              <Rocket size={18} />
              Return to Base
            </Link>
          </div>

          {/* Search */}
          <div className="mt-12 flex flex-col items-center gap-4 w-full max-w-md">
            <p className="text-xs uppercase tracking-widest" style={{ color: "#cbc3d7", ...mono }}>
              Or try searching
            </p>
            <div className="relative w-full">
              <input
                className="w-full h-11 rounded-lg px-12 outline-none text-sm transition-all"
                placeholder="Find groups or discussions..."
                type="text"
                style={{ background: "#060e20", border: "1px solid #1e293b", color: "#dae2fd" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#4fdbc8";
                  e.currentTarget.style.boxShadow = "0 0 0 1px #4fdbc8";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1e293b";
                  e.currentTarget.style.boxShadow = "";
                }}
              />
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: "#958ea0" }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-8 px-6 mt-auto"
        style={{ borderTop: "1px solid #1e293b", backgroundColor: "#0f172a" }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 max-w-7xl mx-auto">
          <div>
            <p
              className="font-bold text-base"
              style={{ color: "#dae2fd", fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              MyCommNet
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#cbc3d7" }}>
              Stay Connected
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            {["Privacy Policy", "Terms of Service", "Help Center"].map((l) => (
              <a
                key={l}
                href={`/${l.toLowerCase().replace(/ /g, "-")}`}
                style={{
                  color: "#cbc3d7",
                  ...mono,
                  display: "inline-block",
                  cursor: "pointer",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  padding: "6px 0",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#cbc3d7")}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
