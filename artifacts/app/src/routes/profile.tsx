import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";
import { ImageCropper } from "@/components/ImageCropper";
import {
  MapPin,
  Link as LinkIcon,
  Bookmark,
  Award,
  Calendar as CalendarIcon,
  Briefcase,
  GraduationCap,
  Heart,
  Github,
  Linkedin,
  Globe,
  QrCode,
  Shield,
  Settings,
  Edit3,
  SlidersHorizontal,
  Camera,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  AtSign,
  Users,
  Plus,
  X,
  Check,
  Target,
  ExternalLink,
  Loader2,
  CalendarDays,
  Pencil,
  Eye,
  Download,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import QRCode from "qrcode";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MyCommNet" },
      { name: "description", content: "Your community pass, mini portfolio, saved items, and growth timeline." },
    ],
  }),
  component: ProfilePage,
});

// ── Skills data ──────────────────────────────────────────────────────────────

const SKILL_PRESETS = [
  "Community Outreach", "Public Speaking", "Tutoring", "Event Planning",
  "Leadership", "Project Management", "Social Media", "Graphic Design",
  "Data Analysis", "Writing", "Research", "Mentoring",
  "Web Development", "Marketing", "Photography", "Advocacy",
  "Teaching", "Coding", "Customer Service", "Facilitation",
];

const SKILL_SUGGESTIONS = [
  ...SKILL_PRESETS,
  "JavaScript", "Python", "React", "Design", "UI/UX",
  "Video Editing", "Content Creation", "Grant Writing", "Fundraising",
  "Networking", "Public Policy", "Healthcare", "Nursing", "Finance",
  "Accounting", "Legal Research", "Translation", "Sign Language",
  "Carpentry", "Electrical Work", "Plumbing", "Landscaping",
  "Cooking", "Baking", "Childcare", "Elder Care", "Crisis Counseling",
  "Mental Health Support", "Peer Support", "Life Coaching",
  "Fitness Training", "Yoga", "Sports Coaching", "Music",
  "Art", "Theater", "Dance", "Drawing", "Painting", "Sculpting",
  "3D Printing", "Robotics", "Electronics", "Cybersecurity",
  "Data Science", "Machine Learning", "Mobile Development",
];

// ── Link helpers ─────────────────────────────────────────────────────────────

type ProfileLink = { id: string; label: string; url: string };

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getLinkIcon(url: string): React.ComponentType<{ className?: string }> {
  try {
    const u = url.toLowerCase();
    if (u.includes("linkedin.com")) return Linkedin;
    if (u.includes("github.com")) return Github;
    if (/\.(pdf|doc|docx|ppt|pptx)(\?|$)/.test(u)) return LinkIcon;
    return Globe;
  } catch {
    return Globe;
  }
}
type GoalStep = "discover" | "confirm";
type GoalStatus = "active" | "completed";
type GoalContext = "self" | "mycommnet" | "mycommnet_supported" | "in_app";

