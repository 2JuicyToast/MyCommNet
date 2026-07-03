import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, Eye, EyeOff, LogIn, Check, X, AtSign, RefreshCw, Users, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

const logoSrc = "/logo.png";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  head: () => ({
    meta: [
      { title: "Sign In — MyCommNet" },
      { name: "description", content: "Sign in or create your MyCommNet account." },
    ],
  }),
  component: LoginPage,
});

const COMET_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuApsskkHh1tuHpUa8yO8fn7Wc3Pg23Ebm3QIEhcuitN8k0UMi07akpSEBwfjMi0MxELDaQyFkxWCvkx1mlX9njCE0gNSC6NdHh3lTQBg3rTE6PSOi-7ZpZxz12G7PrDHuPNG5-ttg57IrRAGvqhyKBb6BrZp3KSO5AxudFVQ5Sb8-MtO6mn7S4gdgISlchJMubNoD6e6V3FJUmlYCynm4TTauQpp-iOd6GHqIGRKnv1qf3Ce2b2qthi3-LuX05wYlt-PAfsCzRFYg";

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
const inputError: React.CSSProperties = {
  borderColor: "#ef4444",
  boxShadow: "0 0 0 1px #ef4444",
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

function generateSuggestions(first: string, last: string): string[] {
  const f = first.toLowerCase().replace(/[^a-z0-9]/g, "");
  const l = last.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!f) return [];
  const rand2 = String(Math.floor(Math.random() * 90) + 10);
  const rand3 = String(Math.floor(Math.random() * 900) + 100);
  const suggestions = [
    `${f}${l}`,
    `${f}.${l}`,
    `${f}_${l[0] ?? ""}${rand2}`,
    `${f}${rand3}`,
  ].filter((s) => s.length >= 3 && s.length <= 28);
  return [...new Set(suggestions)].slice(0, 4);
}

function validateUsername(u: string): string | null {
  if (!u) return "Username is required.";
  if (u.length < 3) return "At least 3 characters.";
  if (u.length > 28) return "Maximum 28 characters.";
  if (!/^[a-z0-9._]+$/.test(u)) return "Only lowercase letters, numbers, periods, underscores.";
  if (/^[._]|[._]$/.test(u)) return "Cannot start or end with . or _";
  return null;
}

