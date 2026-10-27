import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Sparkles,
  Calendar,
  MessageSquare,
  Check,
  Loader2,
  AlertCircle,
  Users,
  LogOut,
  X,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";

export const Route = createFileRoute("/groups")({
  head: () => ({
    meta: [
      { title: "Groups — MyCommNet" },
      {
        name: "description",
        content: "Connect, learn, and grow together. Discover groups & clubs by interest.",
      },
      { property: "og:title", content: "Groups — MyCommNet" },
      {
        property: "og:description",
        content: "Connect, learn, and grow together. Discover groups & clubs by interest.",
      },
    ],
  }),
  component: GroupsPage,
});

export type CommunityGroup = {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  is_active?: boolean | null;
  created_at?: string;
};

// Example discussions for visual preview
const PREVIEW_DISCUSSIONS = [
  {
    title: "Resources for first-time job seekers",
    group: "MentorConnect",
    author: "Maya J.",
    time: "2h ago",
    body: "Hey everyone! I'm putting together a list of local resources and tips for teens and young adults looking for their first job...",
    replies: 12,
  },
  {
    title: "Best study spots in the city",
    group: "Next Chapter Book Club",
    author: "Jordan K.",
    time: "5h ago",
    body: "Where are your go-to quiet spots to study or read? Drop your favorites below 👇",
    replies: 8,
  },
  {
    title: "Volunteer this weekend!",
    group: "Community Changemakers",
    author: "Aisha R.",
    time: "1d ago",
    body: "We're organizing a neighborhood clean-up this Saturday. Join us!",
    replies: 6,
  },
];

