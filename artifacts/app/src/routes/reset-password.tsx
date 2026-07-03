import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Check, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

const logoSrc = "/logo.png";
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const inputBase: React.CSSProperties = {
  background: "#0b1326",
  border: "1px solid #1e293b",
  color: "#dae2fd",
  transition: "border-color 0.2s, box-shadow 0.2s",
  outline: "none",
};
const inputFocus: React.CSSProperties = {
  borderColor: "#4fdbc8",
  boxShadow: "0 0 0 1px #4fdbc8",
};

type Requirement = { label: string; met: boolean };

function getPasswordRequirements(pw: string): Requirement[] {
  return [
    { label: "At least 8 characters", met: pw.length >= 8 },
    { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(pw) },
    { label: "One number (0–9)", met: /[0-9]/.test(pw) },
    { label: "One special character (!@#…)", met: /[^A-Za-z0-9]/.test(pw) },
  ];
}

function getStrength(reqs: Requirement[]): number {
  return reqs.filter((r) => r.met).length;
}

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["", "#ef4444", "#f97316", "#eab308", "#4fdbc8"];

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    let settled = false;

    function markReady() {
      if (settled) return;
      settled = true;
      setSessionReady(true);
    }

    function markError() {
      if (settled) return;
      settled = true;
      setSessionError(true);
    }

    // 1. Subscribe FIRST so we never miss the PASSWORD_RECOVERY event,
    //    even if Supabase fires it synchronously during code exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          markReady();
        }
        // SIGNED_IN also fires after a successful PKCE exchange in some versions
        if (event === "SIGNED_IN" && session && !settled) {
          // Only treat as ready if we came here via a recovery link
          const url = new URL(window.location.href);
          if (url.searchParams.has("code") || url.hash.includes("type=recovery")) {
            markReady();
          }
        }
      },
    );

    // 2. Inspect the URL to decide whether to wait or fail fast.
    const url = new URL(window.location.href);
    const hasPkceCode = url.searchParams.has("code");
    const hasHashToken =
      url.hash.includes("access_token") && url.hash.includes("type=recovery");

    if (!hasPkceCode && !hasHashToken) {
      // Not a recovery link — show the error state immediately.
      markError();
      subscription.unsubscribe();
      return;
    }

    // 3. Check whether Supabase already exchanged the code before we mounted.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
      // else: wait for PASSWORD_RECOVERY via onAuthStateChange above
    });

    // 4. Safety timeout — if the event never arrives, tell the user.
    const timer = setTimeout(markError, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const pwReqs = getPasswordRequirements(password);
  const strength = getStrength(pwReqs);
  const showStrength = password.length > 0;
  const passwordsMatch = password === confirm && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (strength < 4) {
      setErrorMsg("Please meet all password requirements before continuing.");
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
    } else {
      setSuccessMsg("Your password has been updated successfully.");
      setTimeout(() => navigate({ to: "/login" }), 2500);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ backgroundColor: "#020617", color: "#dae2fd", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <header
        className="flex justify-between items-center px-6 w-full z-50 h-[72px] sticky top-0 shadow-sm"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt="MyCommNet Logo"
            className="h-10 w-10 rounded-full object-cover"
            style={{ boxShadow: "0 0 12px rgba(160,120,255,0.5)" }}
          />
          <span className="text-xl font-black tracking-tight">
            <span style={{ color: "#a078ff" }}>My</span>
            <span style={{ color: "#0566d9" }}>Comm</span>
            <span style={{ color: "#4fdbc8" }}>Net</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {["Home", "About", "Features"].map((l) => (
            <Link
              key={l}
              to={l === "Home" ? "/" : (`/${l.toLowerCase()}` as any)}
              className="text-sm transition-colors hover:text-white"
              style={{ color: "#cbc3d7" }}
            >
              {l}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center p-6 relative">
        {/* Atmospheric glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-48 -right-48 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: "rgba(160,120,255,0.1)" }}
          />
          <div
            className="absolute -bottom-48 -left-48 w-96 h-96 rounded-full blur-[120px]"
            style={{ background: "rgba(5,102,217,0.1)" }}
          />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-[32px] leading-10 font-bold mb-2"
              style={{ color: "#dae2fd", fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              Reset Password
            </h1>
            <p className="text-base" style={{ color: "#cbc3d7" }}>
              Choose a strong new password for your account.
            </p>
          </div>

          {/* Glass card */}
          <div
            className="rounded-xl p-8"
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Session error — link expired or missing */}
            {sessionError && (
              <div className="text-center space-y-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "rgba(147,0,10,0.15)" }}
                >
                  <X className="h-7 w-7" style={{ color: "#ffb4ab" }} />
                </div>
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{
                    background: "rgba(147,0,10,0.2)",
                    color: "#ffb4ab",
                    border: "1px solid rgba(147,0,10,0.4)",
                  }}
                >
                  This reset link is invalid or has expired. Please request a new one.
                </div>
                <Link
                  to="/forgot-password"
                  className="block w-full h-11 rounded-lg font-bold text-sm flex items-center justify-center transition-all hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)",
                    color: "#ffffff",
                  }}
                >
                  Request New Link
                </Link>
              </div>
            )}

            {/* Success state */}
            {successMsg && (
              <div className="text-center space-y-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "rgba(79,219,200,0.15)" }}
                >
                  <ShieldCheck className="h-7 w-7" style={{ color: "#4fdbc8" }} />
                </div>
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{
                    background: "rgba(79,219,200,0.1)",
                    color: "#4fdbc8",
                    border: "1px solid rgba(79,219,200,0.3)",
                  }}
                >
                  {successMsg}
                </div>
                <Link
                  to="/login"
                  className="block w-full h-11 rounded-lg font-bold text-sm flex items-center justify-center transition-all hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)",
                    color: "#ffffff",
                  }}
                >
                  Go to Sign In
                </Link>
                <p className="text-xs" style={{ color: "#958ea0" }}>
                  Redirecting automatically…
                </p>
              </div>
            )}

            {/* Loading — waiting for session */}
            {!sessionReady && !sessionError && !successMsg && (
              <div className="text-center py-6">
                <div
                  className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                  style={{ borderColor: "#a078ff", borderTopColor: "transparent" }}
                />
                <p className="mt-4 text-sm" style={{ color: "#cbc3d7" }}>
                  Verifying your reset link…
                </p>
              </div>
            )}

            {/* Form */}
            {sessionReady && !successMsg && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New password */}
                <div>
                  <label
                    className="block text-xs uppercase tracking-widest mb-1.5"
                    style={{
                      color: passwordFocused ? "#4fdbc8" : "#cbc3d7",
                      transition: "color 0.2s",
                      ...mono,
                    }}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors"
                      style={{ color: passwordFocused ? "#4fdbc8" : "#958ea0" }}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-12 pr-12 rounded-lg text-sm"
                      style={{ ...inputBase, ...(passwordFocused ? inputFocus : {}) }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                      style={{ color: "#958ea0" }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {showStrength && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 flex-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{
                                background: i <= strength ? strengthColors[strength] : "#1e293b",
                              }}
                            />
                          ))}
                        </div>
                        <span
                          className="text-xs font-medium w-12 text-right transition-colors"
                          style={{ color: strengthColors[strength], ...mono }}
                        >
                          {strengthLabels[strength]}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {pwReqs.map((req) => (
                          <div key={req.label} className="flex items-center gap-2">
                            <span
                              className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{
                                background: req.met
                                  ? "rgba(79,219,200,0.15)"
                                  : "rgba(255,255,255,0.05)",
                              }}
                            >
                              {req.met ? (
                                <Check className="h-2.5 w-2.5" style={{ color: "#4fdbc8" }} />
                              ) : (
                                <X className="h-2.5 w-2.5" style={{ color: "#958ea0" }} />
                              )}
                            </span>
                            <span
                              className="text-xs"
                              style={{
                                color: req.met ? "#4fdbc8" : "#958ea0",
                                transition: "color 0.2s",
                              }}
                            >
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    className="block text-xs uppercase tracking-widest mb-1.5"
                    style={{
                      color: confirmFocused ? "#4fdbc8" : "#cbc3d7",
                      transition: "color 0.2s",
                      ...mono,
                    }}
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors"
                      style={{ color: confirmFocused ? "#4fdbc8" : "#958ea0" }}
                    />
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-12 pr-12 rounded-lg text-sm"
                      style={{
                        ...inputBase,
                        ...(confirmFocused ? inputFocus : {}),
                        ...(confirm.length > 0
                          ? {
                              borderColor: passwordsMatch ? "#4fdbc8" : "#ef4444",
                              boxShadow: passwordsMatch
                                ? "0 0 0 1px #4fdbc8"
                                : "0 0 0 1px #ef4444",
                            }
                          : {}),
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                      style={{ color: "#958ea0" }}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && (
                    <p
                      className="mt-1.5 text-xs"
                      style={{ color: passwordsMatch ? "#4fdbc8" : "#ef4444" }}
                    >
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                {errorMsg && (
                  <div
                    className="rounded-lg px-4 py-2.5 text-xs"
                    style={{
                      background: "rgba(147,0,10,0.2)",
                      color: "#ffb4ab",
                      border: "1px solid rgba(147,0,10,0.4)",
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)",
                    color: "#ffffff",
                  }}
                >
                  {submitting ? "Updating…" : "Set New Password"}
                  {!submitting && <ShieldCheck className="h-4 w-4" />}
                </button>

                <div className="pt-4 text-center" style={{ borderTop: "1px solid #1e293b" }}>
                  <Link
                    to="/login"
                    className="text-sm font-bold hover:underline"
                    style={{ color: "#adc6ff" }}
                  >
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
