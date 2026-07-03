import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, Sparkles, X, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { generateTags, type Prefs } from "@/lib/tags";

const logoSrc = "/logo.png";
const mono = { fontFamily: "'JetBrains Mono', monospace" };

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "edit" ? ("edit" as const) : ("setup" as const),
  }),
  component: OnboardingPage,
});

// ── Option data ─────────────────────────────────────────────────────────────

const AGE_OPTIONS = [
  { label: "Under 18", value: "under_18" },
  { label: "18–24", value: "18_24" },
  { label: "25–34", value: "25_34" },
  { label: "35–44", value: "35_44" },
  { label: "45–54", value: "45_54" },
  { label: "55–64", value: "55_64" },
  { label: "65+", value: "65_plus" },
];

const GENDER_OPTIONS = [
  { label: "Man", value: "man" },
  { label: "Woman", value: "woman" },
  { label: "Non-binary", value: "nonbinary" },
  { label: "Genderfluid", value: "genderfluid" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
  { label: "Other", value: "other" },
];

const ETHNICITY_OPTIONS = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Hispanic or Latino",
  "Middle Eastern or North African",
  "Native Hawaiian or Pacific Islander",
  "White",
  "Two or more races",
  "Prefer not to say",
  "Other",
];

const LIFE_OPTIONS = [
  { label: "High school student", value: "high_school_student" },
  { label: "College / university student", value: "college_student" },
  { label: "Employed full-time", value: "employed_fulltime" },
  { label: "Employed part-time", value: "employed_parttime" },
  { label: "Self-employed / freelance", value: "self_employed" },
  { label: "Looking for work", value: "looking_for_work" },
  { label: "Between jobs", value: "between_jobs" },
  { label: "Caregiver", value: "caregiver" },
  { label: "Retired", value: "retired" },
  { label: "Volunteer", value: "volunteer" },
  { label: "Other", value: "other" },
];

const TRANSPORT_OPTIONS = [
  { label: "Walk", value: "walk" },
  { label: "Bike", value: "bike" },
  { label: "Bus", value: "bus" },
  { label: "Train", value: "train" },
  { label: "Car", value: "car" },
  { label: "Rides from others", value: "rides" },
];

const TRAVEL_OPTIONS = [
  { label: "Only nearby", value: "only_nearby" },
  { label: "Within my city", value: "within_city" },
  { label: "Nearby towns", value: "nearby_towns" },
  { label: "Anywhere in the state", value: "statewide" },
];

const ACCESS_OPTIONS = [
  { label: "Online options", value: "online_options" },
  { label: "Physically accessible places", value: "accessible_places" },
  { label: "Evening / weekend hours", value: "evening_hours" },
  { label: "Teen-friendly", value: "teen_friendly" },
  { label: "Family-friendly", value: "family_friendly" },
];

const RESOURCE_OPTIONS = [
  { label: "Jobs", value: "jobs" },
  { label: "Job training", value: "job_training" },
  { label: "Certifications", value: "certifications" },
  { label: "Free Wi-Fi", value: "free_wifi" },
  { label: "Computers", value: "computers" },
  { label: "Food", value: "food" },
  { label: "Affordable restaurants", value: "affordable_restaurants" },
  { label: "Transportation", value: "transportation" },
  { label: "Education", value: "education" },
  { label: "Mentors", value: "mentors" },
  { label: "Events", value: "events" },
  { label: "Groups", value: "groups" },
  { label: "Networking", value: "networking" },
];

const ACCESS_SUGGESTIONS = [
  "Bilingual staff / language support",
  "Interpreter services",
  "Sign language interpreter",
  "Childcare available on-site",
  "Disability accommodations",
  "Wheelchair accessible",
  "Quiet / low-stimulation environment",
  "Sensory-friendly",
  "LGBTQ+ affirming",
  "Safe space for youth",
  "Mental health support on-site",
  "Veteran-friendly",
  "Reentry / formerly incarcerated friendly",
  "No ID required",
  "No credit check required",
  "Sliding scale fees",
  "Drop-in hours (no appointment needed)",
  "Same-day availability",
  "Waiting area available",
  "Private and confidential",
  "Faith-based options",
  "Secular (non-religious) options",
  "Trauma-informed staff",
  "Cultural competency",
  "Gender-affirming services",
  "Indigenous community services",
  "Safe parking available",
  "Shower / hygiene facilities",
  "Pet-friendly",
];

