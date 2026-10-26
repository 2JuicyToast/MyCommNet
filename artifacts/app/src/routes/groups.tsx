import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  Sparkles,
  Calendar,
  MessageSquare,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  Users,
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
  name: string;
  description?: string | null;
  desc?: string | null;
  category?: string | null;
  cat?: string | null;
  tag?: string | null;
  members_count?: number | null;
  online_count?: number | null;
  created_at?: string;
};

// Starter fallback groups if query has not returned yet or is waiting on live project
const STARTER_GROUPS: CommunityGroup[] = [
  {
    id: "g-1",
    name: "Youth Future Leaders",
    desc: "Empowering youth to lead and create change in our communities.",
    tag: "Youth",
  },
  {
    id: "g-2",
    name: "Next Chapter Book Club",
    desc: "Read, discuss, and grow together—one book at a time.",
    tag: "Arts & Culture",
  },
  {
    id: "g-3",
    name: "MentorConnect",
    desc: "Mentorship and guidance for students and young professionals.",
    tag: "Mentoring",
  },
  {
    id: "g-4",
    name: "Tech Forward",
    desc: "Learn tech skills, share resources, and build your future.",
    tag: "Education",
  },
  {
    id: "g-5",
    name: "Community Hoops",
    desc: "Play. Compete. Connect. All skill levels welcome!",
    tag: "Sports",
  },
  {
    id: "g-6",
    name: "Community Changemakers",
    desc: "Local action. Real impact. Be the change.",
    tag: "Community",
  },
  {
    id: "g-7",
    name: "Inspire & Create",
    desc: "A space for artists, writers, and dreamers.",
    tag: "Arts & Culture",
  },
  {
    id: "g-8",
    name: "Tech Creators Hub",
    desc: "Design, code, build together. Regular hack sessions and project sharing.",
    tag: "Education",
  },
  {
    id: "g-9",
    name: "Local Changemakers",
    desc: "Grassroots civic initiatives and community improvement projects.",
    tag: "Community",
  },
];