type UserGoal = {
  id: string;
  user_id: string;
  goal_key: string;
  title: string;
  description: string;
  goal_type: string;
  completion_requirement: string;
  target_date: string | null;
  completion_context: GoalContext;
  action_label: string;
  action_route: "/map" | "/groups" | null;
  status: GoalStatus;
  step: GoalStep;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type GoalDefinition = {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  actionRoute: "/map" | "/groups";
  actionHint: string;
  matchingTerms: string[];
};

type CustomGoalDraft = {
  title: string;
  goalType: string;
  description: string;
  requirement: string;
  targetDate: string;
  context: GoalContext;
  feature: "map" | "groups";
};

const EMPTY_CUSTOM_GOAL: CustomGoalDraft = {
  title: "",
  goalType: "personal",
  description: "",
  requirement: "",
  targetDate: "",
  context: "self",
  feature: "map",
};

const GOAL_DEFINITIONS: GoalDefinition[] = [
  {
    key: "explore-community-space",
    title: "Explore a community space",
    description: "Find a local community center, then confirm when you have used it for your goal.",
    actionLabel: "Find community spaces",
    actionRoute: "/map",
    actionHint: "On the Map, choose Community centers to discover local spaces.",
    matchingTerms: ["community", "local", "space", "resource"],
  },
  {
    key: "explore-education-resource",
    title: "Explore an education resource",
    description: "Find a library or education resource, then confirm your next real-world step.",
    actionLabel: "Find education resources",
    actionRoute: "/map",
    actionHint: "On the Map, choose Libraries to discover local education resources.",
    matchingTerms: ["career", "education", "skill", "school", "learning"],
  },
  {
    key: "find-local-resource",
    title: "Find a useful local resource",
    description: "Locate a library, computer, Wi-Fi spot, or another resource that helps you move forward.",
    actionLabel: "Explore resources",
    actionRoute: "/map",
    actionHint: "Use the Map to search libraries and community centers.",
    matchingTerms: ["resource", "library", "computer", "wifi", "access", "education"],
  },
  {
    key: "join-interest-group",
    title: "Join a group related to your interests",
    description: "Explore groups connected to a personal or career interest, then confirm when you join one.",
    actionLabel: "Explore groups",
    actionRoute: "/groups",
    actionHint: "Browse Groups for communities related to your interests.",
    matchingTerms: ["group", "community", "interest", "career", "mentoring", "sports", "arts"],
  },
  {
    key: "find-mentor",
    title: "Find a mentor",
    description: "Explore mentoring communities and confirm when you have connected with a mentor.",
    actionLabel: "Explore mentoring groups",
    actionRoute: "/groups",
    actionHint: "Browse Groups for mentoring communities and conversations.",
    matchingTerms: ["mentor", "mentoring", "career", "education", "professional"],
  },
  {
    key: "explore-education",
    title: "Explore an educational program",
    description: "Find a program or certification opportunity that fits your interests and confirm your next step.",
    actionLabel: "Find education resources",
    actionRoute: "/map",
    actionHint: "Use the Map to explore libraries and education resources.",
    matchingTerms: ["education", "school", "training", "certification", "learning", "career"],
  },
];

type HelpSuggestion = {
  key: string;
  title: string;
  reason: string;
  actionLabel: string;
  actionRoute: "/map" | "/groups";
  suggestedContext: GoalContext;
  terms: string[];
  categories: string[];
};

const HELP_SUGGESTIONS: HelpSuggestion[] = [
  {
    key: "community-centers",
    title: "Explore community centers",
    reason: "Community centers are an available Map category for local discovery.",
    actionLabel: "Open the Map",
    actionRoute: "/map",
    suggestedContext: "mycommnet_supported",
    terms: ["community center", "community", "local resource"],
    categories: ["community"],
  },
  {
    key: "education-libraries",
    title: "Explore libraries and education resources",
    reason: "Libraries are an available Map category for finding local education resources.",
    actionLabel: "Open the Map",
    actionRoute: "/map",
    suggestedContext: "mycommnet_supported",
    terms: ["library", "education", "course", "class", "certificate", "certification"],
    categories: ["learning", "career"],
  },
  {
    key: "mentoring-groups",
    title: "Explore mentoring groups",
    reason: "Groups includes a Mentoring category for discovering communities and conversations.",
    actionLabel: "Explore Groups",
    actionRoute: "/groups",
    suggestedContext: "mycommnet_supported",
    terms: ["mentor", "mentoring", "career guidance"],
    categories: ["career", "community"],
  },
];

const timeline = [
  { icon: Briefcase, title: "Volunteer Coordinator", org: "Bright Futures Org", date: "Mar 2026 — Present", body: "Coordinating outreach for weekly resource fairs across Atlanta." },
  { icon: GraduationCap, title: "Digital Skills Bootcamp", org: "Code for Tomorrow", date: "Jan 2026 — Apr 2026", body: "Hands-on intro to HTML/CSS, JavaScript, and Git workflows." },
  { icon: CalendarIcon, title: "Community Resource Fair", org: "Unity Collective", date: "Nov 2025", body: "Helped onboard 60+ residents to local services. Verified 8 hours." },
];
const saved = [
  { label: "TechConnect Hub", type: "Resource" },
  { label: "Community Resource Fair", type: "Event" },
  { label: "MentorConnect", type: "Group" },
  { label: "Outreach Coordinator", type: "Job" },
];

function parseLocationDisplay(stored: string | null): string {
  if (!stored) return "";
  const parts = stored.split("|");
  if (parts.length >= 2) {
    const [city, state, country, zip] = parts;
    const countryLabel = country === "US" ? "USA" : country === "CA" ? "Canada" : country === "UK" ? "UK" : country === "AU" ? "Australia" : country === "MX" ? "Mexico" : country;
    const cityState = [city, state].filter(Boolean).join(", ");
    const full = [cityState, countryLabel].filter(Boolean).join(", ");
    return zip ? `${full} ${zip}`.trim() : full.trim();
  }
  return stored;
}

function labelChip(text: string, color: string) {
  const clean = text.startsWith("custom:") ? text.slice(7) : text;
  return (
    <span
      key={text}
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {clean}
    </span>
  );
}

function preferenceTerms(prefs: UserPrefs | null): string[] {
  if (!prefs) return [];
  return [
    ...(prefs.personal_interests ?? []),
    ...(prefs.career_interests ?? []),
    ...(prefs.resource_interests ?? []),
    ...(prefs.access_preferences ?? []),
  ].map((term) => term.toLowerCase());
}

function orderedGoalDefinitions(prefs: UserPrefs | null): GoalDefinition[] {
  const terms = preferenceTerms(prefs);
  return [...GOAL_DEFINITIONS].sort((a, b) => {
    const score = (goal: GoalDefinition) =>
      goal.matchingTerms.reduce((total, term) => total + (terms.some((userTerm) => userTerm.includes(term) || term.includes(userTerm)) ? 1 : 0), 0);
    return score(b) - score(a);
  });
}

function suggestionMatchReason(goal: CustomGoalDraft, suggestion: HelpSuggestion): string {
  if (suggestion.categories.includes(goal.goalType)) {
    return `Suggested because your goal category is ${goal.goalType}. ${suggestion.reason}`;
  }
  const matchedTerm = suggestion.terms.find((term) => hasWholeWord(goalTextMatches(goal), term));
  return matchedTerm
    ? `Suggested because your goal mentions “${matchedTerm}”. ${suggestion.reason}`
    : suggestion.reason;
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTodayOrLater(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= localDateKey();
}

function formatGoalDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

function dateFromKey(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function goalTextMatches(goal: CustomGoalDraft): string {
  return `${goal.title} ${goal.description} ${goal.requirement}`.toLowerCase();
}

function hasWholeWord(text: string, phrase: string): boolean {
  const escaped = phrase.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(text);
}

function matchingHelpSuggestions(goal: CustomGoalDraft): HelpSuggestion[] {
  const text = goalTextMatches(goal);
  return HELP_SUGGESTIONS.filter((suggestion) => {
    const categoryMatch = suggestion.categories.includes(goal.goalType);
    const keywordMatch = suggestion.terms.some((term) => hasWholeWord(text, term));
    return categoryMatch || keywordMatch;
  }).sort((a, b) => {
    const categoryScore = (suggestion: HelpSuggestion) => suggestion.categories.includes(goal.goalType) ? 1 : 0;
    return categoryScore(b) - categoryScore(a);
  });
}

function defaultDraftForGoal(goal: UserGoal): CustomGoalDraft {
  return {
    title: goal.title,
    goalType: goal.goal_type || "personal",
    description: goal.description === goal.completion_requirement ? "" : goal.description,
    requirement: goal.completion_requirement || goal.description,
    targetDate: goal.target_date ?? "",
    context: goal.completion_context === "mycommnet" ? "mycommnet_supported" : goal.completion_context,
    feature: goal.action_route === "/groups" ? "groups" : "map",
  };
}

function GoalsInProgress({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customGoal, setCustomGoal] = useState<CustomGoalDraft>(EMPTY_CUSTOM_GOAL);
  const [editingGoal, setEditingGoal] = useState<UserGoal | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = async () => {
    setLoading(true);
    setError(null);
    const [goalResult, preferenceResult] = await Promise.all([
      supabase.from("user_goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_preferences").select("personal_interests, career_interests, resource_interests, access_preferences").eq("user_id", userId).maybeSingle(),
    ]);

    if (goalResult.error) {
      setError(goalResult.error.message);
    } else {
      setGoals((goalResult.data ?? []) as UserGoal[]);
    }
    if (!preferenceResult.error) setPrefs((preferenceResult.data ?? null) as UserPrefs | null);
    setLoading(false);
  };

  useEffect(() => {
    void loadGoals();
  }, [userId]);

  async function addGoal(definition: GoalDefinition) {
    if (goals.some((goal) => goal.goal_key === definition.key)) return;
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("user_goals")
      .insert({
        user_id: userId,
        goal_key: definition.key,
        title: definition.title,
        description: definition.description,
        goal_type: definition.key.includes("training") || definition.key.includes("education") ? "learning" : "community",
        completion_requirement: definition.description,
        target_date: null,
        completion_context: "mycommnet_supported",
        action_label: definition.actionLabel,
        action_route: definition.actionRoute,
        status: "active",
        step: "discover",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setGoals((current) => [data as UserGoal, ...current]);
      setShowSuggestions(false);
    }
    setSaving(false);
  }

  async function saveCustomGoal(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const title = customGoal.title.trim();
      const description = customGoal.description.trim();
      const requirement = customGoal.requirement.trim();
      if (!title || !requirement) {
        setError("Add a goal name and a clear completion requirement.");
        return;
      }
      if (customGoal.targetDate && !isTodayOrLater(customGoal.targetDate) && (!editingGoal || customGoal.targetDate !== editingGoal.target_date)) {
        setError("Choose today or a later date.");
        return;
      }

      setSaving(true);
      setError(null);
        const actionRoute: UserGoal["action_route"] = customGoal.context === "self"
          ? null
          : customGoal.feature === "map" ? "/map" : "/groups";
        const actionLabel = customGoal.context !== "self"
          ? customGoal.feature === "map" ? "Open the Map" : "Explore Groups"
          : "Track this myself";
        const payload = {
          user_id: userId,
          goal_key: editingGoal?.goal_key ?? `custom-${crypto.randomUUID()}`,
          title,
          description: description || requirement,
          goal_type: customGoal.goalType,
          completion_requirement: requirement,
          target_date: customGoal.targetDate || null,
          completion_context: customGoal.context,
          action_label: actionLabel,
          action_route: actionRoute,
          updated_at: new Date().toISOString(),
        };
      const result = editingGoal
        ? await supabase.from("user_goals").update(payload).eq("id", editingGoal.id).eq("user_id", userId).select().single()
        : await supabase.from("user_goals").insert({ ...payload, status: "active", step: "discover" }).select().single();

      if (result.error) {
        setError(result.error.message);
      } else if (result.data) {
        setGoals((current) => editingGoal
          ? current.map((item) => item.id === editingGoal.id ? result.data as UserGoal : item)
          : [result.data as UserGoal, ...current]);
        setCustomGoal(EMPTY_CUSTOM_GOAL);
        setShowCustomForm(false);
        setShowSuggestions(false);
        setEditingGoal(null);
      }
      setSaving(false);
  }

  function beginEditGoal(goal: UserGoal) {
      setEditingGoal(goal);
      setCustomGoal(defaultDraftForGoal(goal));
      setShowSuggestions(true);
      setShowCustomForm(true);
      setDismissedSuggestions([]);
  }

  async function updateGoal(goal: UserGoal, updates: Partial<Pick<UserGoal, "step" | "status" | "completed_at">>) {
    setSaving(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from("user_goals")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", goal.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
    } else if (data) {
      setGoals((current) => current.map((item) => item.id === goal.id ? data as UserGoal : item));
    }
    setSaving(false);
  }

  async function removeGoal(goal: UserGoal) {
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from("user_goals")
      .delete()
      .eq("id", goal.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setGoals((current) => current.filter((item) => item.id !== goal.id));
    }
    setSaving(false);
  }

  const activeGoals = goals.filter((goal) => goal.status === "active");
  const completedGoals = goals.filter((goal) => goal.status === "completed");
  const definitions = orderedGoalDefinitions(prefs);
  const availableDefinitions = definitions.filter((definition) => !goals.some((goal) => goal.goal_key === definition.key));

  return (
    <section className="rounded-2xl border border-border/60 bg-surface p-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Target className="h-4 w-4 text-brand-teal" /> Goals in Progress
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a goal, take the next step, and confirm progress when it happens in real life.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSuggestions((open) => !open)}
          disabled={loading || saving}
          className="flex items-center gap-1.5 rounded-lg border border-brand-purple/50 px-3 py-1.5 text-xs font-semibold text-brand-purple transition hover:bg-brand-purple/10 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add a goal
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => void loadGoals()} className="font-semibold hover:underline">Retry</button>
        </div>
      )}

      {showSuggestions && (
        <div className="mb-5 rounded-xl border border-border/60 bg-surface-2/50 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">Suggested goals for you</p>
            <button
              type="button"
              onClick={() => setShowCustomForm((open) => !open)}
              className="text-xs font-semibold text-brand-teal hover:underline"
            >
              {showCustomForm ? "Use a suggestion" : "Make my own goal"}
            </button>
          </div>
          {showCustomForm ? (
            <form onSubmit={saveCustomGoal} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-medium">Goal name</span>
                  <input
                    value={customGoal.title}
                    onChange={(event) => setCustomGoal((current) => ({ ...current, title: event.target.value }))}
                    placeholder="e.g. Build a portfolio"
                    maxLength={120}
                    required
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-brand-teal"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium">Goal type</span>
                  <select
                    value={customGoal.goalType}
                    onChange={(event) => setCustomGoal((current) => ({ ...current, goalType: event.target.value }))}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-brand-teal"
                  >
                    <option value="personal">Personal</option>
                    <option value="career">Career</option>
                    <option value="learning">Learning</option>
                    <option value="community">Community</option>
                    <option value="wellbeing">Wellbeing</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium">Description <span className="text-muted-foreground">(optional)</span></span>
                  <input
                    value={customGoal.description}
                    onChange={(event) => setCustomGoal((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Why this goal matters to you"
                    maxLength={240}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-brand-teal"
                  />
                </label>
              </div>
              <label className="block text-xs">
                <span className="mb-1 block font-medium">How will you know it is complete?</span>
                <textarea
                  value={customGoal.requirement}
                  onChange={(event) => setCustomGoal((current) => ({ ...current, requirement: event.target.value }))}
                  placeholder="Describe the real-world result, not just opening a link."
                  rows={2}
                  maxLength={500}
                  required
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-brand-teal"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="text-xs">
                  <span className="mb-1 block font-medium">Target completion date <span className="text-muted-foreground">(optional)</span></span>
                  <div className="flex gap-2">
                    <input
                      aria-label="Target completion date"
                      value={customGoal.targetDate}
                      onChange={(event) => setCustomGoal((current) => ({ ...current, targetDate: event.target.value }))}
                      onFocus={() => setDatePopoverOpen(true)}
                      placeholder="YYYY-MM-DD"
                      inputMode="numeric"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-brand-teal"
                    />
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" aria-label="Open calendar" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 focus-visible:border-brand-teal focus-visible:ring-2 focus-visible:ring-brand-teal/50">
                          <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          className="bg-white text-slate-900"
                          classNames={{
                            caption_label: "text-slate-900",
                            dropdown: "bg-white text-slate-900",
                            weekday: "text-slate-500",
                            day_button: "text-slate-900 hover:bg-slate-100 hover:text-slate-900",
                            today: "bg-slate-100 text-slate-900",
                            disabled: "text-slate-400 opacity-50",
                            outside: "text-slate-400",
                          }}
                          selected={dateFromKey(customGoal.targetDate)}
                          defaultMonth={dateFromKey(customGoal.targetDate) ?? new Date()}
                          disabled={{ before: todayLocal() }}
                          onSelect={(date) => {
                            if (date && localDateKey(date) < localDateKey()) return;
                            setCustomGoal((current) => ({ ...current, targetDate: date ? localDateKey(date) : "" }));
                            setDatePopoverOpen(false);
                          }}
                          initialFocus
                        />
                        <div className="flex items-center justify-between border-t border-border px-3 py-2">
                          <span className="text-[11px] text-muted-foreground">Choose today or a later date.</span>
                          {customGoal.targetDate && <button type="button" onClick={() => setCustomGoal((current) => ({ ...current, targetDate: "" }))} className="text-xs font-semibold text-brand-teal hover:underline">Clear</button>}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Choose today or a later date.</p>
                </div>
                <fieldset className="text-xs">
                  <legend className="mb-1 font-medium">How does this relate to MyCommNet?</legend>
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name="goal-context" checked={customGoal.context === "self"} onChange={() => setCustomGoal((current) => ({ ...current, context: "self" }))} />
                      Personal — I mainly track this myself
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name="goal-context" checked={customGoal.context === "mycommnet_supported"} onChange={() => setCustomGoal((current) => ({ ...current, context: "mycommnet_supported" }))} />
                      MyCommNet-supported — discover, then act outside the app
                    </label>
                    <p className="text-[11px] text-muted-foreground">In-app completion is not available for the current site features.</p>
                  </div>
                </fieldset>
              </div>
              {customGoal.context !== "self" && (
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">MyCommNet starting point</span>
                  <select
                    value={customGoal.feature}
                    onChange={(event) => setCustomGoal((current) => ({ ...current, feature: event.target.value as "map" | "groups" }))}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-brand-teal"
                  >
                    <option value="map">Map and local resource discovery</option>
                    <option value="groups">Groups and community discovery</option>
                  </select>
                </label>
              )}
              {matchingHelpSuggestions(customGoal).filter((suggestion) => !dismissedSuggestions.includes(suggestion.key)).length > 0 ? (
                <div className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 p-3">
                  <p className="text-xs font-semibold text-brand-teal">Ways MyCommNet can help</p>
                  <div className="mt-2 space-y-2">
                    {matchingHelpSuggestions(customGoal)
                      .filter((suggestion) => !dismissedSuggestions.includes(suggestion.key))
                      .map((suggestion) => (
                        <div key={suggestion.key} className="rounded-lg border border-border/60 bg-surface px-3 py-2">
                          <p className="text-xs font-semibold">{suggestion.title}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{suggestionMatchReason(customGoal, suggestion)}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" onClick={() => setCustomGoal((current) => ({ ...current, context: suggestion.suggestedContext, feature: suggestion.actionRoute === "/groups" ? "groups" : "map" }))} className="rounded-md bg-gradient-brand px-2.5 py-1 text-[11px] font-semibold text-white">Use this</button>
                            <button type="button" onClick={() => setDismissedSuggestions((current) => [...current, suggestion.key])} className="rounded-md border border-border px-2.5 py-1 text-[11px] hover:bg-surface-2">Dismiss</button>
                            <span className="self-center text-[10px] text-muted-foreground">{suggestion.actionLabel}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-background/50 px-3 py-2 text-[11px] text-muted-foreground">
                  You can track this goal here. There isn’t a matching MyCommNet feature available yet.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCustomForm(false); setEditingGoal(null); setCustomGoal(EMPTY_CUSTOM_GOAL); }} className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-gradient-brand px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50">{editingGoal ? "Save changes" : "Save custom goal"}</button>
              </div>
            </form>
          ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {availableDefinitions.map((definition) => (
              <button
                key={definition.key}
                type="button"
                onClick={() => void addGoal(definition)}
                disabled={saving}
                className="rounded-lg border border-border/60 px-3 py-2 text-left transition hover:border-brand-teal/60 hover:bg-surface-2 disabled:opacity-50"
              >
                <span className="block text-xs font-semibold">{definition.title}</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{definition.description}</span>
              </button>
            ))}
          </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your goals…
        </div>
      ) : activeGoals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center">
          <p className="text-sm font-medium">No active goals yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Choose a goal to turn something you discover into a next step.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const definition = GOAL_DEFINITIONS.find((item) => item.key === goal.goal_key);
            return (
              <div key={goal.id} className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{goal.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{goal.description}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Complete when:</span> {goal.completion_requirement}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                        <span className="rounded-full bg-background/70 px-2 py-0.5 capitalize">{goal.goal_type}</span>
                        {goal.target_date && <span className={`rounded-full px-2 py-0.5 ${goal.target_date <= localDateKey() ? "bg-red-400/10 text-red-300" : "bg-background/70"}`}>{goal.target_date <= localDateKey() ? "Overdue · " : "Target "}{formatGoalDate(goal.target_date)}</span>}
                        <span className="rounded-full bg-background/70 px-2 py-0.5">{goal.completion_context === "mycommnet" || goal.completion_context === "mycommnet_supported" ? "MyCommNet-supported" : goal.completion_context === "in_app" ? "In-app" : "Self-directed"}</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-start">
                    <button type="button" onClick={() => beginEditGoal(goal)} disabled={saving} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"><Pencil className="h-3 w-3" /> Edit</button>
                    <button type="button" onClick={() => void removeGoal(goal)} disabled={saving} className="text-xs text-muted-foreground hover:text-red-300 disabled:opacity-50">Remove</button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-background/50 px-3 py-2 text-xs">
                  <p className="font-semibold text-brand-teal">
                    {goal.step === "discover" ? "Next step: Discover an opportunity" : "Next step: Confirm your real-world progress"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {goal.step === "discover" ? definition?.actionHint ?? "Use the linked feature to get started." : "MyCommNet cannot verify this milestone, so confirm it when it is true for you."}
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  {goal.step === "discover" ? (
                    <>
                      {goal.action_route ? (
                        <Link to={goal.action_route} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-brand px-3 py-2 text-xs font-semibold text-white hover:brightness-110">
                          {goal.action_label} <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">Self-directed goal</span>
                      )}
                      <button type="button" onClick={() => void updateGoal(goal, { step: "confirm" })} disabled={saving} className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-2 disabled:opacity-50">
                        {goal.completion_context === "mycommnet" || goal.completion_context === "mycommnet_supported" ? "I found an opportunity" : "I started working on it"}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => void updateGoal(goal, { status: "completed", step: "confirm", completed_at: new Date().toISOString() })} disabled={saving} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-brand px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50">
                      <Check className="h-3.5 w-3.5" /> Mark goal complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed goals</p>
          <div className="space-y-2">
            {completedGoals.map((goal) => (
              <div key={goal.id} className="flex flex-col gap-2 rounded-lg bg-surface-2/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{goal.title}</p>
                  <p className="text-[11px] text-brand-teal">Completed by you</p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button type="button" onClick={() => void updateGoal(goal, { status: "active", completed_at: null })} disabled={saving} className="text-xs text-brand-teal hover:underline disabled:opacity-50">Reopen</button>
                  <button type="button" onClick={() => beginEditGoal(goal)} disabled={saving} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">Edit</button>
                  <button type="button" onClick={() => void removeGoal(goal)} disabled={saving} className="text-xs text-muted-foreground hover:text-red-300 disabled:opacity-50">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

type UserPrefs = {
  zip_code?: string;
  age_range?: string;
  gender?: string;
  ethnicity?: string;
  life_status?: string;
  occupation?: string;
  personal_interests?: string[];
  career_interests?: string[];
  resource_interests?: string[];
  access_preferences?: string[];
  transportation_modes?: string[];
  engagement_preference?: string;
  content_preference?: string;
};

function communityStyleValue(prefs: UserPrefs | null): string | null {
  if (!prefs) return null;
  const cp = prefs.content_preference;
  const ep = prefs.engagement_preference;
  if (!cp && !ep) return null;
  if (cp === "both" && ep === "both") return "community_style: all";
  return `community_style: ${cp ?? "none"} / ${ep ?? "none"}`;
}

function SurveySummary({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) { setOpen((o) => !o); return; }
    const { data } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
    setPrefs(data ?? null);
    setLoaded(true);
    setOpen(true);
  }

  const location = parseLocationDisplay(prefs?.zip_code ?? null);
  const personalInterests = prefs?.personal_interests ?? [];
  const careerInterests = prefs?.career_interests ?? [];
  const resources = prefs?.resource_interests ?? [];
  const accessNeeds = prefs?.access_preferences ?? [];
  const communityStyle = communityStyleValue(prefs);

  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
      <button
        type="button"
        onClick={load}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
        style={{ color: "#cbc3d7" }}
      >
        <span>My survey summary</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs" style={{ color: "#cbc3d7", borderTop: "1px solid #1e293b" }}>
          {!prefs ? (
            <p className="pt-3 text-muted-foreground">No survey data saved yet.</p>
          ) : (
            <>
              {location && (
                <div className="pt-3 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#4fdbc8" }} />
                  <span className="leading-none">{location}</span>
                </div>
              )}
              {(prefs.age_range || prefs.gender) && (
                <div className="flex flex-wrap gap-2">
                  {prefs.age_range && labelChip(prefs.age_range, "#a078ff")}
                  {prefs.gender && labelChip(prefs.gender, "#a078ff")}
                  {prefs.ethnicity && labelChip(prefs.ethnicity, "#a078ff")}
                </div>
              )}
              {prefs.life_status && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#958ea0" }}>Situation</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {labelChip(prefs.life_status, "#eab308")}
                    {prefs.occupation && <span>{prefs.occupation}</span>}
                  </div>
                </div>
              )}
              {personalInterests.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#958ea0" }}>Personal interests</p>
                  <div className="flex flex-wrap gap-1.5">{personalInterests.map((t) => labelChip(t, "#4fdbc8"))}</div>
                </div>
              )}
              {careerInterests.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#958ea0" }}>Career interests</p>
                  <div className="flex flex-wrap gap-1.5">{careerInterests.map((t) => labelChip(t, "#0566d9"))}</div>
                </div>
              )}
              {resources.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#958ea0" }}>Resources needed</p>
                  <div className="flex flex-wrap gap-1.5">{resources.map((t) => labelChip(t, "#f97316"))}</div>
                </div>
              )}
              {accessNeeds.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#958ea0" }}>Access needs</p>
                  <div className="flex flex-wrap gap-1.5">{accessNeeds.map((t) => labelChip(t, "#ec4899"))}</div>
                </div>
              )}
              {communityStyle && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#958ea0" }}>Community Style</p>
                  <div className="flex flex-wrap gap-1.5">{labelChip(communityStyle, "#22c55e")}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Skills tag input ─────────────────────────────────────────────────────────

function ProfileTagInput({
  suggestions,
  existingValues,
  onAdd,
}: {
  suggestions: string[];
  existingValues: string[];
  onAdd: (value: string) => void;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const existing = existingValues.map((v) => v.toLowerCase());
  const filtered = input.trim().length > 0
    ? suggestions.filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !existing.includes(s.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function add(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); if (filtered.length > 0) add(filtered[0]); else if (input.trim()) add(input.trim()); }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Add a skill or interest…"
          className="w-full h-9 pl-3 pr-16 rounded-lg text-xs"
          style={{ background: "#0b1326", border: "1px solid #1e293b", color: "#dae2fd", outline: "none" }}
        />
        {input && (
          <button
            type="button"
            onClick={() => add(input.trim())}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: "rgba(160,120,255,0.2)", color: "#a078ff" }}
          >
            Add
          </button>
        )}
      </div>
      {open && (filtered.length > 0 || (input.trim() && !existing.includes(input.trim().toLowerCase()))) && (
        <ul
          className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{ background: "rgba(15,23,42,0.97)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(s); }}
                className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5"
                style={{ color: "#cbc3d7" }}
              >
                {s}
              </button>
            </li>
          ))}
          {input.trim() && !filtered.some((s) => s.toLowerCase() === input.trim().toLowerCase()) && !existing.includes(input.trim().toLowerCase()) && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(input.trim()); }}
                className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5"
                style={{ color: "#4fdbc8" }}
              >
                + Add "{input.trim()}"
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Profile page ─────────────────────────────────────────────────────────────

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [userLocation, setUserLocation] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropMode, setCropMode] = useState<"avatar" | "banner" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Pending (local-only) previews — not uploaded until Done is pressed
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [pendingBannerBlob, setPendingBannerBlob] = useState<Blob | null>(null);
  const [pendingBannerPreview, setPendingBannerPreview] = useState<string | null>(null);
  // Edit-mode fields
  const [savedName, setSavedName] = useState<string | null>(null);
  const [savedHeadline, setSavedHeadline] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLinks, setEditLinks] = useState<ProfileLink[]>([]);
  const [editSkills, setEditSkills] = useState<string[]>([]);
  // Per-section edit flags (independent of avatar/banner global edit mode)
  const [editingAbout, setEditingAbout] = useState(false);
  const [editingLinks, setEditingLinks] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passPdfUrl, setPassPdfUrl] = useState<string | null>(null);
  const [passQrUrl, setPassQrUrl] = useState<string | null>(null);

  // Statistics state holders: Events Attended, Service Hours, Groups Joined, Connections
  const [stats, setStats] = useState<{
    eventsAttended: number;
    serviceHours: number;
    groupsJoined: number;
    connections: number;
    loading: boolean;
    error: string | null;
    schemaPending: boolean;
  }>({
    eventsAttended: 0,
    serviceHours: 0,
    groupsJoined: 0,
    connections: 0,
    loading: false,
    error: null,
    schemaPending: false,
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_preferences")
      .select("zip_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.zip_code) setUserLocation(parseLocationDisplay(data.zip_code));
      });
  }, [user]);

  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    if (profile?.banner_url) setBannerUrl(profile.banner_url);
  }, [profile]);

  // Connect statistics to Supabase tables scoped strictly to the authenticated user
  useEffect(() => {
    if (!user) {
      setStats({
        eventsAttended: 0,
        serviceHours: 0,
        groupsJoined: 0,
        connections: 0,
        loading: false,
        error: null,
        schemaPending: false,
      });
      return;
    }

    let cancelled = false;

    async function loadStats() {
      if (!user) return;
      setStats((prev) => ({ ...prev, loading: true, error: null }));
      try {
        let events = 0;
        let hours = 0;
        let groups = 0;
        let connections = 0;
        let missingTables: string[] = [];

        // 1. Groups Joined (group_memberships count scoped to user.id)
        const groupsRes = await supabase
          .from("group_memberships")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (groupsRes.error) {
          if (/relation.*does not exist|not found|42P01|PGRST204|PGRST205/i.test(groupsRes.error.message)) {
            missingTables.push("group_memberships");
          } else {
            console.error("Failed to query group_memberships:", groupsRes.error.message);
          }
        } else if (groupsRes.count !== null && groupsRes.count !== undefined) {
          groups = groupsRes.count;
        }

        // 2. Connections (user_connections count for accepted connections involving user)
        const connRes = await supabase
          .from("user_connections")
          .select("*", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

        if (connRes.error) {
          if (/relation.*does not exist|not found|42P01|PGRST204|PGRST205/i.test(connRes.error.message)) {
            missingTables.push("user_connections");
          } else {
            console.error("Failed to query user_connections:", connRes.error.message);
          }
        } else if (connRes.count !== null && connRes.count !== undefined) {
          connections = connRes.count;
        }

        // 3. Events Attended (event_attendance verified records scoped to user.id)
        const eventRes = await supabase
          .from("event_attendance")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("verified", true);

        if (eventRes.error) {
          if (/relation.*does not exist|not found|42P01|PGRST204|PGRST205/i.test(eventRes.error.message)) {
            missingTables.push("event_attendance");
          } else {
            console.error("Failed to query event_attendance:", eventRes.error.message);
          }
        } else if (eventRes.count !== null && eventRes.count !== undefined) {
          events = eventRes.count;
        }

        // 4. Community Service Hours (approved hours sum from community_service_records)
        const hoursRes = await supabase
          .from("community_service_records")
          .select("hours")
          .eq("user_id", user.id)
          .eq("status", "approved");

        if (hoursRes.error) {
          if (/relation.*does not exist|not found|42P01|PGRST204|PGRST205/i.test(hoursRes.error.message)) {
            missingTables.push("community_service_records");
          } else {
            console.error("Failed to query community_service_records:", hoursRes.error.message);
          }
        } else if (hoursRes.data) {
          hours = (hoursRes.data as { hours: number | null }[]).reduce((acc: number, row) => acc + (Number(row.hours) || 0), 0);
        }

        if (!cancelled) {
          setStats({
            eventsAttended: events,
            serviceHours: hours,
            groupsJoined: groups,
            connections: connections,
            loading: false,
            error: null,
            schemaPending: missingTables.length > 0,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setStats((prev) => ({
            ...prev,
            loading: false,
            error: err?.message ?? "Error querying statistics",
          }));
        }
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function handleAvatarFileSelected(file: File) {
    setCropFile(file);
    setCropMode("avatar");
  }

  function handleBannerFileSelected(file: File) {
    setCropFile(file);
    setCropMode("banner");
  }

  // Store crop result as a local preview — nothing is uploaded until Done is pressed
  function handleAvatarCropDone(blob: Blob) {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarBlob(blob);
    setPendingAvatarPreview(URL.createObjectURL(blob));
    setCropFile(null);
    setCropMode(null);
  }

  function handleBannerCropDone(blob: Blob) {
    if (pendingBannerPreview) URL.revokeObjectURL(pendingBannerPreview);
    setPendingBannerBlob(blob);
    setPendingBannerPreview(URL.createObjectURL(blob));
    setCropFile(null);
    setCropMode(null);
  }

  function startEditingProfile() {
    setEditFullName(fullName);
    setEditHeadline(headline);
    setUploadErr(null);
    setIsEditing(true);
  }

  // Synchronize drafts with current values whenever editing starts
  useEffect(() => {
    if (isEditing) {
      setEditFullName(fullName);
      setEditHeadline(headline);
    }
  }, [isEditing]);

  // Upload avatar/banner and save profile name and headline on Done
  async function handleDone() {
    setSaving(true);
    setUploadErr(null);
    let succeeded = false;
    try {
      const trimmedName = editFullName.trim();
      const trimmedHeadline = editHeadline.trim();

      if (!trimmedName) {
        throw new Error("Display name cannot be blank.");
      }

      if (user) {
        const profileUpdates: {
          id: string;
          full_name: string;
          headline: string | null;
          avatar_url?: string;
          banner_url?: string;
          updated_at?: string;
        } = {
          id: user.id,
          full_name: trimmedName,
          headline: trimmedHeadline || null,
          updated_at: new Date().toISOString(),
        };

        if (pendingAvatarBlob) {
          const path = `${user.id}/avatar-${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage.from("avatars").upload(path, pendingAvatarBlob, { contentType: "image/jpeg" });
          if (upErr) throw upErr;
          const { data } = supabase.storage.from("avatars").getPublicUrl(path);
          const url = data.publicUrl;
          setAvatarUrl(url);
          profileUpdates.avatar_url = url;
        }
        if (pendingBannerBlob) {
          const path = `${user.id}/banner-${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage.from("banners").upload(path, pendingBannerBlob, { contentType: "image/jpeg" });
          if (upErr) throw upErr;
          const { data } = supabase.storage.from("banners").getPublicUrl(path);
          const url = data.publicUrl;
          setBannerUrl(url);
          profileUpdates.banner_url = url;
        }

        // Upsert to profiles table so update succeeds even if row was freshly initialized
        const { error: updateError } = await supabase
          .from("profiles")
          .upsert(profileUpdates, { onConflict: "id" });
        if (updateError) throw updateError;

        // Keep Supabase auth user metadata in sync with profile full_name
        await supabase.auth.updateUser({
          data: { full_name: trimmedName },
        });

        await refreshProfile();
      }

      setSavedName(trimmedName);
      setSavedHeadline(trimmedHeadline || "");
      succeeded = true;
    } catch (e: any) {
      setUploadErr(e?.message ?? "Save failed — please try again.");
    } finally {
      if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
      if (pendingBannerPreview) URL.revokeObjectURL(pendingBannerPreview);
      setPendingAvatarBlob(null); setPendingAvatarPreview(null);
      setPendingBannerBlob(null); setPendingBannerPreview(null);
      setSaving(false);
      if (succeeded) setIsEditing(false);
    }
  }

  // Discard local previews and input drafts on Cancel
  function handleCancelEdit() {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    if (pendingBannerPreview) URL.revokeObjectURL(pendingBannerPreview);
    setPendingAvatarBlob(null); setPendingAvatarPreview(null);
    setPendingBannerBlob(null); setPendingBannerPreview(null);
    setEditFullName(fullName);
    setEditHeadline(headline);
    setUploadErr(null);
    setIsEditing(false);
  }

  // Per-section save handlers
  async function handleSaveAbout() {
    if (!user) { setEditingAbout(false); return; }
    setSaving(true); setUploadErr(null);
    try {
      const { error } = await supabase.from("profiles").update({ bio: editBio || null }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setEditingAbout(false);
    } catch (e: any) {
      setUploadErr(e?.message ?? "Save failed — please try again.");
    }
    setSaving(false);
  }

  async function handleSaveLinks() {
    if (!user) { setEditingLinks(false); return; }
    setSaving(true); setUploadErr(null);
    try {
      const { error } = await supabase.from("profiles").update({
        links: editLinks.filter((l) => l.url.trim()).map(({ label, url }) => ({ label: label.trim(), url: url.trim() })),
      }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setEditingLinks(false);
    } catch (e: any) {
      setUploadErr(e?.message ?? "Save failed — please try again.");
    }
    setSaving(false);
  }

  async function handleSaveSkills() {
    if (!user) { setEditingSkills(false); return; }
    setSaving(true); setUploadErr(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { skills: editSkills.map((s) => s.trim()).filter(Boolean) },
      });
      if (error) throw error;
      await refreshProfile();
      setEditingSkills(false);
    } catch (e: any) {
      setUploadErr(e?.message ?? "Save failed — please try again.");
    }
    setSaving(false);
  }

  const fullName =
    savedName ??
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Community Member";

  const headline =
    savedHeadline !== null
      ? savedHeadline
      : (profile?.headline ?? "");

  const rawUsername =
    profile?.username ??
    user?.user_metadata?.username ??
    null;

  const username = rawUsername ?? (user ? `user${user.id.replace(/-/g, "").slice(0, 8)}` : null);

  const initial = fullName.charAt(0).toUpperCase();
  const location = userLocation || profile?.location || "";
  const joinDate = user?.created_at ? new Date(user.created_at) : null;
  const joinMonth = joinDate ? joinDate.toLocaleString("default", { month: "long" }) : "January";
  const joinYear = joinDate ? joinDate.getFullYear() : 2025;
  const bio =
    profile?.bio ??
    "Atlanta-based community member passionate about closing local access gaps to Wi-Fi, mentorship, and first jobs. Always looking for new volunteer opportunities, study spaces, and friendly mentors who've walked the road before.";

  const rawLinks = profile?.links;
  const displayLinks: { label: string; url: string }[] =
    (Array.isArray(rawLinks) ? rawLinks as { label: string; url: string }[] : []).filter((l) => l?.url?.trim());
  const rawSkills = user?.user_metadata?.skills;
  const displaySkills: string[] = Array.isArray(rawSkills) ? rawSkills as string[] : [];

  const passProfileUrl = typeof window === "undefined"
    ? ""
    : `${window.location.origin}${import.meta.env.BASE_URL}share/${encodeURIComponent(username ?? "")}`;

  // Keyboard shortcut to close pass preview on Escape
  useEffect(() => {
    if (!passOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeCommunityPass();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [passOpen]);

  useEffect(() => {
    if (!passProfileUrl) return;
    let cancelled = false;
    void QRCode.toDataURL(passProfileUrl, {
      errorCorrectionLevel: "H",
      margin: 4,
      width: 900,
      color: { dark: "#070d1e", light: "#ffffff" },
    }).then((qrDataUrl) => {
      if (!cancelled) setPassQrUrl(qrDataUrl);
    }).catch(() => {
      if (!cancelled) setPassError("The QR code could not be generated.");
    });
    return () => { cancelled = true; };
  }, [passProfileUrl]);

  async function openCommunityPass() {
    if (!passProfileUrl) return;
    setPassOpen(true);
    setPassBusy(true);
    setPassError(null);
    if (passPdfUrl) URL.revokeObjectURL(passPdfUrl);
    setPassPdfUrl(null);
    try {
      const qrDataUrl = passQrUrl ?? await QRCode.toDataURL(passProfileUrl, {
        errorCorrectionLevel: "H",
        margin: 4,
        width: 900,
        color: { dark: "#070d1e", light: "#ffffff" },
      });
      const pdf = new jsPDF({ unit: "mm", format: "a4" });

      // Outer canvas background (Dark navy MyCommNet background)
      pdf.setFillColor(7, 13, 30);
      pdf.rect(0, 0, 210, 297, "F");

      // Pass card container (A4 dimensions: 210 x 297)
      // Centered card: x=20, y=20, width=170, height=257
      pdf.setFillColor(15, 23, 50);
      pdf.roundedRect(20, 20, 170, 257, 6, 6, "F");

      // Header accent bar
      pdf.setFillColor(88, 28, 135);
      pdf.roundedRect(20, 20, 170, 36, 6, 6, "F");
      pdf.rect(20, 46, 170, 10, "F");

      // MyCommNet header text
      pdf.setTextColor(79, 219, 200); // Brand teal
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("MYCOMMNET", 30, 33);
      pdf.setTextColor(255, 255, 255);
      pdf.text("· COMMUNITY MEMBER PASS", 62, 33);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(216, 180, 254);
      pdf.text("Shareable profile and QR access", 30, 41);

      // Member Name
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text(fullName, 30, 68, { maxWidth: 115 });

      // Member Avatar (if available)
      if (avatarUrl) {
        const avatarDataUrl = await imageUrlToDataUrl(avatarUrl);
        if (avatarDataUrl) {
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(150, 56, 26, 26, 3, 3, "F");
          pdf.addImage(avatarDataUrl, "JPEG", 151, 57, 24, 24);
        }
      }

      // Member headline or community role
      let currentY = 76;
      if (headline) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(79, 219, 200); // Teal
        pdf.text(headline, 30, currentY, { maxWidth: 115 });
        currentY += 7;
      }

      // Username & Membership
      pdf.setFontSize(9.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(168, 85, 247);
      if (username) {
        pdf.text(`@${username} · Community Member`, 30, currentY);
      } else {
        pdf.text("Community Member", 30, currentY);
      }

      // QR Code container (white card)
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(35, 93, 140, 124, 4, 4, "F");
      pdf.addImage(qrDataUrl, "PNG", 50, 97, 110, 110, undefined, "NONE");
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("Scan to view shareable profile & community connections", 105, 213, { align: "center" });

      // 4 Statistics Cards
      const statBoxes = [
        { label: "EVENTS ATTENDED", value: String(stats.eventsAttended), x: 26, y: 224 },
        { label: "SERVICE HOURS", value: String(stats.serviceHours), x: 65, y: 224 },
        { label: "GROUPS JOINED", value: String(stats.groupsJoined), x: 104, y: 224 },
        { label: "CONNECTIONS", value: String(stats.connections), x: 143, y: 224 },
      ];

      for (const box of statBoxes) {
        pdf.setFillColor(25, 33, 65);
        pdf.roundedRect(box.x, box.y, 37, 20, 2.5, 2.5, "F");
        pdf.setTextColor(203, 195, 215);
        pdf.setFontSize(6.5);
        pdf.setFont("helvetica", "bold");
        pdf.text(box.label, box.x + 18.5, box.y + 6.5, { align: "center" });
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(box.value, box.x + 18.5, box.y + 15, { align: "center" });
      }

      // Card footer
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(passProfileUrl, 105, 256, { align: "center", maxWidth: 150 });
      pdf.setTextColor(203, 195, 215);
      pdf.setFont("helvetica", "bold");
      pdf.text("MyCommNet Community Platform", 105, 263, { align: "center" });

      const blob = pdf.output("blob");
      setPassQrUrl(qrDataUrl);
      setPassPdfUrl(URL.createObjectURL(blob));
    } catch (error) {
      setPassError(error instanceof Error ? error.message : "The Community Pass PDF could not be generated.");
    } finally {
      setPassBusy(false);
    }
  }

  function closeCommunityPass() {
    if (passPdfUrl) URL.revokeObjectURL(passPdfUrl);
    setPassPdfUrl(null);
    setPassOpen(false);
  }

  function printCommunityPass() {
    if (!passPdfUrl) return;
    const printWindow = window.open(passPdfUrl, "_blank", "noopener,noreferrer");
    printWindow?.addEventListener("load", () => printWindow.print(), { once: true });
  }

  return (
    <AppShell>
      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFileSelected(f); e.target.value = ""; }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerFileSelected(f); e.target.value = ""; }}
      />

      {/* Crop modal */}
      {cropFile && cropMode === "avatar" && (
        <ImageCropper
          file={cropFile}
          aspect={1}
          shape="rect"
          title="Crop profile picture"
          onDone={handleAvatarCropDone}
          onCancel={() => { setCropFile(null); setCropMode(null); }}
        />
      )}
      {cropFile && cropMode === "banner" && (
        <ImageCropper
          file={cropFile}
          aspect={16 / 6}
          shape="rect"
          title="Crop cover photo"
          onDone={handleBannerCropDone}
          onCancel={() => { setCropFile(null); setCropMode(null); }}
        />
      )}

      {uploadErr && (
        <div className="mb-4 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(147,0,10,0.2)", color: "#ffb4ab", border: "1px solid rgba(147,0,10,0.4)" }}>
          {uploadErr}
        </div>
      )}

      {/* Cover + identity */}
      <section className="relative mb-6 rounded-3xl border border-border/60 overflow-visible">
        {/* Banner — name overlays the bottom edge */}
        <div
          className={`relative h-44 md:h-56 rounded-t-3xl overflow-hidden ${isEditing ? "group cursor-pointer" : ""}`}
          onClick={() => isEditing && bannerInputRef.current?.click()}
        >
          {(pendingBannerPreview ?? bannerUrl)
            ? <img src={pendingBannerPreview ?? bannerUrl!} alt="Profile banner" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-brand bg-hero-glow" />
          }
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,oklch(0.72_0.13_185/0.35),transparent_60%)]" />
          {/* Gradient scrim — keeps name legible against any banner image */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          {/* Name + user info sits in the banner just above the bar, cleared of the avatar */}
          {!isEditing && (
            <div className="absolute bottom-0 pb-4 pointer-events-none z-0" style={{ left: "calc(1.5rem + 8rem + 1rem)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9), 0 2px 24px rgba(0,0,0,0.7)" }}
                >
                  {fullName}
                </h1>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-teal/20 border border-brand-teal/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-teal">
                  <Shield className="h-3 w-3" /> Verified
                </span>
              </div>
            </div>
          )}
          {isEditing && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.35)" }}>
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <ImageIcon className="h-4 w-4" /> Change cover photo
              </div>
            </div>
          )}
        </div>

        {/* Bar — avatar straddles 50/50, info left, buttons right, all vertically centered */}
        <div className="relative rounded-b-3xl overflow-visible px-6 py-3 md:px-8 min-h-[5.5rem]" style={{ background: "var(--background)" }}>
          {/* Avatar — h-32 = 128px, -top-16 = 64px so exactly half in banner / half in bar */}
          <div
            className={`absolute left-6 md:left-8 -top-16 z-10 ${isEditing ? "group cursor-pointer" : ""}`}
            onClick={() => isEditing && avatarInputRef.current?.click()}
          >
            {(pendingAvatarPreview ?? avatarUrl)
              ? (
                <img
                  src={pendingAvatarPreview ?? avatarUrl!}
                  alt={fullName}
                  className="h-32 w-32 rounded-3xl border-4 object-cover shadow-glow-purple"
                  style={{ borderColor: "var(--background)" }}
                />
              )
              : (
                <span className="grid h-32 w-32 place-items-center rounded-3xl border-4 border-background bg-gradient-brand font-display text-4xl font-bold text-white shadow-glow-purple">
                  {initial}
                </span>
              )
            }
            {isEditing && (
              <div
                className="absolute inset-0 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
          </div>

          {/* Info left + buttons right */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ marginLeft: "calc(8rem + 1rem)" }}>
            {/* Left: user info or edit inputs */}
            {isEditing ? (
              <div className="flex-1 py-1 space-y-2.5 max-w-lg">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/80 mb-1">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      maxLength={80}
                      placeholder="Display name"
                      className="h-8.5 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-xs text-foreground outline-none focus:border-brand-teal transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/80 mb-1">
                      Headline <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editHeadline}
                      onChange={(e) => setEditHeadline(e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Student, Volunteer, IT Support"
                      className="h-8.5 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-xs text-foreground outline-none focus:border-brand-teal transition-colors"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Saved name and headline sync directly with your Community Pass card and generated PDF.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {username && (
                  <p className="flex items-center gap-1 text-sm font-medium" style={{ color: "#a078ff" }}>
                    <AtSign className="h-3.5 w-3.5" />{username}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 shrink-0" />
                    <span>Community Member</span>
                  </div>
                  {profile?.headline && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="font-semibold text-brand-teal">{profile.headline}</span>
                    </>
                  )}
                  <span className="opacity-40">·</span>
                  <span>Joined {joinMonth} {joinYear}</span>
                </div>
                {location && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />{location}
                  </p>
                )}
              </div>
            )}

            {/* Right: buttons */}
            <div className="flex gap-2 shrink-0 self-start md:self-center">
              {isEditing ? (
                <>
                  <button
                    onClick={handleDone}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl border border-brand-purple px-3.5 py-1.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#a078ff 0%,#0566d9 100%)" }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {saving ? "Saving…" : "Done"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-1.5 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={startEditingProfile}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-1.5 text-sm font-medium hover:bg-surface-2"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                </button>
              )}
              <button className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-1.5 text-sm font-medium hover:bg-surface-2">
                <Settings className="h-3.5 w-3.5" /> Settings
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* Left */}
        <div className="space-y-6">
          {/* Community Pass */}
          <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-brand p-6 text-white shadow-glow-purple">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
                  <Shield className="h-3.5 w-3.5 text-brand-teal" />
                  <span>Community Pass</span>
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                  COMMUNITY MEMBER PASS
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/40 shrink-0" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/20 font-display text-lg font-bold ring-2 ring-white/40 shrink-0">
                    {initial}
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold truncate">{fullName}</h2>
                  {headline ? (
                    <p className="text-xs font-medium text-brand-teal truncate">{headline}</p>
                  ) : (
                    <p className="text-xs text-white/70">Community Member</p>
                  )}
                  {username && <p className="text-[11px] text-white/60 truncate">@{username}</p>}
                </div>
              </div>

              {/* 4 Statistics Holders */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm border border-white/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Events Attended</p>
                  <p className="font-display text-lg font-bold text-white mt-0.5">{stats.eventsAttended}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm border border-white/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Service Hours</p>
                  <p className="font-display text-lg font-bold text-white mt-0.5">{stats.serviceHours}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm border border-white/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Groups Joined</p>
                  <p className="font-display text-lg font-bold text-white mt-0.5">{stats.groupsJoined}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm border border-white/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Connections</p>
                  <p className="font-display text-lg font-bold text-white mt-0.5">{stats.connections}</p>
                </div>
              </div>

              {stats.schemaPending && (
                <p className="mt-2 text-[10px] text-white/60 flex items-center gap-1">
                  <span>ℹ️ Activity records connected to Supabase (social schema pending deployment)</span>
                </p>
              )}
              {stats.error && !stats.schemaPending && (
                <p className="mt-2 text-[10px] text-red-200 flex items-center gap-1">
                  <span>⚠️ {stats.error}</span>
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-white/15">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/90">Shareable profile and QR access</p>
                  <p className="text-[11px] text-white/60 truncate">Click QR to preview, download, or print pass</p>
                </div>
                <button
                  type="button"
                  onClick={() => void openCommunityPass()}
                  aria-label="Open Community Pass PDF and print options"
                  title="Click to preview & print PDF Pass"
                  className="group flex flex-col items-center justify-center rounded-2xl bg-white p-2 text-slate-900 shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0"
                >
                  {passQrUrl ? (
                    <img src={passQrUrl} alt="QR code" className="h-14 w-14" />
                  ) : (
                    <QrCode className="h-14 w-14 text-brand-purple" aria-hidden="true" />
                  )}
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-brand-purple">
                    View Pass
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Links */}
          <section className="rounded-2xl border border-border/60 bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Links</h3>
              <button
                onClick={editingLinks ? handleSaveLinks : () => {
                  const savedLinks = profile?.links;
                  setEditLinks((Array.isArray(savedLinks) ? savedLinks as { label: string; url: string }[] : []).map((l) => ({ ...l, id: crypto.randomUUID() })));
                  setEditingLinks(true);
                }}
                disabled={saving}
                title={editingLinks ? "Save" : "Edit links"}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
              >
                {editingLinks ? <Check className="h-3.5 w-3.5 text-brand-teal" /> : <Edit3 className="h-3.5 w-3.5" />}
              </button>
            </div>
            {editingLinks ? (
              <div className="space-y-2">
                {editLinks.map((link) => (
                  <div key={link.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => setEditLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, label: e.target.value } : l))}
                      placeholder="Label"
                      className="w-28 h-8 px-2 rounded-lg text-xs shrink-0"
                      style={{ background: "#0b1326", border: "1px solid #1e293b", color: "#dae2fd", outline: "none" }}
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => setEditLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, url: e.target.value } : l))}
                      placeholder="https://…"
                      className="flex-1 min-w-0 h-8 px-2 rounded-lg text-xs"
                      style={{ background: "#0b1326", border: "1px solid #1e293b", color: "#dae2fd", outline: "none" }}
                    />
                    <button
                      type="button"
                      onClick={() => setEditLinks((prev) => prev.filter((l) => l.id !== link.id))}
                      className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
                      style={{ color: "#958ea0" }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEditLinks((prev) => [...prev, { id: crypto.randomUUID(), label: "", url: "" }])}
                  className="flex items-center gap-1.5 text-xs mt-1 px-2 py-1.5 rounded-lg hover:bg-surface-2 transition-colors"
                  style={{ color: "#a078ff" }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add link
                </button>
              </div>
            ) : displayLinks.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {displayLinks.map((l) => {
                  const Icon = getLinkIcon(l.url);
                  return (
                    <li key={l.url + l.label}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{l.label || l.url}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No links added yet.</p>
            )}
          </section>

          {/* Skills */}
          <section className="rounded-2xl border border-border/60 bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Skills & Interests</h3>
              <button
                onClick={editingSkills ? handleSaveSkills : () => {
                  const savedSkills = user?.user_metadata?.skills;
                  setEditSkills(Array.isArray(savedSkills) ? savedSkills as string[] : []);
                  setEditingSkills(true);
                }}
                disabled={saving}
                title={editingSkills ? "Save" : "Edit skills"}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
              >
                {editingSkills ? <Check className="h-3.5 w-3.5 text-brand-teal" /> : <Edit3 className="h-3.5 w-3.5" />}
              </button>
            </div>
            {editingSkills ? (
              <div className="space-y-3">
                {/* Current skills with remove buttons */}
                {editSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {editSkills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-brand-soft px-3 py-1 text-xs font-medium text-foreground ring-1 ring-brand-purple/30"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setEditSkills((prev) => prev.filter((x) => x !== s))}
                          className="ml-0.5 grid h-3.5 w-3.5 place-items-center rounded-full hover:bg-white/20 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Typeahead input */}
                <ProfileTagInput
                  suggestions={SKILL_SUGGESTIONS}
                  existingValues={editSkills}
                  onAdd={(v) => setEditSkills((prev) => prev.some((s) => s.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v])}
                />
                {/* Suggestion chips */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#958ea0" }}>Suggestions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_PRESETS.filter((s) => !editSkills.includes(s)).slice(0, 14).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditSkills((prev) => [...prev, s])}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all hover:opacity-80 active:scale-95"
                        style={{ background: "rgba(160,120,255,0.08)", color: "#cbc3d7", border: "1px solid #1e293b" }}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {displaySkills.length > 0
                  ? displaySkills.map((s) => (
                    <span key={s} className="rounded-full bg-gradient-brand-soft px-3 py-1 text-xs font-medium text-foreground ring-1 ring-brand-purple/30">
                      {s}
                    </span>
                  ))
                  : <p className="text-xs text-muted-foreground">No skills added yet.</p>
                }
              </div>
            )}
          </section>

          {/* Saved */}
          <section className="rounded-2xl border border-border/60 bg-surface p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
              <Bookmark className="h-4 w-4 text-brand-teal" /> Saved
            </h3>
            <ul className="space-y-2">
              {saved.map((s) => (
                <li key={s.label} className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
                  <span>{s.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.type}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Personalization */}
          <section className="rounded-2xl border border-border/60 bg-surface p-5">
            <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
              <SlidersHorizontal className="h-4 w-4 text-brand-purple" /> Personalization
            </h3>
            {!profile?.onboarding_complete ? (
              <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
                Complete your profile survey so we can tailor recommendations, resources, and community matches just for you.
              </p>
            ) : (
              <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
                Update your interests, situation, and preferences any time to keep your recommendations fresh.
              </p>
            )}
            <Link
              to="/onboarding"
              search={{ mode: "edit" }}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#a078ff 0%,#0566d9 100%)" }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {profile?.onboarding_complete ? "Edit My Preferences" : "Take the Survey"}
            </Link>

            {/* Survey summary — always shown if user exists */}
            {user && <SurveySummary userId={user.id} />}
          </section>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-surface p-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">About</h3>
              <button
                onClick={editingAbout ? handleSaveAbout : () => { setEditBio(profile?.bio ?? ""); setEditingAbout(true); }}
                disabled={saving}
                title={editingAbout ? "Save" : "Edit about"}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
              >
                {editingAbout ? <Check className="h-3.5 w-3.5 text-brand-teal" /> : <Edit3 className="h-3.5 w-3.5" />}
              </button>
            </div>
            {editingAbout ? (
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={5}
                placeholder="Tell your community about yourself…"
                className="w-full rounded-lg text-sm p-3 resize-none leading-relaxed"
                style={{ background: "#0b1326", border: "1px solid #1e293b", color: "#dae2fd", outline: "none" }}
              />
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">{bio}</p>
            )}
          </section>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Community hours", value: stats.serviceHours, icon: Award },
              { label: "Groups", value: stats.groupsJoined, icon: Heart },
              { label: "Connections", value: stats.connections, icon: LinkIcon },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-border/60 bg-surface p-4 text-center">
                  <Icon className="mx-auto mb-2 h-5 w-5 text-brand-teal" />
                  <p className="font-display text-2xl font-bold">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Goals */}
          {user && <GoalsInProgress userId={user.id} />}

          {/* Timeline */}
          <section className="rounded-2xl border border-border/60 bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">My Timeline</h3>
              <button className="text-xs text-brand-teal hover:underline">Export for resume →</button>
            </div>
            <div className="relative space-y-6 border-l border-border/60 pl-6">
              {timeline.map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={i} className="relative">
                    <span className="absolute -left-[34px] grid h-7 w-7 place-items-center rounded-full bg-gradient-brand shadow-glow-purple">
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </span>
                    <p className="font-display text-base font-semibold">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.org} · {t.date}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      {/* Community Pass PDF Preview Modal */}
      {passOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-3 sm:p-6 transition-all duration-200 motion-reduce:transition-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="community-pass-title"
          onClick={(e) => { if (e.target === e.currentTarget) closeCommunityPass(); }}
        >
          <div className="flex flex-col w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-surface shadow-2xl animate-in zoom-in-95 fade-in-0 duration-200 motion-reduce:animate-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-surface">
              <div>
                <h2 id="community-pass-title" className="font-display text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand-teal" />
                  <span>COMMUNITY MEMBER PASS</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Shareable profile and QR access
                </p>
              </div>
              <button
                type="button"
                onClick={closeCommunityPass}
                aria-label="Close Community Pass preview"
                className="rounded-xl p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / PDF Preview Focus */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {passBusy && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
                  <p className="text-sm font-medium">Generating your Community Pass PDF…</p>
                  <p className="text-xs text-muted-foreground">Rendering credentials and high-resolution QR pass</p>
                </div>
              )}

              {passError && (
                <div className="space-y-4 rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-sm text-red-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-300 mt-0.5" />
                    <div>
                      <p className="font-semibold">Unable to generate PDF preview</p>
                      <p className="text-xs text-red-300/80 mt-1">{passError}</p>
                      <button
                        type="button"
                        onClick={() => void openCommunityPass()}
                        className="mt-2 text-xs font-semibold text-brand-teal hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>

                  {passQrUrl && (
                    <div className="mx-auto max-w-sm rounded-xl bg-white p-5 text-center text-slate-900 shadow-md">
                      <p className="font-bold text-base">{fullName}</p>
                      {profile?.headline && <p className="text-xs font-medium text-slate-600 mt-0.5">{profile.headline}</p>}
                      {username && <p className="text-xs text-slate-500">@{username}</p>}
                      <img src={passQrUrl} alt="QR code for your shareable profile" className="mx-auto my-3 aspect-square w-48" />
                      <p className="break-all text-[11px] text-slate-500">{passProfileUrl}</p>
                    </div>
                  )}
                </div>
              )}

              {!passBusy && !passError && passPdfUrl && (
                <div className="flex flex-col items-center">
                  <iframe
                    title="Community Pass PDF preview"
                    src={passPdfUrl}
                    className="h-[58vh] min-h-[340px] max-h-[620px] w-full rounded-xl border border-border/60 bg-white shadow-inner"
                  />
                  <div className="mt-3 flex items-center justify-between w-full px-1 text-[11px] text-muted-foreground">
                    <span>QR destination: <span className="font-mono text-brand-teal">{passProfileUrl}</span></span>
                    <span className="hidden sm:inline">Use Download or Print below for offline copies</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border/60 px-5 py-3.5 bg-surface">
              <span className="text-[11px] text-muted-foreground hidden md:inline">
                MyCommNet Community Pass · MyCommNet Community Platform
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {passPdfUrl && (
                  <>
                    <a
                      href={passPdfUrl}
                      download={`${username ?? "community"}-pass.pdf`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-teal"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </a>
                    <button
                      type="button"
                      onClick={printCommunityPass}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-teal"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeCommunityPass}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-teal"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