const RESOURCE_SUGGESTIONS = [
  "Legal aid",
  "Housing assistance",
  "Emergency shelter",
  "Rent assistance",
  "Utility bill help",
  "Clothing / thrift stores",
  "Free healthcare clinics",
  "Dental care",
  "Vision care / eyeglasses",
  "Mental health services",
  "Substance use support",
  "Childcare services",
  "Youth programs",
  "Senior services",
  "Disability services",
  "Immigration services",
  "Financial literacy classes",
  "Credit building",
  "Free bank accounts",
  "GED / HiSET prep",
  "College prep",
  "Scholarships",
  "Internships",
  "Apprenticeships",
  "Resume help",
  "Interview coaching",
  "Micro-grants",
  "Small business support",
  "Studio / recording space",
  "Co-working space",
  "3D printing / maker space",
  "Tutoring",
  "After-school programs",
  "Summer camps",
  "Sports programs",
  "Arts & music programs",
  "Photography or film equipment",
  "Free gym or fitness",
  "Peer support groups",
  "Food pantries",
  "Community fridges",
  "Diaper banks",
  "Baby supplies",
  "Tax preparation help",
  "Voting registration help",
  "Prescription assistance",
];

const INTEREST_OPTIONS = [
  { label: "Cosplay", value: "cosplay" },
  { label: "Comics", value: "comics" },
  { label: "Anime", value: "anime" },
  { label: "Gaming", value: "gaming" },
  { label: "Books", value: "books" },
  { label: "Art", value: "art" },
  { label: "Music", value: "music" },
  { label: "Sports", value: "sports" },
  { label: "Volunteering", value: "volunteering" },
  { label: "Technology", value: "technology" },
  { label: "Coding", value: "coding" },
  { label: "Business", value: "business" },
  { label: "Fitness", value: "fitness" },
  { label: "Fashion", value: "fashion" },
  { label: "Content creation", value: "content_creation" },
  { label: "Community service", value: "community_service" },
];

const INTEREST_SUGGESTIONS = [
  "Photography", "Cooking", "Hiking", "Travel", "Painting", "Drawing",
  "Sculpting", "Theater", "Dance", "Yoga", "Meditation", "Gardening",
  "Crafts", "DIY", "Writing", "Blogging", "Podcasting", "Swimming",
  "Cycling", "Rock climbing", "Skateboarding", "Surfing", "Robotics",
  "3D printing", "Languages", "Film", "Astronomy", "Chess", "Board games",
  "Tabletop RPG", "Weightlifting", "Martial arts", "Soccer", "Basketball",
  "Baseball", "Football", "Tennis", "Golf", "Archery", "Bowling",
  "Fishing", "Camping", "Bird watching", "K-pop", "Poetry", "Debate",
  "Public speaking", "Cooking", "Baking", "Sewing", "Knitting",
  "Stand-up comedy", "Esports", "Nature", "History", "Philosophy",
];

const CAREER_OPTIONS = [
  { label: "Healthcare", value: "healthcare" },
  { label: "Education", value: "education" },
  { label: "Technology", value: "technology" },
  { label: "Design", value: "design" },
  { label: "Trades", value: "trades" },
  { label: "Business", value: "business" },
  { label: "Government", value: "government" },
  { label: "Nonprofit", value: "nonprofit" },
  { label: "Media", value: "media" },
  { label: "Hospitality", value: "hospitality" },
  { label: "Law", value: "law" },
  { label: "Science", value: "science" },
  { label: "Entrepreneurship", value: "entrepreneurship" },
];

const CAREER_SUGGESTIONS = [
  "Agriculture", "Architecture", "Aviation", "Cybersecurity", "Data Science",
  "Engineering", "Environmental Science", "Fashion Industry", "Film / TV",
  "Finance", "Forensics", "Gaming Industry", "Interior Design",
  "International Relations", "Journalism", "Linguistics", "Marine Biology",
  "Marketing", "Music Industry", "Nursing", "Pharmacy", "Physical Therapy",
  "Psychology", "Public Health", "Real Estate", "Social Work",
  "Sports Management", "Urban Planning", "Veterinary Medicine",
  "Culinary Arts", "Construction", "Cosmetology", "Criminal Justice",
  "Dental", "Electrical", "Plumbing", "Welding", "Early Childhood Education",
];

const CONTENT_OPTIONS = [
  { label: "Community-focused", value: "community" },
  { label: "Service / resource-focused", value: "service" },
  { label: "Both", value: "both" },
];

const ENGAGEMENT_OPTIONS = [
  { label: "Browse resources", value: "browse" },
  { label: "Join groups & events", value: "groups" },
  { label: "Both", value: "both" },
];