function GroupCard({
  group,
  isJoined,
  isBusy,
  memberCount,
  onJoin,
  onPromptLeave,
}: {
  group: CommunityGroup;
  isJoined: boolean;
  isBusy: boolean;
  memberCount?: number;
  onJoin: (group: CommunityGroup) => void;
  onPromptLeave: (group: CommunityGroup) => void;
}) {
  const category = group.category || "Community";
  const description = group.description || "";

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand-purple/40">
      <div>
        <div className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand font-display text-base font-bold text-white shadow-glow-purple">
            {group.name.charAt(0)}
          </span>
          {category && (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {category}
            </span>
          )}
        </div>
        <h3 className="mt-3 font-display text-base font-semibold">{group.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/40">
        <div className="text-xs text-muted-foreground">
          {memberCount !== undefined ? (
            <>
              <span className="font-semibold text-foreground">{memberCount}</span>{" "}
              {memberCount === 1 ? "member" : "members"}
            </>
          ) : (
            <span className="text-muted-foreground/80">Membership active</span>
          )}
        </div>

        {isJoined ? (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-lg border border-brand-teal/40 bg-brand-teal/15 px-2.5 py-1 text-xs font-semibold text-brand-teal">
              <Check className="h-3.5 w-3.5" />
              <span>Joined</span>
            </span>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onPromptLeave(group)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-colors disabled:opacity-50"
              title="Leave group"
            >
              Leave
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onJoin(group)}
            className="flex items-center gap-1 rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95 disabled:opacity-50 transition-all"
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span>Join</span>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

function GroupsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [confirmingLeaveGroup, setConfirmingLeaveGroup] = useState<CommunityGroup | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Load groups from public.community_groups and memberships from public.group_memberships
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch active community groups from database
      const { data: groupData, error: groupErr } = await supabase
        .from("community_groups")
        .select("id, slug, name, description, category, is_active, created_at")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (groupErr) {
        throw new Error(groupErr.message);
      }

      setGroups((groupData as CommunityGroup[]) || []);

      // 2. Fetch aggregate member counts securely via RPC (or fallback) without exposing individual user memberships
      try {
        const { data: rpcCounts, error: rpcErr } = await supabase.rpc("get_group_member_counts");
        if (!rpcErr && Array.isArray(rpcCounts)) {
          const counts: Record<string, number> = {};
          for (const row of rpcCounts as { group_id: string; member_count: number | string }[]) {
            if (row.group_id) {
              counts[row.group_id] = Number(row.member_count) || 0;
            }
          }
          setMemberCounts(counts);
        } else {
          // Fallback: Query group_memberships directly if available under current permissions
          const { data: allMemberships } = await supabase
            .from("group_memberships")
            .select("group_id");

          if (allMemberships && allMemberships.length > 0) {
            const counts: Record<string, number> = {};
            for (const m of allMemberships as { group_id: string }[]) {
              if (m.group_id) {
                counts[m.group_id] = (counts[m.group_id] || 0) + 1;
              }
            }
            setMemberCounts(counts);
          }
        }
      } catch (countErr) {
        console.warn("Note on member count retrieval:", countErr);
      }

      // 3. Fetch authenticated user's active memberships
      if (user) {
        const { data: userMemberships, error: userMemberErr } = await supabase
          .from("group_memberships")
          .select("group_id")
          .eq("user_id", user.id);

        if (userMemberErr) {
          console.error("Error fetching user memberships:", userMemberErr.message);
        } else if (userMemberships) {
          setJoinedGroupIds(
            new Set((userMemberships as { group_id: string }[]).map((m) => m.group_id))
          );
        }
      } else {
        setJoinedGroupIds(new Set());
      }
    } catch (err: any) {
      console.error("Failed to load community groups:", err);
      setError(err?.message ?? "Error loading community groups from database");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  // Handle joining a group
  async function handleJoin(group: CommunityGroup) {
    if (!user) {
      void navigate({ to: "/login", search: { redirect: "/groups" } });
      return;
    }

    if (busyGroupId || joinedGroupIds.has(group.id)) return;

    setBusyGroupId(group.id);
    setActionError(null);

    try {
      const { error: joinErr } = await supabase
        .from("group_memberships")
        .insert({
          user_id: user.id,
          group_id: group.id,
        });

      if (joinErr) throw joinErr;

      setJoinedGroupIds((prev) => new Set([...prev, group.id]));
      setMemberCounts((prev) => ({
        ...prev,
        [group.id]: (prev[group.id] || 0) + 1,
      }));
    } catch (err: any) {
      console.error("Failed to join group:", err);
      setActionError(err?.message ?? "Failed to join group. Please try again.");
    } finally {
      setBusyGroupId(null);
    }
  }

  // Handle confirmed leaving of a group
  async function handleConfirmLeave() {
    if (!user || !confirmingLeaveGroup) return;

    const group = confirmingLeaveGroup;
    setBusyGroupId(group.id);
    setActionError(null);

    try {
      const { error: leaveErr } = await supabase
        .from("group_memberships")
        .delete()
        .eq("user_id", user.id)
        .eq("group_id", group.id);

      if (leaveErr) throw leaveErr;

      setJoinedGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });

      setMemberCounts((prev) => ({
        ...prev,
        [group.id]: Math.max(0, (prev[group.id] || 1) - 1),
      }));

      setConfirmingLeaveGroup(null);
    } catch (err: any) {
      console.error("Failed to leave group:", err);
      setActionError(err?.message ?? "Failed to leave group. Please try again.");
    } finally {
      setBusyGroupId(null);
    }
  }

  // Derive available categories dynamically from loaded database groups
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      const c = g.category;
      if (c) set.add(c);
    }
    return ["All", ...Array.from(set)];
  }, [groups]);

  // Filter groups by category and search query
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const cat = g.category || "Community";
      const matchesCategory =
        selectedCategory === "All" || cat.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [groups, selectedCategory, searchQuery]);

  // Derive groups user has joined for sidebar
  const userJoinedGroups = useMemo(() => {
    return groups.filter((g) => joinedGroupIds.has(g.id));
  }, [groups, joinedGroupIds]);

  return (
    <AppShell>
      {/* ── Confirmation Modal for Leaving a Group ── */}
      {confirmingLeaveGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Leave Group?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingLeaveGroup(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to leave{" "}
              <strong className="text-foreground">{confirmingLeaveGroup.name}</strong>? Your profile
              groups count will update immediately. You can rejoin at any time.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingLeaveGroup(null)}
                disabled={busyGroupId === confirmingLeaveGroup.id}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmLeave()}
                disabled={busyGroupId === confirmingLeaveGroup.id}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {busyGroupId === confirmingLeaveGroup.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Leaving…</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Yes, Leave Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Strip ── */}
      <div className="mb-8 grid items-center gap-4 overflow-hidden rounded-3xl border border-border/60 bg-gradient-brand-soft p-6 md:grid-cols-[1.5fr_1fr] md:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Communities create change
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            Join, contribute, make an impact.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find groups that match your interests, goals, and neighborhood.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("groups-list");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-glow-purple transition hover:opacity-95"
          >
            <Users className="h-4 w-4" /> Browse Community Groups
          </button>
        </div>
      </div>

      <PageHeader title="Groups" subtitle="Connect, learn, and grow together." />

      {/* ── Error and Action Alerts ── */}
      {actionError && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-300 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Database note: {error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg bg-amber-500/20 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Search + Dynamic Filters ── */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups or topics..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory === c
                  ? "bg-gradient-brand text-white shadow-glow-purple"
                  : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Groups Catalog and Sidebar ── */}
      <div id="groups-list" className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Main groups catalog */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Sparkles className="h-5 w-5 text-brand-teal" />
              <span>Available Groups</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({filteredGroups.length})
              </span>
            </h2>
          </div>

          {loading && groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface p-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-brand-teal mb-2" />
              <p className="text-xs">Loading community groups from database…</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
              {groups.length === 0
                ? "No community groups are currently available in the database."
                : "No groups match your search or filter. Try a different query."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredGroups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  isJoined={joinedGroupIds.has(g.id)}
                  isBusy={busyGroupId === g.id}
                  memberCount={memberCounts[g.id]}
                  onJoin={handleJoin}
                  onPromptLeave={(target) => setConfirmingLeaveGroup(target)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sidebar: Your groups + Upcoming */}
        <aside className="space-y-6">
          {/* Your Groups Section */}
          <section className="rounded-2xl border border-border/60 bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Your Groups</h2>
              {user && (
                <span className="rounded-full bg-brand-purple/20 px-2 py-0.5 text-xs font-semibold text-brand-teal">
                  {userJoinedGroups.length}
                </span>
              )}
            </div>

            {!user ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                <a
                  href="/login?redirect=/groups"
                  className="font-medium text-brand-teal underline hover:text-brand-teal/80"
                >
                  Sign in
                </a>{" "}
                to join groups and keep track of your memberships on your profile.
              </p>
            ) : userJoinedGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                You haven't joined any groups yet. Browse the community groups and click{" "}
                <strong className="text-foreground">Join</strong> to get involved!
              </p>
            ) : (
              <div className="space-y-3">
                {userJoinedGroups.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-brand text-sm font-bold text-white">
                        {g.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{g.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {g.category || "Community"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busyGroupId === g.id}
                      onClick={() => setConfirmingLeaveGroup(g)}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-colors disabled:opacity-50"
                      title="Leave group"
                    >
                      Leave
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Events (Preview) */}
          <section className="rounded-2xl border border-border/60 bg-surface p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Calendar className="h-4 w-4 text-brand-teal" /> Upcoming Events
              </h2>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Preview
              </span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
              Community event scheduling is coming soon. The event below is an illustrative preview.
            </p>
            <div className="flex gap-4 rounded-xl bg-gradient-brand-soft p-4">
              <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-xl bg-background text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-brand-teal">May</p>
                  <p className="font-display text-2xl font-bold leading-none">24</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Community Resource Fair</p>
                <p className="text-xs text-muted-foreground">Sat, May 24 · 10:00 AM</p>
                <p className="text-xs text-muted-foreground">Central Library Plaza</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* ── Discussions (Future Feature Preview) ── */}
      {/* TODO: Future feature — Connect discussions to real Supabase tables when discussion schema is created. */}
      <section className="mt-12 rounded-3xl border border-border/60 bg-surface/40 p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold">Discussions</h2>
              <span className="rounded-full border border-brand-teal/40 bg-brand-teal/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-teal">
                Coming Soon
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Community discussions are currently in development. The discussion threads below are illustrative example previews.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {PREVIEW_DISCUSSIONS.map((d) => (
            <article
              key={d.title}
              className="flex items-start gap-4 rounded-2xl border border-border/60 bg-surface p-5 transition hover:border-brand-blue/40"
            >
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-blue/15 text-sm font-bold text-brand-blue">
                {d.author.charAt(0)}
              </span>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold">{d.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {d.group} · {d.author} · {d.time}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.body}</p>
              </div>
              <span className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" /> {d.replies}
              </span>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
