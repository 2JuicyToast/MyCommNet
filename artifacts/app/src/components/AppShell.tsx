import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Map,
  Users,
  MessageSquare,
  User,
  Search,
  Bell,
  Sparkles,
  Settings,
  Bookmark,
  LogOut,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

const navItems: { to: string; label: string; icon: typeof Home; badge?: number }[] = [
  { to: "/main", label: "Home", icon: Home },
  { to: "/map", label: "Map", icon: Map },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare, badge: 3 },
  { to: "/profile", label: "Profile", icon: User },
];

function parseLocationDisplay(stored: string): string {
  const parts = stored.split("|");
  if (parts.length === 4) {
    const [city, state] = parts;
    return [city, state].filter(Boolean).join(", ");
  }
  return stored;
}

export function AppShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { location } = useRouterState();
  const path = location.pathname;
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [headerLocation, setHeaderLocation] = useState<string>("");
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/restricted" });
    }
  }, [user, loading, navigate]);

  // Load location from user_preferences
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_preferences")
      .select("zip_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.zip_code) setHeaderLocation(parseLocationDisplay(data.zip_code));
      });
  }, [user]);

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  const displayName =
    profile?.full_name?.split(" ")[0] ??
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "You";

  const initial = displayName.charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", search: { tab: "signin" } });
  }

  // Build notifications list
  const notifications: { id: string; icon: typeof Bell; title: string; body: string; to: string }[] = [];
  if (!profile?.onboarding_complete) {
    notifications.push({
      id: "onboarding",
      icon: SlidersHorizontal,
      title: "Complete your profile setup",
      body: "Take the survey to get personalised recommendations.",
      to: "/onboarding",
    });
  }
  const notifCount = notifications.length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
          <Link to="/main" className="flex items-center gap-2">
            <img
              src={logoSrc}
              alt="MyCommNet Logo"
              className="h-9 w-9 rounded-full object-cover"
              style={{ boxShadow: "0 0 10px rgba(160,120,255,0.45)" }}
            />
            <span className="font-display text-lg font-bold tracking-tight">
              <span className="text-brand-purple">My</span>
              <span className="text-brand-blue">Comm</span>
              <span className="text-brand-teal">Net</span>
            </span>
          </Link>

          {headerLocation && (
            <div className="ml-2 hidden items-center gap-1 rounded-full bg-surface/70 px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <span className="h-2 w-2 rounded-full bg-brand-teal" />
              {headerLocation}
            </div>
          )}

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {navItems.map((it) => {
              const Icon = it.icon;
              const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-surface text-foreground shadow-card-soft"
                      : "text-muted-foreground hover:bg-surface/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                  {it.badge && (
                    <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-purple px-1.5 text-[10px] font-semibold text-white">
                      {it.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button className="hidden h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground sm:grid">
              <Search className="h-5 w-5" />
            </button>

            {/* Notification bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                {notifCount > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#a078ff,#0566d9)" }}
                  >
                    {notifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl shadow-2xl"
                  style={{
                    background: "rgba(11,19,38,0.97)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {notifCount} new
                      </span>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      You're all caught up! 🎉
                    </div>
                  ) : (
                    <ul>
                      {notifications.map((n) => {
                        const Icon = n.icon;
                        return (
                          <li key={n.id}>
                            <Link
                              to={n.to}
                              onClick={() => setNotifOpen(false)}
                              className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/5"
                            >
                              <span
                                className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg"
                                style={{ background: "rgba(160,120,255,0.15)" }}
                              >
                                <Icon className="h-4 w-4 text-brand-purple" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-foreground">{n.title}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="group relative">
              <button className="flex items-center gap-2 rounded-full bg-surface p-1 pr-3">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-sm font-semibold text-white">
                    {initial}
                  </span>
                )}
                <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
              </button>
              <div className="invisible absolute right-0 top-full mt-1 w-36 origin-top-right scale-95 rounded-xl border border-border/60 bg-surface p-1 opacity-0 shadow-card-soft transition group-hover:visible group-hover:scale-100 group-hover:opacity-100">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
        {children}
      </main>

      {footer}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {navItems.map((it) => {
            const Icon = it.icon;
            const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`relative grid h-8 w-12 place-items-center rounded-lg ${active ? "bg-gradient-brand-soft" : ""}`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-brand-teal" : ""}`} />
                  {it.badge && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-purple px-1 text-[9px] font-semibold text-white">
                      {it.badge}
                    </span>
                  )}
                </span>
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" />
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
      {action}
    </div>
  );
}

export function QuickLinks() {
  return (
    <div className="hidden flex-col gap-1 rounded-2xl bg-surface/60 p-3 text-sm xl:flex">
      <SidebarLink icon={Bookmark} label="Saved" />
      <SidebarLink icon={Sparkles} label="My Activity" />
      <SidebarLink icon={Settings} label="Settings" />
    </div>
  );
}

function SidebarLink({ icon: Icon, label }: { icon: typeof Bookmark; label: string }) {
  return (
    <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