const STEPS = [
  { title: "Where are you located?", subtitle: "Only your state/province is required — city and ZIP code are optional but help us find better matches." },
  { title: "About you", subtitle: "Totally optional — helps us personalise your experience. Skip anything you'd rather not share." },
  { title: "Tell us about yourself", subtitle: "We'll personalise your experience based on your current situation." },
  { title: "Getting around", subtitle: "Help us understand how you travel and what fits your budget." },
  { title: "Access preferences", subtitle: "Any specific needs when accessing resources or programmes?" },
  { title: "What can we help you find?", subtitle: "Select everything you're looking for — pick as many as you like." },
  { title: "Your interests", subtitle: "Tell us what you're into — personally and career-wise. Add anything we missed!" },
  { title: "Community style", subtitle: "How do you like to engage with your community?" },
];

// ── Chip component ───────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
  onRemove,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95"
      style={{
        border: selected ? "1px solid #a078ff" : "1px solid #1e293b",
        background: selected ? "rgba(160,120,255,0.15)" : "rgba(11,19,38,0.6)",
        color: selected ? "#dae2fd" : "#958ea0",
      }}
    >
      {selected && <Check className="h-3 w-3 flex-shrink-0" style={{ color: "#a078ff" }} />}
      {label}
      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 grid h-4 w-4 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  );
}

// ── Custom interest input with typeahead ─────────────────────────────────────

function CustomInterestInput({
  placeholder,
  suggestions,
  existingValues,
  onAdd,
}: {
  placeholder: string;
  suggestions: string[];
  existingValues: string[];
  onAdd: (value: string) => void;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const existing = existingValues.map((v) =>
    v.startsWith("custom:") ? v.slice(7).toLowerCase() : v.toLowerCase()
  );

  const filtered = input.trim().length > 0
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) &&
          !existing.includes(s.toLowerCase())
      ).slice(0, 6)
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
    onAdd(`custom:${trimmed}`);
    setInput("");
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) add(filtered[0]);
      else if (input.trim()) add(input.trim());
    }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={ref} className="relative max-w-sm">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="w-full h-10 pl-4 pr-10 rounded-lg text-sm"
          style={{
            background: "#0b1326",
            border: "1px solid #1e293b",
            color: "#dae2fd",
            outline: "none",
          }}
        />
        {input && (
          <button
            type="button"
            onClick={() => add(input.trim())}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ background: "rgba(160,120,255,0.2)", color: "#a078ff" }}
          >
            Add
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul
          className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{
            background: "rgba(15,23,42,0.97)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(s); }}
                className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/5"
                style={{ color: "#cbc3d7" }}
              >
                {s}
              </button>
            </li>
          ))}
          {input.trim() && !filtered.some((s) => s.toLowerCase() === input.trim().toLowerCase()) && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(input.trim()); }}
                className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/5"
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

// ── Empty prefs ──────────────────────────────────────────────────────────────

const EMPTY_PREFS: Prefs = {
  zip_code: "",
  age_range: null,
  gender: null,
  ethnicity: null,
  life_status: null,
  occupation: "",
  transportation_modes: [],
  travel_range: null,
  low_cost_priority: false,
  access_preferences: [],
  resource_interests: [],
  personal_interests: [],
  career_interests: [],
  content_preference: null,
  engagement_preference: null,
};

// ── Draft helpers ─────────────────────────────────────────────────────────────

function draftKey(userId: string) {
  return `mycommnet_onboarding_draft_${userId}`;
}

type Draft = {
  step: number;
  prefs: Prefs;
  locCountry: string;
  locState: string;
  locCity: string;
  locZip: string;
};

function saveDraft(userId: string, draft: Draft) {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {}
}

