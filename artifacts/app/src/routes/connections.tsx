import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Search,
  MessageSquare,
  ExternalLink,
  ArrowLeft,
  Loader2,
  UserPlus,
  Shield,
  Heart,
  QrCode,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [
      { title: "My Connections — MyCommNet" },
      { name: "description", content: "View and message your accepted MyCommNet connections." },
    ],
  }),
  component: ConnectionsPage,
});

type ConnectedMember = {
  connectionId: string;
  userId: string;
  fullName: string;
  username: string | null;
  headline: string | null;
  avatarUrl: string | null;
  connectedAt: string;
};

function ConnectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [connections, setConnections] = useState<ConnectedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function loadConnections() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch only accepted connections for the current user
      const { data: connRows, error: connErr } = await supabase
        .from("user_connections")
        .select("id, requester_id, receiver_id, status, created_at")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (connErr) throw connErr;

      if (!connRows || connRows.length === 0) {
        setConnections([]);
        setLoading(false);
        return;
      }

      // 2. Identify the other person's ID for each connection
      const otherUserIds = connRows.map((r) =>
        r.requester_id === user.id ? r.receiver_id : r.requester_id
      );

      // 3. Fetch profile information
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, username, headline, avatar_url")
        .in("id", otherUserIds);

      const profileMap = new Map<string, any>();
      if (!pErr && profiles) {
        for (const p of profiles) {
          profileMap.set(p.id, p);
        }
      }

      // Format connected members list
      const members: ConnectedMember[] = connRows.map((row) => {
        const otherId = row.requester_id === user.id ? row.receiver_id : row.requester_id;
        const prof = profileMap.get(otherId);
        const fallbackUsername = `user${otherId.replace(/-/g, "").slice(0, 8)}`;

        return {
          connectionId: row.id,
          userId: otherId,
          fullName: prof?.full_name || "Community Member",
          username: prof?.username || fallbackUsername,
          headline: prof?.headline || null,
          avatarUrl: prof?.avatar_url || null,
          connectedAt: row.created_at,
        };
      });

      setConnections(members);
    } catch (err: any) {
      console.warn("Error loading connections:", err?.message);
      setError(err?.message ?? "Unable to load connections.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      void loadConnections();
    }
  }, [user, authLoading]);

  // Filter connections by search query
  const filteredConnections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.headline && c.headline.toLowerCase().includes(q))
    );
  }, [connections, searchQuery]);

  return (
    <AppShell>
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/profile" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Connections</span>
      </div>

      <PageHeader
        title="Connections"
        subtitle="Manage and connect with members in your verified community network."
      />

      {/* Main Content */}
      <div className="space-y-6">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-surface p-12 text-sm text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            <span>Loading network…</span>
          </div>
        ) : !user ? (
          <div className="rounded-3xl border border-border/60 bg-surface p-10 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
            <h2 className="font-display text-xl font-bold">Sign in to view your connections</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              You must be signed in to access your private community network and message your connections.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Search and Counts Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-teal" />
                <span className="font-display font-semibold text-base">Accepted Connections</span>
                <span className="rounded-full bg-brand-purple/20 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
                  {connections.length}
                </span>
              </div>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, headline, or @username…"
                  className="h-9 w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-brand-teal transition-colors"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-xs text-red-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="flex-1">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadConnections()}
                  className="font-semibold text-brand-teal hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-border/60 bg-surface p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-surface-2" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 w-28 bg-surface-2 rounded" />
                        <div className="h-3 w-16 bg-surface-2 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : connections.length === 0 ? (
              /* Real Empty State */
              <div className="rounded-3xl border border-border/60 bg-surface p-10 text-center shadow-lg">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-muted-foreground ring-1 ring-border/80 mb-4">
                  <Users className="h-8 w-8 text-brand-teal/80" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">No Connections Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  You haven't accepted any community connections yet. Share your Community Pass QR code or join groups and local volunteer projects to meet members.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95 transition"
                  >
                    <QrCode className="h-3.5 w-3.5" /> View Community Pass
                  </Link>
                  <Link
                    to="/groups"
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-2 transition"
                  >
                    <Heart className="h-3.5 w-3.5 text-brand-teal" /> Explore Community Groups
                  </Link>
                </div>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
                No connections match "<span className="font-medium text-foreground">{searchQuery}</span>".
              </div>
            ) : (
              /* Connection Cards Grid */
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredConnections.map((conn) => {
                  const initial = conn.fullName.charAt(0).toUpperCase();

                  return (
                    <article
                      key={conn.connectionId}
                      className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-surface p-5 transition-all hover:bg-surface-2/80 hover:border-brand-purple/40 hover:shadow-glow-purple/20"
                    >
                      <div>
                        <div className="flex items-start gap-3">
                          {conn.avatarUrl ? (
                            <img
                              src={conn.avatarUrl}
                              alt=""
                              className="h-12 w-12 rounded-xl object-cover ring-2 ring-brand-purple/30 shrink-0"
                            />
                          ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand font-display text-lg font-bold text-white shadow-glow-purple">
                              {initial}
                            </span>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="font-display font-semibold text-base text-foreground truncate">
                              {conn.fullName}
                            </h4>
                            {conn.username && (
                              <p className="text-xs font-medium text-brand-purple truncate">
                                @{conn.username}
                              </p>
                            )}
                            {conn.headline ? (
                              <p className="mt-1 text-xs text-brand-teal font-medium line-clamp-1">
                                {conn.headline}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Community Member
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                        <Link
                          to="/share/$username"
                          params={{ username: conn.username || `user${conn.userId.replace(/-/g, "").slice(0, 8)}` }}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Profile</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            void navigate({
                              to: "/messages",
                              search: { user: conn.userId },
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-gradient-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95 transition active:scale-95"
                          title={`Send message to ${conn.fullName}`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Message</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
