import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicStars";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/help-center")({
  head: () => ({
    meta: [
      { title: "Help Center — MyCommNet" },
      { name: "description", content: "Find answers to common questions about MyCommNet." },
    ],
  }),
  component: HelpCenterPage,
});

const hanken = { fontFamily: "'Hanken Grotesk', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const faqs: { category: string; color: string; bg: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Getting Started",
    color: "#a078ff",
    bg: "rgba(160,120,255,0.1)",
    items: [
      {
        q: "How do I create an account?",
        a: "Click "Sign Up" on the homepage or the login page, enter your name, email, choose a username, and set a password. Once registered, you'll complete a short onboarding survey so we can personalize your experience.",
      },
      {
        q: "I didn't receive a confirmation email. What should I do?",
        a: "Check your spam or junk folder first. If it's not there, try signing in — if your account was created, the email may have been delayed. You can also contact support@mycommnet.app and we'll manually verify your account.",
      },
      {
        q: "Can I use MyCommNet without creating an account?",
        a: "You can browse the homepage, About, and Features pages without an account. To access the community dashboard, map, groups, and messaging, you'll need to sign up — it's free.",
      },
    ],
  },
  {
    category: "Account & Profile",
    color: "#4fdbc8",
    bg: "rgba(79,219,200,0.1)",
    items: [
      {
        q: "How do I update my profile information?",
        a: "Navigate to your profile page (click your avatar or go to /profile). From there you can update your display name, bio, location, and profile photo.",
      },
      {
        q: "How do I change my password?",
        a: "Go to your profile settings and click "Change Password." You'll need to enter your current password and choose a new one that meets the security requirements.",
      },
      {
        q: "How do I delete my account?",
        a: "You can request account deletion from your profile settings under the "Danger Zone" section. Your personal data will be removed from active systems within 30 days. Some anonymized data may be retained for analytics.",
      },
    ],
  },
  {
    category: "Community & Groups",
    color: "#adc6ff",
    bg: "rgba(173,198,255,0.1)",
    items: [
      {
        q: "How do I join a community group?",
        a: "Browse groups from the Groups page. Click on any group to see its details and members, then click "Join" to become a member. Some groups may require approval from a moderator.",
      },
      {
        q: "How do I report inappropriate content?",
        a: "Click the three-dot menu (⋯) on any post or profile and select "Report." Our moderation team reviews all reports and responds within 24 hours.",
      },
      {
        q: "Can I create my own community group?",
        a: "Yes! From the Groups page, click "Create Group." You'll be able to set the group name, description, location, and privacy settings (public or invite-only).",
      },
    ],
  },
  {
    category: "Privacy & Safety",
    color: "#f0b429",
    bg: "rgba(240,180,41,0.1)",
    items: [
      {
        q: "Who can see my profile?",
        a: "By default, your profile is visible to other MyCommNet members. You can adjust your visibility settings from your profile page to limit what's shown to the public vs. logged-in members.",
      },
      {
        q: "How do I block someone?",
        a: "Visit the user's profile, click the three-dot menu (⋯), and select "Block." Blocked users cannot see your profile or send you messages.",
      },
      {
        q: "Is my location data shared with others?",
        a: "Your precise location is never shared publicly. If you enable location features, only a general neighborhood or city is displayed to other members. You can disable location access at any time in your settings.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
        style={{ background: open ? "rgba(255,255,255,0.04)" : "transparent" }}
      >
        <span className="text-sm font-semibold pr-4" style={{ color: "#dae2fd" }}>{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: "#958ea0" }} />
          : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: "#958ea0" }} />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1">
          <p className="text-sm leading-relaxed" style={{ color: "#cbc3d7" }}>{a}</p>
        </div>
      )}
    </div>
  );
}

function HelpCenterPage() {
  return (
    <div style={{ backgroundColor: "#020617", color: "#dae2fd", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <PublicNav />

      <main className="pt-[72px]">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-12 text-center">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#a078ff", ...mono }}>
              Support
            </p>
            <h1 className="text-4xl font-bold mb-4" style={{ ...hanken, color: "#dae2fd" }}>
              Help Center
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "#cbc3d7" }}>
              Find answers to common questions, or reach out to our team directly.
            </p>
          </div>

          <div className="space-y-12">
            {faqs.map((cat) => (
              <section key={cat.category}>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: cat.bg, color: cat.color }}
                  >
                    {cat.category}
                  </span>
                </div>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <FaqItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div
            className="mt-16 p-8 rounded-2xl text-center"
            style={{
              background: "linear-gradient(135deg, rgba(160,120,255,0.08) 0%, rgba(5,102,217,0.08) 100%)",
              border: "1px solid rgba(160,120,255,0.2)",
            }}
          >
            <h2 className="text-xl font-bold mb-2" style={{ ...hanken, color: "#dae2fd" }}>
              Still need help?
            </h2>
            <p className="text-sm mb-5" style={{ color: "#cbc3d7" }}>
              Our support team typically responds within a few hours.
            </p>
            <a
              href="mailto:support@mycommnet.app"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #a078ff 0%, #0566d9 100%)", color: "#fff" }}
            >
              Email Support
            </a>
          </div>

          <div className="mt-10 flex gap-6 text-sm" style={{ color: "#cbc3d7" }}>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
