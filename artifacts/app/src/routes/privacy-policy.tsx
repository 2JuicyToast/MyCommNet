import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicStars";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MyCommNet" },
      { name: "description", content: "How MyCommNet collects, uses, and protects your personal information." },
    ],
  }),
  component: PrivacyPolicyPage,
});

const hanken = { fontFamily: "'Hanken Grotesk', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const sections = [
  {
    title: "Information We Collect",
    body: `We collect information you provide directly to us when you create an account, complete your profile, or interact with the platform. This includes your name, email address, username, location (if you choose to share it), and any content you post or share within the community.

We also automatically collect certain technical information when you use MyCommNet, such as your IP address, browser type, device identifiers, and usage data (pages visited, features used, time spent). This helps us improve the service and diagnose issues.`,
  },
  {
    title: "How We Use Your Information",
    body: `Your information is used to operate and improve MyCommNet — to create and manage your account, personalize your experience with relevant local resources and opportunities, send you notifications you've opted into, and respond to your support requests.

We do not sell your personal data to third parties. We may share anonymized, aggregated data (e.g., neighborhood engagement trends) with community partners, but this data cannot identify you individually.`,
  },
  {
    title: "Data Storage & Security",
    body: `Your data is stored on secure servers provided by Supabase. We use industry-standard encryption (TLS/HTTPS) for data in transit and enforce row-level security policies to ensure users can only access data they are authorized to see.

While we take reasonable precautions, no system is completely secure. If you believe your account has been compromised, please contact us immediately at security@mycommnet.app.`,
  },
  {
    title: "Cookies & Tracking",
    body: `MyCommNet uses cookies and similar technologies to maintain your session, remember your preferences, and understand how the platform is used. You can control cookie settings through your browser, but disabling certain cookies may affect the functionality of the service.

We do not use third-party advertising networks or tracking pixels.`,
  },
  {
    title: "Your Rights",
    body: `You have the right to access, update, or delete your personal information at any time through your account settings. You may also request a copy of all data we hold about you by contacting privacy@mycommnet.app.

If you delete your account, your personal data is removed from our active systems within 30 days. Some anonymized data may be retained for analytics purposes.`,
  },
  {
    title: "Children's Privacy",
    body: `MyCommNet is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with their information, please contact us and we will delete it promptly.`,
  },
  {
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. When we do, we'll notify you via email or an in-app notification and update the "Last updated" date below. Continued use of MyCommNet after changes are posted constitutes your acceptance of the revised policy.`,
  },
];

function PrivacyPolicyPage() {
  return (
    <div style={{ backgroundColor: "#020617", color: "#dae2fd", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <PublicNav />

      <main className="pt-[72px]">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-12">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#4fdbc8", ...mono }}>
              Legal
            </p>
            <h1 className="text-4xl font-bold mb-4" style={{ ...hanken, color: "#dae2fd" }}>
              Privacy Policy
            </h1>
            <p style={{ color: "#cbc3d7" }}>
              Last updated: <span style={mono}>July 3, 2026</span>
            </p>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "#cbc3d7" }}>
              At MyCommNet, your privacy matters. This policy explains what information we collect, why
              we collect it, and how you can control it.
            </p>
          </div>

          <div className="space-y-10">
            {sections.map((s, i) => (
              <section key={s.title}>
                <h2
                  className="text-xl font-bold mb-3 flex items-center gap-3"
                  style={{ ...hanken, color: "#dae2fd" }}
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "rgba(79,219,200,0.1)", color: "#4fdbc8", ...mono }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </h2>
                <div
                  className="rounded-xl p-6"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {s.body.split("\n\n").map((para, pi) => (
                    <p key={pi} className={`text-sm leading-relaxed ${pi > 0 ? "mt-4" : ""}`} style={{ color: "#cbc3d7" }}>
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div
            className="mt-12 p-6 rounded-xl text-center"
            style={{ background: "rgba(79,219,200,0.05)", border: "1px solid rgba(79,219,200,0.15)" }}
          >
            <p className="text-sm mb-3" style={{ color: "#cbc3d7" }}>
              Questions about this policy?
            </p>
            <a
              href="mailto:privacy@mycommnet.app"
              className="text-sm font-semibold hover:underline"
              style={{ color: "#4fdbc8" }}
            >
              privacy@mycommnet.app
            </a>
          </div>

          <div className="mt-10 flex gap-6 text-sm" style={{ color: "#cbc3d7" }}>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="/help-center" className="hover:text-white transition-colors">
              Help Center
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
