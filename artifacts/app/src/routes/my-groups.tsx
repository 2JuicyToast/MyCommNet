import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Heart,
  Users,
  Search,
  ArrowLeft,
  Loader2,
  Check,
  AlertTriangle,
  ExternalLink,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/my-groups")({
  head: () => ({
    meta: [
      { title: "My Joined Groups — MyCommNet" },
      { name: "description", content: "View and manage the community groups you have joined on MyCommNet." },
    ],
  }),
  component: MyGroupsPage,
});

type JoinedGroup = {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  joinedAt: string;
};

export function MyGroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null);

  async function loadJoinedGroups() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Query the authenticated user's actual memberships
      const { data: memberRows, error: memberErr } = await supabase
        .from("group_memberships")
        .select("group_id, created_at")
        .eq("user_id", user.id);

      if (memberErr) throw memberErr;

      if (!memberRows || memberRows.length === 0) {
        setJoinedGroups([]);
        setLoading(false);
        return;
      }

      const groupIds = memberRows.map((r) => r.group_id);

      // 2. Query community_groups details
      const { data: groupRows, error: gErr } = await supabase
        .from("community_groups")
        .select("id, name, description, category")
        .in("id", groupIds);

      if (gErr) throw gErr;

      // 3. Count total members for each group securely
      const counts: Record<string, number> = {};
      try {
        const { data: rpcCounts, error: rpcErr } = await supabase.rpc("get_group_member_counts");
        if (!rpcErr && Array.isArray(rpcCounts)) {
          for (const row of rpcCounts as { group_id: string; member_count: number | string }[]) {
            if (row.group_id) {
              counts[row.group_id] = Number(row.member_count) || 0;
            }
          }
        } else {
          const { data: allMemberships } = await supabase
            .from("group_memberships")
            .select("group_id");

          if (allMemberships) {
            for (const row of allMemberships as { group_id: string }[]) {
              counts[row.group_id] = (counts[row.group_id] || 0) + 1;
            }
          }
        }
      } catch {
        // Fallback gracefully
      }

      // Map joined groups list
      const groupsMap = new Map<string, any>();
      if (groupRows) {
        for (const g of groupRows) {
          groupsMap.set(g.id, g);
        }
      }

      const mapped: JoinedGroup[] = memberRows.map((m) => {
        const details = groupsMap.get(m.group_id);
        return {
          id: m.group_id,
          name: details?.name || "Community Group",
          description: details?.description || "A verified community peer group on MyCommNet.",
          category: details?.category || "Community",
          memberCount: counts[m.group_id] || 1,
          joinedAt: m.created_at,
        };
      });

      setJoinedGroups(mapped);
    } catch (err: any) {
      console.warn("Error loading joined groups:", err?.message);
      setError(err?.message ?? "Unable to load joined groups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      void loadJoinedGroups();
    }
  }, [user, authLoading]);

  // Handle leave group action
  async function handleLeaveGroup(groupId: string) {
    if (!user) return;
    setLeavingGroupId(groupId);

    try {
      const { error: leaveErr } = await supabase
        .from("group_memberships")
        .delete()
        .eq("user_id", user.id)
        .eq("group_id", groupId);

      if (leaveErr) throw leaveErr;

      // Remove from local list
      setJoinedGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err: any) {
      console.error("Failed to leave group:", err);
      alert(err?.message ?? "Failed to leave group.");
    } finally {
      setLeavingGroupId(null);
    }
  }

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return joinedGroups;
    return joinedGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
    );
  }, [joinedGroups, searchQuery]);

  return (
    <AppShell>
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/profile" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Groups Joined</span>
      </div>

      <PageHeader
        title="Groups Joined"
        subtitle="Organizations, student clubs, and local volunteer networks you have actively joined."
      />

      <div className="space-y-6">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-surface p-12 text-sm text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            <span>Loading memberships…</span>
          </div>
        ) : !user ? (
          <div className="rounded-3xl border border-border/60 bg-surface p-10 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
            <h2 className="font-display text-xl font-bold">Sign in to view your groups</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Sign in with your MyCommNet account to access the groups and communities you belong to.
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
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface p-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-brand-teal" />
                <span className="font-display font-semibold text-base">Your Active Memberships</span>
                <span className="rounded-full bg-brand-purple/20 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
                  {joinedGroups.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter your groups…"
                    className="h-9 w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-brand-teal transition-colors"
                  />
                </div>
                <Link
                  to="/groups"
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3.5 py-2 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95 transition"
                >
                  Explore Catalog
                </Link>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-xs text-red-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="flex-1">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadJoinedGroups()}
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
                    <div className="h-4 w-32 bg-surface-2 rounded" />
                    <div className="h-3 w-full bg-surface-2 rounded" />
                    <div className="h-3 w-4/5 bg-surface-2 rounded" />
                  </div>
                ))}
              </div>
            ) : joinedGroups.length === 0 ? (
              /* Real Empty State */
              <div className="rounded-3xl border border-border/60 bg-surface p-10 text-center shadow-lg">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-muted-foreground ring-1 ring-border/80 mb-4">
                  <Heart className="h-8 w-8 text-brand-teal/80" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">No Groups Joined Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  You haven't joined any community groups yet. Discover local volunteering networks, youth leadership councils, and tech study groups in the community catalog.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    to="/groups"
                    className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95 transition"
                  >
                    <Heart className="h-3.5 w-3.5" /> Explore Community Groups
                  </Link>
                </div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
                No joined groups match "<span className="font-medium text-foreground">{searchQuery}</span>".
              </div>
            ) : (
              /* Groups Grid */
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map((g) => (
                  <article
                    key={g.id}
                    className="flex flex-col justify-between rounded-2xl border border-border/60 bg-surface p-5 transition-all hover:bg-surface-2/80 hover:border-brand-purple/40 hover:shadow-glow-purple/20"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-brand-purple/15 border border-brand-purple/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-purple">
                          {g.category}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-brand-teal">
                          <Check className="h-3.5 w-3.5" /> Member
                        </span>
                      </div>

                      <h4 className="mt-3 font-display font-semibold text-lg text-foreground">
                        {g.name}
                      </h4>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {g.description}
                      </p>

                      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5 text-brand-teal" />
                        <span>{g.memberCount} active member{g.memberCount === 1 ? "" : "s"}</span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                      <Link
                        to="/groups"
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>View in Catalog</span>
                      </Link>

                      <button
                        type="button"
                        disabled={leavingGroupId === g.id}
                        onClick={() => void handleLeaveGroup(g.id)}
                        className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition disabled:opacity-50"
                        title={`Leave ${g.name}`}
                      >
                        {leavingGroupId === g.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5" />
                        )}
                        <span>Leave</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
