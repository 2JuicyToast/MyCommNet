import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

type ActivePage = "home" | "about" | "features";

export function PublicNav({ activePage }: { activePage?: ActivePage }) {
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const hanken = { fontFamily: "'Hanken Grotesk', sans-serif" };
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const isLoggedIn = !loading && !!user;

  const displayName =
    profile?.full_name?.split(" ")[0] ??
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "You";

  const initial = displayName.charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  const navLink = (label: string, page: ActivePage, to: string) => {
    const isActive = activePage === page;
    return (
      <Link
        to={to as any}
        className="text-sm transition-colors"
        style={{
          color: isActive ? "#d0bcff" : "#cbc3d7",
          fontWeight: isActive ? 700 : 500,
          borderBottom: isActive ? "2px solid #d0bcff" : "2px solid transparent",
          paddingBottom: 4,
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-[72px] backdrop-blur-lg"
      style={{
        backgroundColor: "rgba(11,19,38,0.85)",
        borderBottom: "1px solid rgba(30,41,59,0.8)",
      }}
    >
      {/* Logo — links to /main if logged in, / if logged out */}
      <Link to={isLoggedIn ? "/main" : "/"} className="flex items-center gap-3">
        <img
          src={logoSrc}
          alt="MyCommNet Logo"
          className="h-10 w-10 rounded-full object-cover"
          style={{ boxShadow: "0 0 12px rgba(160,120,255,0.5)" }}
        />
        <span className="text-xl font-black tracking-tight" style={hanken}>
          <span style={{ color: "#a078ff" }}>My</span>
          <span style={{ color: "#0566d9" }}>Comm</span>
          <span style={{ color: "#4fdbc8" }}>Net</span>
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {navLink("Home", "home", "/")}
        {navLink("About", "about", "/about")}
        {navLink("Features", "features", "/features")}
      </div>

      {/* Right side: profile when logged in, login/signup when logged out */}
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <div className="group relative">
            <button
              className="flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#8b5cf6,#3b82f6)" }}
                >
                  {initial}
                </span>
              )}
              <span className="hidden sm:inline text-sm font-medium" style={{ color: "#dae2fd" }}>
                {displayName}
              </span>
            </button>
            <div
              className="invisible absolute right-0 top-full mt-1 w-40 origin-top-right scale-95 rounded-xl p-1 opacity-0 shadow-lg transition group-hover:visible group-hover:scale-100 group-hover:opacity-100"
              style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Link
                to="/main"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-white/10"
                style={{ color: "#cbc3d7" }}
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-white/10"
                style={{ color: "#cbc3d7" }}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <>
            <Link
              to="/login"
              search={{ tab: "signin" }}
              className="px-4 py-2 rounded-lg text-sm transition-all hover:text-white"
              style={{ color: "#cbc3d7", border: "1px solid transparent" }}
            >
              Log In
            </Link>
            <Link
              to="/login"
              search={{ tab: "signup" } as any}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
              style={{
                background: "#a078ff",
                color: "#23005c",
                boxShadow: "0 4px 12px rgba(160,120,255,0.3)",
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