function loadDraft(userId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function clearDraft(userId: string) {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {}
}

// ── Page ─────────────────────────────────────────────────────────────────────

function OnboardingPage() {
  const { mode } = Route.useSearch();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [occFocused, setOccFocused] = useState(false);
  const [locCountry, setLocCountry] = useState("US");
  const [locState, setLocState] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locZip, setLocZip] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [zipFocused, setZipFocused] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);
  const [stateFocused, setStateFocused] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Load from Supabase (or draft if mid-survey)
  useEffect(() => {
    if (!user) return;

    supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        const draft = loadDraft(user.id);

        if (data?.onboarding_completed) {
          // Already completed — load saved prefs (no draft restore)
          const loaded: Prefs = {
            zip_code: data.zip_code ?? "",
            age_range: data.age_range ?? null,
            gender: (data as Record<string, unknown>).gender as string ?? null,
            ethnicity: (data as Record<string, unknown>).ethnicity as string ?? null,
            life_status: data.life_status ?? null,
            occupation: data.occupation ?? "",
            transportation_modes: data.transportation_modes ?? [],
            travel_range: data.travel_range ?? null,
            low_cost_priority: data.low_cost_priority ?? false,
            access_preferences: data.access_preferences ?? [],
            resource_interests: data.resource_interests ?? [],
            personal_interests: data.personal_interests ?? [],
            career_interests: data.career_interests ?? [],
            content_preference: data.content_preference ?? null,
            engagement_preference: data.engagement_preference ?? null,
          };
          setPrefs(loaded);
          if (data.zip_code) {
            const parts = data.zip_code.split("|");
            if (parts.length === 4) {
              setLocCity(parts[0]);
              setLocState(parts[1]);
              setLocCountry(parts[2]);
              setLocZip(parts[3]);
            } else {
              setLocZip(data.zip_code);
            }
          }
        } else if (draft) {
          // Restore mid-survey draft
          setPrefs(draft.prefs);
          setStep(draft.step);
          setLocCountry(draft.locCountry);
          setLocState(draft.locState);
          setLocCity(draft.locCity);
          setLocZip(draft.locZip);
        }

        setDataLoading(false);
      });
  }, [user]);

  // Auto-save draft on every change
  useEffect(() => {
    if (!user || dataLoading) return;
    saveDraft(user.id, { step, prefs, locCountry, locState, locCity, locZip });
  }, [step, prefs, locCountry, locState, locCity, locZip, user, dataLoading]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleMulti(key: keyof Prefs, val: string) {
    setPrefs((p) => {
      const arr = (p[key] as string[]) ?? [];
      return { ...p, [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  }

  function setSingle(key: keyof Prefs, val: string | null) {
    setPrefs((p) => ({ ...p, [key]: p[key] === val ? null : val }));
  }

  function addCustomInterest(key: "personal_interests" | "career_interests" | "access_preferences" | "resource_interests", value: string) {
    setPrefs((p) => {
      const arr = (p[key] ?? []).filter((v) => v !== value);
      return { ...p, [key]: [...arr, value] };
    });
  }

  function removeInterest(key: "personal_interests" | "career_interests" | "access_preferences" | "resource_interests", value: string) {
    setPrefs((p) => ({ ...p, [key]: (p[key] ?? []).filter((v) => v !== value) }));
  }

  async function handleZipChange(val: string) {
    setLocZip(val);
    if (locCountry === "US" && /^\d{5}$/.test(val)) {
      setAutoFilling(true);
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${val}`);
        if (res.ok) {
          const json = await res.json();
          const place = json.places?.[0];
          if (place) {
            setLocCity(place["place name"] ?? "");
            setLocState(place["state"] ?? "");
          }
        }
      } catch {}
      setAutoFilling(false);
    }
  }

  function handleClearSurvey() {
    if (!user) return;
    setPrefs(EMPTY_PREFS);
    setLocCountry("US");
    setLocState("");
    setLocCity("");
    setLocZip("");
    setStep(0);
    clearDraft(user.id);
    setShowClearConfirm(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    try {
      const compositeLocation = [locCity, locState, locCountry, locZip].join("|");

      const upsertData: Record<string, unknown> = {
        user_id: user.id,
        zip_code: compositeLocation,
        age_range: prefs.age_range,
        gender: prefs.gender,
        ethnicity: prefs.ethnicity,
        life_status: prefs.life_status,
        occupation: prefs.occupation,
        transportation_modes: prefs.transportation_modes,
        travel_range: prefs.travel_range,
        low_cost_priority: prefs.low_cost_priority,
        access_preferences: prefs.access_preferences,
        resource_interests: prefs.resource_interests,
        personal_interests: prefs.personal_interests,
        career_interests: prefs.career_interests,
        content_preference: prefs.content_preference,
        engagement_preference: prefs.engagement_preference,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { error: prefErr } = await (supabase as any)
        .from("user_preferences")
        .upsert(upsertData, { onConflict: "user_id" });

      // If gender/ethnicity columns don't exist yet, retry without them
      if (prefErr && (prefErr.message?.includes("gender") || prefErr.message?.includes("schema cache"))) {
        delete upsertData.gender;
        delete upsertData.ethnicity;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const retry = await (supabase as any)
          .from("user_preferences")
          .upsert(upsertData, { onConflict: "user_id" });
        prefErr = retry.error;
      }

      if (prefErr) throw prefErr;

      const tags = generateTags(prefs);
      await supabase.from("user_tags").delete().eq("user_id", user.id);
      if (tags.length > 0) {
        await supabase
          .from("user_tags")
          .insert(tags.map((tag) => ({ user_id: user.id, tag, source: "onboarding" })));
      }

      await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", user.id);

      clearDraft(user.id);
      await refreshProfile();
      navigate({ to: mode === "edit" ? "/profile" : "/main" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Unknown error";
      console.error("[Onboarding save error]", err);
      setSaveError(`Save failed: ${msg}`);
      setSaving(false);
    }
  }

  function advance() {
    if (step === 0 && !locState.trim()) {
      setSaveError("State / Province is required — please enter it before continuing.");
      return;
    }
    setSaveError(null);
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleFinish();
  }

  function back() {
    setStep((s) => s - 1);
  }

  // ── Step content ──────────────────────────────────────────────────────────

  function renderStep() {
    const inputBase: React.CSSProperties = {
      background: "#0b1326",
      border: "1px solid #1e293b",
      color: "#dae2fd",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    };
    const inputFocus: React.CSSProperties = {
      borderColor: "#4fdbc8",
      boxShadow: "0 0 0 1px #4fdbc8",
    };
    const labelStyle: React.CSSProperties = { color: "#cbc3d7", ...mono };
    const selectBase: React.CSSProperties = {
      ...inputBase,
      appearance: "none" as const,
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23958ea0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
      paddingRight: "36px",
    };

    switch (step) {
      // Step 0 — Location
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2" style={labelStyle}>
                Country
              </label>
              <select
                value={locCountry}
                onChange={(e) => { setLocCountry(e.target.value); setLocState(""); setLocCity(""); }}
                className="w-full h-11 px-4 rounded-lg text-sm"
                style={selectBase}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="MX">Mexico</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ ...labelStyle, color: stateFocused ? "#4fdbc8" : "#cbc3d7", transition: "color 0.2s" }}
              >
                {locCountry === "CA" ? "Province / Territory" : locCountry === "UK" ? "County / Region" : "State / Province"}
                <span style={{ color: "#ff6b6b", marginLeft: "4px" }}>*</span>
              </label>
              <input
                type="text"
                value={locState}
                onChange={(e) => setLocState(e.target.value)}
                onFocus={() => setStateFocused(true)}
                onBlur={() => setStateFocused(false)}
                placeholder={locCountry === "US" ? "e.g. Georgia" : locCountry === "CA" ? "e.g. Ontario" : "e.g. England"}
                className="w-full h-11 px-4 rounded-lg text-sm"
                style={{ ...inputBase, ...(stateFocused ? inputFocus : {}) }}
              />
            </div>

            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ ...labelStyle, color: zipFocused ? "#4fdbc8" : "#cbc3d7", transition: "color 0.2s" }}
              >
                {locCountry === "CA" ? "Postal code" : locCountry === "UK" ? "Postcode" : "ZIP code"}
                <span style={{ color: "#4a5568", marginLeft: "8px", textTransform: "none", letterSpacing: "normal" }}>
                  {locCountry === "US"
                    ? "— optional · auto-fills city & state · helps find better matches"
                    : "— optional, for better matches"}
                </span>
              </label>
              <div className="relative max-w-xs">
                <input
                  type="text"
                  value={locZip}
                  onChange={(e) => handleZipChange(e.target.value)}
                  onFocus={() => setZipFocused(true)}
                  onBlur={() => setZipFocused(false)}
                  placeholder={locCountry === "CA" ? "A1A 1A1" : locCountry === "UK" ? "SW1A 1AA" : "e.g. 30301"}
                  maxLength={10}
                  className="w-full h-11 px-4 rounded-lg text-sm"
                  style={{ ...inputBase, ...(zipFocused ? inputFocus : {}) }}
                />
                {autoFilling && (
                  <span className="absolute right-3 top-3 text-xs" style={{ color: "#4fdbc8", ...mono }}>
                    Looking up…
                  </span>
                )}
              </div>
            </div>

            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ ...labelStyle, color: cityFocused ? "#4fdbc8" : "#cbc3d7", transition: "color 0.2s" }}
              >
                City
                {autoFilling ? (
                  <span style={{ color: "#4fdbc8", marginLeft: "8px", textTransform: "none", letterSpacing: "normal" }}>
                    auto-filling…
                  </span>
                ) : (
                  <span style={{ color: "#4a5568", marginLeft: "8px", textTransform: "none", letterSpacing: "normal" }}>
                    — optional, for better matches
                  </span>
                )}
              </label>
              <input
                type="text"
                value={locCity}
                onChange={(e) => setLocCity(e.target.value)}
                onFocus={() => setCityFocused(true)}
                onBlur={() => setCityFocused(false)}
                placeholder="e.g. Atlanta"
                className="w-full h-11 px-4 rounded-lg text-sm"
                style={{ ...inputBase, ...(cityFocused ? inputFocus : {}) }}
              />
            </div>
          </div>
        );

      // Step 1 — Demographics (age, gender, ethnicity)
      case 1:
        return (
          <div className="space-y-7">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={labelStyle}>
                Age range
              </label>
              <div className="flex flex-wrap gap-2">
                {AGE_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={prefs.age_range === o.value}
                    onClick={() => setSingle("age_range", o.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={labelStyle}>
                Gender
              </label>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={prefs.gender === o.value}
                    onClick={() => setSingle("gender", o.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-2" style={labelStyle}>
                Ethnicity
                <span style={{ color: "#4a5568", marginLeft: "8px", textTransform: "none", letterSpacing: "normal" }}>
                  — optional
                </span>
              </label>
              <select
                value={prefs.ethnicity ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, ethnicity: e.target.value || null }))}
                className="w-full h-11 px-4 rounded-lg text-sm"
                style={selectBase}
              >
                <option value="">Prefer not to answer</option>
                {ETHNICITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        );

      // Step 2 — Life Status + Occupation
      case 2:
        return (
          <div className="space-y-7">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: "#cbc3d7", ...mono }}>
                Current life status / situation
              </label>
              <div className="flex flex-wrap gap-2">
                {LIFE_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={prefs.life_status === o.value}
                    onClick={() => setSingle("life_status", o.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: occFocused ? "#4fdbc8" : "#cbc3d7", transition: "color 0.2s", ...mono }}
              >
                Current occupation{" "}
                <span style={{ color: "#4a5568", textTransform: "none", letterSpacing: "normal" }}>
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={prefs.occupation ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, occupation: e.target.value }))}
                onFocus={() => setOccFocused(true)}
                onBlur={() => setOccFocused(false)}
                placeholder="e.g. Student, Warehouse associate, Freelancer…"
                className="w-full h-11 px-4 rounded-lg text-sm"
                style={{ ...inputBase, ...(occFocused ? inputFocus : {}) }}
              />
            </div>
          </div>
        );

      // Step 3 — Getting around
      case 3:
        return (
          <div className="space-y-7">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: "#cbc3d7", ...mono }}>
                How do you usually get around?
              </label>
              <div className="flex flex-wrap gap-2">
                {TRANSPORT_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={(prefs.transportation_modes ?? []).includes(o.value)}
                    onClick={() => toggleMulti("transportation_modes", o.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: "#cbc3d7", ...mono }}>
                How far are you willing to travel?
              </label>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={prefs.travel_range === o.value}
                    onClick={() => setSingle("travel_range", o.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: "#cbc3d7", ...mono }}>
                Cost preference
              </label>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, low_cost_priority: !p.low_cost_priority }))}
                className="flex items-center gap-4 rounded-xl px-5 py-3.5 w-full max-w-sm transition-all"
                style={{
                  border: prefs.low_cost_priority ? "1px solid #a078ff" : "1px solid #1e293b",
                  background: prefs.low_cost_priority ? "rgba(160,120,255,0.1)" : "rgba(11,19,38,0.6)",
                }}
              >
                <div
                  className="w-10 h-6 rounded-full flex items-center transition-all flex-shrink-0"
                  style={{
                    background: prefs.low_cost_priority ? "linear-gradient(135deg,#a078ff,#0566d9)" : "#1e293b",
                    padding: "2px",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-white transition-all"
                    style={{ transform: prefs.low_cost_priority ? "translateX(16px)" : "translateX(0)" }}
                  />
                </div>
                <span className="text-sm" style={{ color: prefs.low_cost_priority ? "#dae2fd" : "#958ea0" }}>
                  Prioritise free / low-cost options
                </span>
              </button>
            </div>
          </div>
        );

      // Step 4 — Access preferences
      case 4: {
        const accessSelected = prefs.access_preferences ?? [];
        const customAccess = accessSelected.filter((v) => v.startsWith("custom:"));
        return (
          <div className="space-y-3">
            <p className="text-sm mb-4" style={{ color: "#cbc3d7" }}>
              Select anything that applies to you. We'll use these to filter results.
            </p>
            <div className="flex flex-wrap gap-2">
              {ACCESS_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  selected={accessSelected.includes(o.value)}
                  onClick={() => toggleMulti("access_preferences", o.value)}
                />
              ))}
              {customAccess.map((v) => (
                <Chip
                  key={v}
                  label={v.slice(7)}
                  selected={true}
                  onClick={() => {}}
                  onRemove={() => removeInterest("access_preferences", v)}
                />
              ))}
            </div>
            <CustomInterestInput
              placeholder="Any other needs? (e.g. Interpreter services, Childcare…)"
              suggestions={ACCESS_SUGGESTIONS}
              existingValues={accessSelected}
              onAdd={(val) => addCustomInterest("access_preferences", val)}
            />
          </div>
        );
      }

      // Step 5 — Resources
      case 5: {
        const resourceSelected = prefs.resource_interests ?? [];
        const customResources = resourceSelected.filter((v) => v.startsWith("custom:"));
        return (
          <div className="space-y-3">
            <p className="text-sm mb-4" style={{ color: "#cbc3d7" }}>
              Pick everything you'd like to see more of. You can change this any time.
            </p>
            <div className="flex flex-wrap gap-2">
              {RESOURCE_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  selected={resourceSelected.includes(o.value)}
                  onClick={() => toggleMulti("resource_interests", o.value)}
                />
              ))}
              {customResources.map((v) => (
                <Chip
                  key={v}
                  label={v.slice(7)}
                  selected={true}
                  onClick={() => {}}
                  onRemove={() => removeInterest("resource_interests", v)}
                />
              ))}
            </div>
            <CustomInterestInput
              placeholder="Looking for something specific? (e.g. Legal aid, Childcare…)"
              suggestions={RESOURCE_SUGGESTIONS}
              existingValues={resourceSelected}
              onAdd={(val) => addCustomInterest("resource_interests", val)}
            />
          </div>
        );
      }

      // Step 6 — Interests + Career (with custom + typeahead)
      case 6: {
        const personalSelected = prefs.personal_interests ?? [];
        const careerSelected = prefs.career_interests ?? [];
        const customPersonal = personalSelected.filter((v) => v.startsWith("custom:"));
        const customCareer = careerSelected.filter((v) => v.startsWith("custom:"));

        return (
          <div className="space-y-8">
            {/* Personal interests */}
            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: "#cbc3d7", ...mono }}>
                Personal interests & hobbies
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {INTEREST_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={personalSelected.includes(o.value)}
                    onClick={() => toggleMulti("personal_interests", o.value)}
                  />
                ))}
                {customPersonal.map((v) => (
                  <Chip
                    key={v}
                    label={v.slice(7)}
                    selected={true}
                    onClick={() => {}}
                    onRemove={() => removeInterest("personal_interests", v)}
                  />
                ))}
              </div>
              <CustomInterestInput
                placeholder="Add your own (e.g. Photography, Dance…)"
                suggestions={INTEREST_SUGGESTIONS}
                existingValues={personalSelected}
                onAdd={(val) => addCustomInterest("personal_interests", val)}
              />
            </div>

            {/* Career interests */}
            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: "#cbc3d7", ...mono }}>
                Career interests / fields to explore
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {CAREER_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={careerSelected.includes(o.value)}
                    onClick={() => toggleMulti("career_interests", o.value)}
                  />
                ))}
                {customCareer.map((v) => (
                  <Chip
                    key={v}
                    label={v.slice(7)}
                    selected={true}
                    onClick={() => {}}
                    onRemove={() => removeInterest("career_interests", v)}
                  />
                ))}
              </div>
              <CustomInterestInput
                placeholder="Add your own (e.g. Data Science, Nursing…)"
                suggestions={CAREER_SUGGESTIONS}
                existingValues={careerSelected}
                onAdd={(val) => addCustomInterest("career_interests", val)}
              />
            </div>
          </div>
        );
      }

      // Step 7 — Community style
      case 7:
        return (
          <div className="space-y-7">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: "#cbc3d7", ...mono }}>
                Would you like more…
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={prefs.content_preference === o.value}
                    onClick={() => setSingle("content_preference", o.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-3" style={{ color: "#cbc3d7", ...mono }}>
                I mainly want to…
              </label>
              <div className="flex flex-wrap gap-2">
                {ENGAGEMENT_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={prefs.engagement_preference === o.value}
                    onClick={() => setSingle("engagement_preference", o.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#020617" }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: "#a078ff", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#020617", color: "#dae2fd", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <header
        className="flex justify-between items-center px-6 h-[60px] sticky top-0 z-50"
        style={{
          backgroundColor: "rgba(15,23,42,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoSrc} alt="MyCommNet" className="h-8 w-8 rounded-full object-cover" style={{ boxShadow: "0 0 10px rgba(160,120,255,0.4)" }} />
          <span className="text-lg font-black tracking-tight">
            <span style={{ color: "#a078ff" }}>My</span>
            <span style={{ color: "#0566d9" }}>Comm</span>
            <span style={{ color: "#4fdbc8" }}>Net</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "#958ea0", ...mono }}>
            Step {step + 1} of {STEPS.length}
          </span>

          {/* Clear survey button */}
          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: "#ffffff", border: "1px solid #1e293b" }}
            >
              <Trash2 className="h-3 w-3" />
              Clear survey
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "#ffb4ab" }}>Clear everything?</span>
              <button
                type="button"
                onClick={handleClearSurvey}
                className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                style={{ background: "rgba(147,0,10,0.3)", color: "#ffb4ab", border: "1px solid rgba(147,0,10,0.4)" }}
              >
                Yes, clear
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="text-xs px-2.5 py-1 rounded-lg hover:bg-white/5"
                style={{ color: "#958ea0", border: "1px solid #1e293b" }}
              >
                Cancel
              </button>
            </div>
          )}

          {mode === "setup" && (
            <Link to="/main" className="text-xs hover:underline" style={{ color: "#4fdbc8" }}>
              Skip for now →
            </Link>
          )}
          {mode === "edit" && (
            <Link to="/profile" className="text-xs hover:underline" style={{ color: "#4fdbc8" }}>
              Cancel
            </Link>
          )}
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ background: "#0f172a", height: "3px" }}>
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #a078ff, #0566d9)",
            width: `${progress}%`,
            transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>

      {/* Main */}
      <main className="flex-grow flex items-start justify-center px-4 py-10 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-48 right-0 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "rgba(160,120,255,0.07)" }} />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "rgba(5,102,217,0.07)" }} />
        </div>

        <div className="w-full max-w-xl relative z-10">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4" style={{ color: "#a078ff" }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: "#a078ff", ...mono }}>
                {mode === "edit" ? "Edit preferences" : "Personalise your experience"}
              </span>
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold leading-tight mb-2"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#dae2fd" }}
            >
              {STEPS[step].title}
            </h1>
            <p className="text-sm" style={{ color: "#cbc3d7" }}>
              {STEPS[step].subtitle}
            </p>
          </div>

          <div
            className="rounded-2xl p-6 md:p-8 mb-6"
            style={{
              background: "rgba(15,23,42,0.7)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {renderStep()}
          </div>

          {saveError && (
            <div
              className="rounded-lg px-4 py-2.5 text-xs mb-4"
              style={{ background: "rgba(147,0,10,0.2)", color: "#ffb4ab", border: "1px solid rgba(147,0,10,0.4)" }}
            >
              {saveError}
            </div>
          )}

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1.5 h-11 px-5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                style={{ border: "1px solid #1e293b", color: "#cbc3d7" }}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}

            <button
              type="button"
              onClick={advance}
              disabled={saving}
              className="flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)", color: "#fff" }}
            >
              {saving ? "Saving…" : isLast ? (mode === "edit" ? "Save changes" : "Finish & explore") : (
                <><span>Continue</span><ChevronRight className="h-4 w-4" /></>
              )}
            </button>

            {!isLast && (
              <button
                type="button"
                onClick={advance}
                className="h-11 px-4 rounded-xl text-sm transition-colors hover:text-white"
                style={{ color: "#4a5568" }}
              >
                Skip
              </button>
            )}
          </div>

          {/* Save now */}
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="text-xs px-4 py-2 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-50"
              style={{ color: "#4fdbc8", border: "1px solid rgba(79,219,200,0.25)" }}
            >
              {saving ? "Saving…" : "💾 Save progress now"}
            </button>
          </div>

          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? "20px" : "6px",
                  height: "6px",
                  background: i === step
                    ? "linear-gradient(90deg,#a078ff,#0566d9)"
                    : i < step ? "rgba(160,120,255,0.4)" : "#1e293b",
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