function LoginPage() {
  const { tab: initialTab } = Route.useSearch();
  const [tab, setTab] = useState<"login" | "signup">(initialTab === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/main" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (tab === "signup" && firstName && lastName) {
      setSuggestions(generateSuggestions(firstName, lastName));
    }
  }, [firstName, lastName, tab]);

  function refreshSuggestions() {
    setSuggestions(generateSuggestions(firstName, lastName));
  }

  function pickSuggestion(s: string) {
    setUsername(s);
    setUsernameErr(null);
    setUsernameTaken(false);
    checkUsernameAvailability(s);
  }

  async function checkUsernameAvailability(u: string) {
    const err = validateUsername(u);
    if (err) { setUsernameErr(err); setUsernameTaken(false); return; }
    setUsernameChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", u)
      .maybeSingle();
    setUsernameChecking(false);
    if (data) {
      setUsernameTaken(true);
      setUsernameErr("Username is already taken.");
    } else {
      setUsernameTaken(false);
      setUsernameErr(null);
    }
  }

  function handleUsernameChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setUsername(clean);
    setUsernameErr(validateUsername(clean));
    setUsernameTaken(false);
    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    if (clean.length >= 3) {
      checkTimeout.current = setTimeout(() => checkUsernameAvailability(clean), 600);
    }
  }

  function switchTab(next: "login" | "signup") {
    setTab(next);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  const pwReqs = getPasswordRequirements(password);
  const strength = getStrength(pwReqs);
  const showStrength = tab === "signup" && password.length > 0;

  const usernameOk = !usernameErr && !usernameTaken && !usernameChecking && username.length >= 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (tab === "signup") {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg("Please enter both your first and last name.");
        return;
      }
      if (!username.trim()) {
        setErrorMsg("Please choose a username.");
        return;
      }
      const uErr = validateUsername(username);
      if (uErr) { setErrorMsg(uErr); return; }
      if (usernameTaken) { setErrorMsg("That username is taken — please choose another."); return; }
      if (strength < 4) {
        setErrorMsg("Please meet all password requirements before continuing.");
        return;
      }
    }

    setSubmitting(true);

    if (tab === "login") {
      const { error } = await signIn(email, password);
      if (error) setErrorMsg(error.message);
      else navigate({ to: "/main" });
    } else {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { error, session } = await signUp(email, password, fullName, username);
      if (error) {
        setErrorMsg(error.message);
      } else if (session) {
        navigate({ to: "/onboarding" });
      } else {
        setSuccessMsg(
          "Account created! Check your email to confirm it, then sign in to complete your profile.",
        );
        setTab("login");
        setFirstName("");
        setLastName("");
        setPassword("");
        setUsername("");
      }
    }
    setSubmitting(false);
  }

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ backgroundColor: "#020617", color: "#dae2fd", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Header ── */}
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

      {/* ── Main ── */}
      <main className="flex-grow flex flex-col lg:flex-row relative">
        {/* Left — Form */}
        <section className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-10 z-10 relative">
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
            <div className="mb-8" style={{ minHeight: '96px' }}>
              <h1
                className="text-[32px] leading-10 font-bold mb-2"
                style={{ color: "#dae2fd", fontFamily: "'Hanken Grotesk', sans-serif" }}
              >
                {tab === "login" ? "Welcome Back" : "Join the Community"}
              </h1>
              <p className="text-base" style={{ color: "#cbc3d7" }}>
                {tab === "login"
                  ? "Enter your credentials to access your community dashboard."
                  : "Connect with local resources, build meaningful networks, and create opportunities."}
              </p>
            </div>

            <div
              className="rounded-xl p-8"
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Tab switcher */}
              <div
                className="relative flex rounded-full p-1 mb-6"
                style={{ background: "rgba(6, 14, 32, 0.8)" }}
              >
                <span
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)",
                    transform: tab === "login" ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    left: 4,
                  }}
                />
                {(["login", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchTab(t)}
                    className="relative flex flex-1 items-center justify-center h-9 rounded-full text-sm font-semibold z-10"
                    style={{ color: tab === t ? "#ffffff" : "#cbc3d7", transition: "color 0.3s ease" }}
                  >
                    {t === "login" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* First + Last name — signup only */}
                {tab === "signup" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#cbc3d7", ...mono }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jayden"
                        className="w-full h-11 px-4 rounded-lg text-sm"
                        style={inputBase}
                        onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
                        onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: "#1e293b", boxShadow: "none" })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#cbc3d7", ...mono }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Smith"
                        className="w-full h-11 px-4 rounded-lg text-sm"
                        style={inputBase}
                        onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
                        onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: "#1e293b", boxShadow: "none" })}
                      />
                    </div>
                  </div>
                )}

                {/* Username — signup only */}
                {tab === "signup" && (
                  <div>
                    <label
                      className="block text-xs uppercase tracking-widest mb-1.5"
                      style={{ color: usernameFocused ? "#4fdbc8" : "#cbc3d7", transition: "color 0.2s", ...mono }}
                    >
                      Username
                    </label>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => pickSuggestion(s)}
                            className="text-xs px-2.5 py-1 rounded-full transition-colors"
                            style={{
                              background: username === s ? "rgba(79,219,200,0.15)" : "rgba(255,255,255,0.05)",
                              border: username === s ? "1px solid rgba(79,219,200,0.5)" : "1px solid #1e293b",
                              color: username === s ? "#4fdbc8" : "#cbc3d7",
                            }}
                          >
                            @{s}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={refreshSuggestions}
                          title="Refresh suggestions"
                          className="text-xs px-2 py-1 rounded-full transition-colors"
                          style={{ border: "1px solid #1e293b", color: "#958ea0" }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <div className="relative">
                      <AtSign
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors"
                        style={{ color: usernameFocused ? "#4fdbc8" : "#958ea0" }}
                      />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        onFocus={() => setUsernameFocused(true)}
                        onBlur={() => setUsernameFocused(false)}
                        placeholder="your_handle"
                        className="w-full h-11 pl-11 pr-10 rounded-lg text-sm"
                        style={{
                          ...inputBase,
                          ...(usernameFocused ? inputFocus : {}),
                          ...(usernameErr ? inputError : {}),
                          ...(usernameOk ? { borderColor: "#4fdbc8", boxShadow: "0 0 0 1px #4fdbc8" } : {}),
                        }}
                      />
                      {/* Status icon */}
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs">
                        {usernameChecking && (
                          <span style={{ color: "#958ea0" }}>…</span>
                        )}
                        {!usernameChecking && usernameOk && (
                          <Check className="h-4 w-4" style={{ color: "#4fdbc8" }} />
                        )}
                        {!usernameChecking && usernameErr && username.length > 0 && (
                          <X className="h-4 w-4" style={{ color: "#ef4444" }} />
                        )}
                      </span>
                    </div>
                    {usernameErr && username.length > 0 && (
                      <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{usernameErr}</p>
                    )}
                    {!usernameErr && usernameOk && (
                      <p className="mt-1 text-xs" style={{ color: "#4fdbc8" }}>@{username} is available!</p>
                    )}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label
                    className="block text-xs uppercase tracking-widest mb-1.5"
                    style={{ color: emailFocused ? "#4fdbc8" : "#cbc3d7", transition: "color 0.2s", ...mono }}
                  >
                    Email {tab === "login" ? "Address" : ""}
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors"
                      style={{ color: emailFocused ? "#4fdbc8" : "#958ea0" }}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="name@example.com"
                      className="w-full h-11 pl-12 pr-4 rounded-lg text-sm"
                      style={{ ...inputBase, ...(emailFocused ? inputFocus : {}) }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      className="block text-xs uppercase tracking-widest"
                      style={{ color: passwordFocused ? "#4fdbc8" : "#cbc3d7", transition: "color 0.2s", ...mono }}
                    >
                      Password
                    </label>
                    {tab === "login" && (
                      <Link
                        to={"/forgot-password" as any}
                        className="text-xs hover:underline"
                        style={{ color: "#4fdbc8" }}
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
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
                      minLength={tab === "signup" ? 8 : 1}
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

                  {showStrength && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 flex-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i <= strength ? strengthColors[strength] : "#1e293b" }}
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
                              style={{ background: req.met ? "rgba(79,219,200,0.15)" : "rgba(255,255,255,0.05)" }}
                            >
                              {req.met
                                ? <Check className="h-2.5 w-2.5" style={{ color: "#4fdbc8" }} />
                                : <X className="h-2.5 w-2.5" style={{ color: "#958ea0" }} />}
                            </span>
                            <span className="text-xs" style={{ color: req.met ? "#4fdbc8" : "#958ea0", transition: "color 0.2s" }}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Remember me — login only */}
                {tab === "login" && (
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="remember" className="w-4 h-4 rounded" style={{ accentColor: "#0566d9" }} />
                    <label htmlFor="remember" className="text-sm cursor-pointer" style={{ color: "#cbc3d7" }}>
                      Remember me for 30 days
                    </label>
                  </div>
                )}

                {errorMsg && (
                  <div className="rounded-lg px-4 py-2.5 text-xs" style={{ background: "rgba(147,0,10,0.2)", color: "#ffb4ab", border: "1px solid rgba(147,0,10,0.4)" }}>
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="rounded-lg px-4 py-2.5 text-xs" style={{ background: "rgba(79,219,200,0.1)", color: "#4fdbc8", border: "1px solid rgba(79,219,200,0.3)" }}>
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)", color: "#ffffff" }}
                >
                  {submitting
                    ? tab === "login" ? "Signing in…" : "Creating account…"
                    : tab === "login" ? "Log In" : "Create Account"}
                  {!submitting && <LogIn className="h-4 w-4" />}
                </button>
              </form>

              {/* OR divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-grow" style={{ background: "#1e293b" }} />
                <span className="text-xs tracking-widest" style={{ color: "#cbc3d7", ...mono }}>OR CONTINUE WITH</span>
                <div className="h-px flex-grow" style={{ background: "#1e293b" }} />
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 h-11 rounded-lg text-sm font-medium transition-colors"
                style={{ border: "1px solid #1e293b", color: "#dae2fd" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#222a3d")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                </svg>
                Google
              </button>

              <div className="mt-6 pt-5 text-center" style={{ borderTop: "1px solid #1e293b" }}>
                <span className="text-sm" style={{ color: "#cbc3d7" }}>
                  {tab === "login" ? "Don't have an account? " : "Already a member? "}
                </span>
                <button
                  type="button"
                  onClick={() => switchTab(tab === "login" ? "signup" : "login")}
                  className="text-sm font-bold hover:underline"
                  style={{ color: "#adc6ff" }}
                >
                  {tab === "login" ? "Create an account" : "Log in instead"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right — Brand visual */}
        <section
          className="hidden lg:flex lg:w-1/2 relative"
          style={{ backgroundColor: "#020617" }}
        >
          {/* Bleed background upward behind the sticky navbar so there's no seam */}
          <div
            className="absolute left-0 right-0 h-[72px] pointer-events-none"
            style={{ top: "-72px", backgroundColor: "#020617" }}
          />

          {/* Glows cover the full section height */}
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

          {/* Sticky wrapper — no fixed height so text is never clipped, no overflow-hidden
              pt-40 aligns the circle with the card on the left (past the heading) */}
          <div className="sticky top-[72px] w-full flex flex-col items-center pt-40 pb-16">
            <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-8">
              <div
                className="absolute w-[120%] h-[120%] rounded-full blur-[150px] opacity-50"
                style={{ background: "rgba(160,120,255,0.05)" }}
              />
              {/* Circle capped so image + text both fit in the viewport window */}
              <div className="relative w-full mx-auto transition-transform duration-700 ease-out hover:scale-[1.02]" style={{ maxWidth: "min(100%, 460px)" }}>
                <div
                  className="rounded-full overflow-hidden aspect-square"
                  style={{ boxShadow: "0 0 80px rgba(160,120,255,0.3)" }}
                >
                  <img
                    alt="Celestial Brand Asset"
                    src={COMET_SRC}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div
                  className="absolute top-10 left-0 px-4 py-2 rounded-lg flex items-center gap-3 animate-bounce"
                  style={{
                    animationDuration: "4s",
                    background: "rgba(15,23,42,0.7)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,163,146,0.2)" }}
                  >
                    <Users className="h-4 w-4" style={{ color: "#4fdbc8" }} />
                  </div>
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-widest"
                      style={{ color: "#cbc3d7", ...mono }}
                    >
                      Community
                    </p>
                    <p className="text-sm font-bold" style={{ color: "#dae2fd" }}>
                      Growing Every Day
                    </p>
                  </div>
                </div>

                <div
                  className="absolute bottom-20 right-0 px-4 py-2 rounded-lg flex items-center gap-3 animate-bounce"
                  style={{
                    animationDuration: "5s",
                    background: "rgba(15,23,42,0.7)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(5,102,217,0.2)" }}
                  >
                    <Zap className="h-4 w-4" style={{ color: "#adc6ff" }} />
                  </div>
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-widest"
                      style={{ color: "#cbc3d7", ...mono }}
                    >
                      Opportunities
                    </p>
                    <p className="text-sm font-bold" style={{ color: "#dae2fd" }}>
                      Personalized for You
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 mb-12 text-center">
                <h2
                  className="text-4xl font-bold mb-4 leading-tight"
                  style={{ letterSpacing: "-0.02em", fontFamily: "'Hanken Grotesk', sans-serif" }}
                >
                  Connect. Access. <br />
                  <span
                    style={{
                      background: "linear-gradient(90deg, #a078ff 0%, #0566d9 50%, #4fdbc8 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Grow—Together.
                  </span>
                </h2>
                <p className="text-base leading-relaxed" style={{ color: "rgba(203,195,215,0.8)" }}>
                  MyCommNet helps you discover local resources, build meaningful connections, and
                  create opportunities that move your community forward.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-8 px-6 mt-auto"
        style={{ borderTop: "1px solid #1e293b", backgroundColor: "#0f172a" }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
          <div className="flex flex-wrap gap-8">
            {["Privacy Policy", "Terms of Service", "Help Center"].map((l) => (
              <Link
                key={l}
                to={`/${l.toLowerCase().replace(/ /g, "-")}` as any}
                className="text-xs transition-colors hover:text-white"
                style={{ color: "#cbc3d7", ...mono }}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
