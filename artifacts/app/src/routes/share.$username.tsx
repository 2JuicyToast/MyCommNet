import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SharedProfile = {
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  headline: string | null;
  pass_intro: string | null;
  skills: string[] | null;
};

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
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase
      .from("shared_profiles")
      .select("username, full_name, bio, avatar_url, headline, pass_intro, skills")
      .eq("username", username)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("This shared profile is unavailable.");
        else if (!data) setError("This shared profile could not be found.");
        else setProfile(data as SharedProfile);
        setLoading(false);
      });
    return () => { active = false; };
  }, [username]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">MyCommNet</p>
          <h1 className="mt-2 font-display text-2xl font-bold">Community Profile</h1>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">Loading profile…</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-8 text-center text-sm text-red-100">{error}</div>
        ) : profile ? (
          <article className="rounded-3xl border border-border/60 bg-surface p-8 text-center shadow-xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="mx-auto h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-brand text-3xl font-bold text-white">{(profile.full_name ?? profile.username).charAt(0).toUpperCase()}</div>
            )}
            <h2 className="mt-5 font-display text-2xl font-bold">{profile.full_name ?? profile.username}</h2>
            <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            {profile.headline && <p className="mt-3 text-sm font-medium text-brand-teal">{profile.headline}</p>}
            {(profile.pass_intro || profile.bio) && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{profile.pass_intro || profile.bio}</p>}
            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {profile.skills.map((skill) => <span key={skill} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">{skill}</span>)}
              </div>
            )}
          </article>
        ) : null}
      </div>
    </main>
  );
}
