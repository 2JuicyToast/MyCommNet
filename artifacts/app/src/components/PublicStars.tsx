import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";

export function PublicStars() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const colors = ["#d0bcff", "#adc6ff", "#4fdbc8"];
    const count = Math.floor(Math.random() * 21) + 40;
    const nodes: HTMLDivElement[] = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      const size = Math.random() * 6 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const dur = (Math.random() * 2.5 + 1.5).toFixed(2);
      const delay = (Math.random() * 5).toFixed(2);
      Object.assign(el.style, {
        position: "absolute",
        borderRadius: "50%",
        pointerEvents: "none",
        width: `${size}px`,
        height: `${size}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        backgroundColor: color,
        boxShadow: `0 0 ${size * 3}px ${color}, 0 0 ${size * 5}px ${color}88`,
        animation: `mcn-twinkle ${dur}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      });
      container.appendChild(el);
      nodes.push(el);
    }
    return () => nodes.forEach((n) => n.remove());
  }, []);

  return (
    <>
      <style>{`
        @keyframes mcn-twinkle {
          0%,100% { opacity:0.2; transform:scale(0.8); filter:blur(1px) brightness(0.8); }
          50% { opacity:1; transform:scale(1.5); filter:blur(0px) brightness(2); }
        }
        .mcn-glass:hover {
          background: rgba(15,23,42,0.85) !important;
          border-color: rgba(208,188,255,0.3) !important;
          transform: translateY(-4px);
        }
      `}</style>
      <div
        ref={ref}
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 1 }}
      />
    </>
  );
}

export function PublicFooter() {
  const hanken = { fontFamily: "'Hanken Grotesk', sans-serif" };
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  return (
    <footer
      className="py-8 px-6"
      style={{
        borderTop: "1px solid #1e293b",
        backgroundColor: "#0f172a",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <Link
            to="/"
            className="font-bold text-base hover:underline"
            style={{ color: "#dae2fd", ...hanken }}
          >
            MyCommNet
          </Link>
          <p className="text-sm mt-0.5" style={{ color: "#cbc3d7" }}>
            Stay Connected
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          {[
            { label: "Privacy Policy", to: "/privacy-policy" },
            { label: "Terms of Service", to: "/terms-of-service" },
            { label: "Help Center", to: "/help-center" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.to}
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
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
