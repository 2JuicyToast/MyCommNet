import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield,
  ArrowLeft,
  Home,
  Loader2,
  UserPlus,
  Check,
} from "lucide-react";

type SharedProfile = {
  id?: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  headline: string | null;
  pass_intro: string | null;
  skills: string[] | null;
};

type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "accepted" | "declined";

export const Route = createFileRoute("/share/$username")({
  head: () => ({
    meta: [
      { title: "Community Profile — MyCommNet" },
      { name: "description", content: "A shared MyCommNet community profile." },
    ],
  }),
  component: SharedProfilePage,
});

function SharedProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const cleanUsername = decodeURIComponent(username ?? "").trim().replace(/^@/, "");

  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("none");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSharedProfile() {
      if (!cleanUsername) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);
      try {
        // 1. Query shared_profiles view (case-insensitive lookup)
        const { data: viewData, error: viewError } = await supabase
          .from("shared_profiles")
          .select("username, full_name, bio, avatar_url, headline, pass_intro, skills")
          .ilike("username", cleanUsername)
          .maybeSingle();

        // 2. Query profiles table by username as fallback
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id, username, full_name, bio, avatar_url, headline")
          .ilike("username", cleanUsername)
          .maybeSingle();

        if (!active) return;

        const resolvedProfile: SharedProfile | null = (viewData as SharedProfile) ?? (profileRow ? {
          id: profileRow.id,
          username: profileRow.username,
          full_name: profileRow.full_name,
          bio: profileRow.bio,
          avatar_url: profileRow.avatar_url,
          headline: profileRow.headline,
          pass_intro: null,
          skills: null,
        } : null);

        if (!resolvedProfile) {
          setNotFound(true);
          return;
        }

        setProfile(resolvedProfile);
        const resolvedId = profileRow?.id ?? (viewData as any)?.id ?? null;
        setProfileUserId(resolvedId);

        // 3. Check connection status if visitor is logged in and not looking at themselves
        if (user && resolvedId && user.id !== resolvedId) {
          const { data: conn } = await supabase
            .from("user_connections")
            .select("id, requester_id, receiver_id, status")
            .or(
              `and(requester_id.eq.${user.id},receiver_id.eq.${resolvedId}),and(requester_id.eq.${resolvedId},receiver_id.eq.${user.id})`
            )
            .maybeSingle();

          if (conn) {
            setConnectionId(conn.id);
            if (conn.status === "accepted") {
              setConnectionStatus("accepted");
            } else if (conn.status === "pending") {
              setConnectionStatus(conn.requester_id === user.id ? "pending_sent" : "pending_received");
            } else {
              setConnectionStatus("declined");
            }
          } else {
            setConnectionStatus("none");
          }
        }
      } catch (err: any) {
        if (active) {
          console.warn("Shared profile fetch note:", err?.message);
          setNotFound(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSharedProfile();
    return () => {
      active = false;
    };
  }, [cleanUsername, user]);

  async function handleSendConnect() {
    if (!user || !profileUserId) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      const { data, error: insErr } = await supabase
        .from("user_connections")
        .insert({
          requester_id: user.id,
          receiver_id: profileUserId,
          status: "pending",
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      setConnectionId(data?.id ?? null);
      setConnectionStatus("pending_sent");
      setActionMsg("Connection request sent!");
    } catch (err: any) {
      setActionMsg(err?.message ?? "Failed to send connection request.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAcceptConnect() {
    if (!connectionId) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      const { error: updErr } = await supabase
        .from("user_connections")
        .update({ status: "accepted" })
        .eq("id", connectionId);

      if (updErr) throw updErr;
      setConnectionStatus("accepted");
      setActionMsg("Connection accepted!");
    } catch (err: any) {
      setActionMsg(err?.message ?? "Failed to accept connection.");
    } finally {
      setActionBusy(false);
    }
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      void navigate({ to: "/" });
    }
  }

  const isOwnProfile = user && profileUserId && user.id === profileUserId;

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> MyCommNet Community Pass
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold">Community Profile</h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-surface p-12 text-sm text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            <span>Loading community profile…</span>
          </div>
        ) : notFound || !profile ? (
          /* Community Profile Not Found Card */
          <article className="rounded-3xl border border-border/60 bg-surface p-8 text-center shadow-xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-muted-foreground ring-1 ring-border/80 mb-4">
              <Shield className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Community Profile Not Found
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              We couldn't find a public Community Pass profile for{" "}
              <span className="font-mono text-brand-teal font-semibold">
                @{cleanUsername || username}
              </span>
              . The username may be misspelled, or the member may not have shared their pass publicly yet.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-6 border-t border-border/60">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-2 transition active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95 transition active:scale-95"
              >
                <Home className="h-3.5 w-3.5" /> Return to Home
              </Link>
            </div>
          </article>
        ) : (
          /* Found Public Community Profile */
          <article className="rounded-3xl border border-border/60 bg-surface p-8 text-center shadow-xl">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="mx-auto h-24 w-24 rounded-full object-cover ring-4 ring-brand-purple/20 shadow-glow-purple"
              />
            ) : (
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-brand text-3xl font-bold text-white shadow-glow-purple">
                {(profile.full_name ?? profile.username).charAt(0).toUpperCase()}
              </div>
            )}

            <h2 className="mt-5 font-display text-2xl font-bold">{profile.full_name ?? profile.username}</h2>
            <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            {profile.headline && <p className="mt-3 text-sm font-medium text-brand-teal">{profile.headline}</p>}
            {(profile.pass_intro || profile.bio) && (
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{profile.pass_intro || profile.bio}</p>
            )}

            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Connection Actions */}
            <div className="mt-8 pt-6 border-t border-border/60">
              {isOwnProfile ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">This is your public Community Pass profile.</p>
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
                  >
                    View Your Full Profile
                  </Link>
                </div>
              ) : !user ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Sign in to connect with {profile.full_name ?? `@${profile.username}`}.</p>
                  <Link
                    to="/login"
                    search={{ redirect: `/share/${encodeURIComponent(cleanUsername)}` }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Sign in to Connect
                  </Link>
                </div>
              ) : connectionStatus === "accepted" ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/15 px-4 py-1.5 text-xs font-semibold text-brand-teal">
                  <Check className="h-3.5 w-3.5" /> Connected
                </div>
              ) : connectionStatus === "pending_sent" ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Connection Request Pending
                </div>
              ) : connectionStatus === "pending_received" ? (
                <div className="space-y-2">
                  <p className="text-xs text-brand-teal font-medium">This member has sent you a connection request!</p>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleAcceptConnect()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  >
                    {actionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Accept Connection
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={actionBusy || !profileUserId}
                  onClick={() => void handleSendConnect()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-2.5 text-xs font-semibold text-white shadow-glow-purple hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {actionBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Connect
                </button>
              )}

              {actionMsg && (
                <p className="mt-2 text-xs text-brand-teal">{actionMsg}</p>
              )}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