const discussions = [
  {
    title: "Resources for first-time job seekers",
    group: "MentorConnect",
    author: "Maya J.",
    time: "2h ago",
    body: "Hey everyone! I'm putting together a list of local resources and tips for teens and young adults looking for their first job...",
    replies: 12,
    isNew: true,
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
  onToggleJoin,
}: {
  group: CommunityGroup;
  isJoined: boolean;
  isBusy: boolean;
  memberCount: number;
  onToggleJoin: (group: CommunityGroup) => void;
}) {
  const category = group.category || group.cat || group.tag;
  const description = group.description || group.desc || "";

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
          <span className="font-semibold text-foreground">{memberCount}</span> {memberCount === 1 ? "member" : "members"}
        </div>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onToggleJoin(group)}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            isJoined
              ? "border border-brand-teal/40 bg-brand-teal/15 text-brand-teal hover:bg-brand-teal/25"
              : "bg-gradient-brand text-white hover:opacity-95"
          } disabled:opacity-50`}
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isJoined ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Joined</span>
            </>
          ) : (
            <span>Join</span>
          )}
        </button>
      </div>
    </article>
  );
}

function GroupsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groups, setGroups] = useState<CommunityGroup[]>(STARTER_GROUPS);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Load groups from community_groups and memberships from group_memberships
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch community_groups
      const { data: groupData, error: groupErr } = await supabase
        .from("community_groups")
        .select("*")
        .order("name", { ascending: true });

      if (groupErr) {
        throw new Error(groupErr.message);
      }

      if (groupData && groupData.length > 0) {
        setGroups(groupData as CommunityGroup[]);
      }

      // 2. Fetch all group_memberships to compute accurate counts
      const { data: allMemberships, error: countErr } = await supabase
        .from("group_memberships")
        .select("group_id");

      if (!countErr && allMemberships) {
        const counts: Record<string, number> = {};
        for (const m of allMemberships as { group_id: string }[]) {
          if (m.group_id) {
            counts[m.group_id] = (counts[m.group_id] || 0) + 1;
          }
        }
        setMemberCounts(counts);
      }

      // 3. Fetch authenticated user's memberships
      if (user) {
        const { data: userMemberships, error: userMemberErr } = await supabase
          .from("group_memberships")
          .select("group_id")
          .eq("user_id", user.id);

        if (userMemberErr) {
          console.error("Error fetching user group_memberships:", userMemberErr.message);
        } else if (userMemberships) {
          setJoinedGroupIds(new Set((userMemberships as { group_id: string }[]).map((m) => m.group_id)));
        }
      } else {
        setJoinedGroupIds(new Set());
      }
    } catch (err: any) {
      console.warn("community_groups query note:", err?.message);
      setError(err?.message ?? "Error querying community_groups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  // Handle Join / Leave actions
  async function handleToggleJoin(group: CommunityGroup) {
    if (!user) {
      void navigate({ to: "/login", search: { redirect: "/groups" } });
      return;
    }

    const isCurrentlyJoined = joinedGroupIds.has(group.id);
    setBusyGroupId(group.id);
    setActionError(null);

    try {
      if (isCurrentlyJoined) {
        // Leave group
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
      } else {
        // Join group
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
      }
    } catch (err: any) {
      console.error("Group action failed:", err);
      setActionError(err?.message ?? "Failed to update group membership.");
    } finally {
      setBusyGroupId(null);
    }
  }

  // Derive unique categories from groups
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      const c = g.category || g.cat || g.tag;
      if (c) set.add(c);
    }
    return ["All", ...Array.from(set)];
  }, [groups]);

  // Filter groups by category and search query
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const cat = g.category || g.cat || g.tag || "Community";
      const matchesCategory = selectedCategory === "All" || cat.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description || g.desc || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [groups, selectedCategory, searchQuery]);

  // Groups user has joined for sidebar
  const userJoinedGroups = useMemo(() => {
    return groups.filter((g) => joinedGroupIds.has(g.id));
  }, [groups, joinedGroupIds]);

  return (
    <AppShell>
      {/* Hero strip */}
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
            className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-glow-purple"
          >
            <Users className="h-4 w-4" /> Browse Community Groups
          </button>
        </div>
      </div>

      <PageHeader title="Groups" subtitle="Connect, learn, and grow together." />

      {/* Error alerts */}
      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Database note: {error}</span>
        </div>
      )}

      {/* Search + filters */}
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
                  ? "bg-gradient-brand text-white"
                  : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div id="groups-list" className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Main groups grid */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Sparkles className="h-5 w-5 text-brand-teal" />
              <span>Available Groups</span>
              <span className="text-xs font-normal text-muted-foreground">({filteredGroups.length})</span>
            </h2>
          </div>

          {loading && groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface p-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-brand-teal mb-2" />
              <p className="text-xs">Loading community groups from database…</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
              No groups match your search or filter. Try a different query.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredGroups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  isJoined={joinedGroupIds.has(g.id)}
                  isBusy={busyGroupId === g.id}
                  memberCount={memberCounts[g.id] ?? 0}
                  onToggleJoin={handleToggleJoin}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sidebar: Your groups + Upcoming */}
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Your Groups</h2>
              {user && (
                <span className="rounded-full bg-brand-purple/20 px-2 py-0.5 text-xs text-brand-teal font-medium">
                  {userJoinedGroups.length}
                </span>
              )}
            </div>
            {!user ? (
              <p className="text-xs text-muted-foreground">
                <a href="/login?redirect=/groups" className="text-brand-teal underline">
                  Sign in
                </a>{" "}
                to join groups and keep track of your memberships on your Community Pass.
              </p>
            ) : userJoinedGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                You haven't joined any groups yet. Browse the community groups and click <strong>Join</strong> to connect with your community!
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
                          {g.category || g.cat || g.tag || "Community"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busyGroupId === g.id}
                      onClick={() => handleToggleJoin(g)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/10 transition-colors"
                      title="Leave group"
                    >
                      Leave
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border/60 bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <Calendar className="h-4 w-4 text-brand-teal" /> Upcoming Events
            </h2>
            <div className="flex gap-4 rounded-xl bg-gradient-brand-soft p-4">
              <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-xl bg-background text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-brand-teal">May</p>
                  <p className="font-display text-2xl font-bold leading-none">24</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold">Community Resource Fair</p>
                <p className="text-xs text-muted-foreground">Sat, May 24 · 10:00 AM</p>
                <p className="text-xs text-muted-foreground">Central Library Plaza</p>
                <p className="mt-2 text-xs">
                  <span className="font-semibold text-brand-teal">124</span> going
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* Active Discussions */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Active Discussions</h2>
          <button className="flex items-center gap-1 text-sm text-brand-teal hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          {discussions.map((d) => (
            <article
              key={d.title}
              className="flex items-start gap-4 rounded-2xl border border-border/60 bg-surface p-5 transition hover:border-brand-blue/40"
            >
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-blue/15 text-sm font-bold text-brand-blue">
                {d.author.charAt(0)}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold">{d.title}</h3>
                  {d.isNew && (
                    <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-[10px] font-semibold text-brand-teal">
                      NEW
                    </span>
                  )}
                </div>
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
