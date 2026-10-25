import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
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

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL(
        `${import.meta.env.BASE_URL}reset-password`,
        window.location.origin,
      ).toString(),
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(
        "Check your inbox — we sent a password reset link to " + email + ".",
      );
    }
    setSubmitting(false);
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
          {/* Back link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm mb-6 transition-colors hover:text-white"
            style={{ color: "#cbc3d7" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-[32px] leading-10 font-bold mb-2"
              style={{ color: "#dae2fd", fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              Forgot Password?
            </h1>
            <p className="text-base" style={{ color: "#cbc3d7" }}>
              Enter your email and we'll send you a link to reset your password.
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
            {successMsg ? (
              /* Success state */
              <div className="text-center space-y-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "rgba(79,219,200,0.15)" }}
                >
                  <Send className="h-7 w-7" style={{ color: "#4fdbc8" }} />
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
                <p className="text-sm" style={{ color: "#cbc3d7" }}>
                  Didn't receive it?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessMsg(null);
                      setEmail("");
                    }}
                    className="font-bold hover:underline"
                    style={{ color: "#adc6ff" }}
                  >
                    Try again
                  </button>
                </p>
                <Link
                  to="/login"
                  className="block w-full h-11 rounded-lg font-bold text-sm flex items-center justify-center transition-all hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)",
                    color: "#ffffff",
                  }}
                >
                  Return to Sign In
                </Link>
              </div>
            ) : (
              /* Form state */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-xs uppercase tracking-widest mb-1.5"
                    style={{
                      color: emailFocused ? "#4fdbc8" : "#cbc3d7",
                      transition: "color 0.2s",
                      ...mono,
                    }}
                  >
                    Email Address
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
                  {submitting ? "Sending…" : "Send Reset Link"}
                  {!submitting && <Send className="h-4 w-4" />}
                </button>

                <div className="pt-4 text-center" style={{ borderTop: "1px solid #1e293b" }}>
                  <span className="text-sm" style={{ color: "#cbc3d7" }}>
                    Remember your password?{" "}
                  </span>
                  <Link
                    to="/login"
                    className="text-sm font-bold hover:underline"
                    style={{ color: "#adc6ff" }}
                  >
                    Sign in
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
