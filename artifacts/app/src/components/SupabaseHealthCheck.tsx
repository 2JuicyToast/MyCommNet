import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function SupabaseHealthCheck() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { error } = await supabase.from("profiles").select("id").limit(1);
        if (cancelled) return;
        if (error && !/permission|policy|row-level/i.test(error.message ?? "")) {
          setStatus("down");
        } else {
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("down");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status !== "down" || dismissed) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-2.5 text-sm"
      style={{
        background: "rgba(147,0,10,0.92)",
        color: "#ffe4e1",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>
        We're having trouble connecting to our servers right now. Some features may not work — please try
        refreshing in a moment.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-2 rounded-full p-0.5 hover:bg-white/10 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
