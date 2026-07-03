import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicStars";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Terms of Service — MyCommNet" },
      { name: "description", content: "The terms and conditions governing your use of MyCommNet." },
    ],
  }),
  component: TermsPage,
});

const hanken = { fontFamily: "'Hanken Grotesk', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const sections = [
  {
    title: "Acceptance of Terms",
    body: `By accessing or using MyCommNet, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the platform.

These terms apply to all visitors, users, and others who access MyCommNet.`,
  },
  {
    title: "Your Account",
    body: `You are responsible for maintaining the security of your account and password. MyCommNet cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.

You must not use the platform for any illegal purpose or in violation of any laws in your jurisdiction. You are responsible for all content posted and activity that occurs under your account.`,
  },
  {
    title: "Community Standards",
    body: `MyCommNet is a community platform. You agree not to post content that is hateful, discriminatory, threatening, or harassing. You agree not to impersonate other people or entities, spread misinformation, or use the platform to spam other users.

We reserve the right to remove any content that violates these standards and to suspend or terminate accounts that repeatedly violate them.`,
  },
  {
    title: "Content Ownership",
    body: `You retain ownership of any content you post on MyCommNet. By posting content, you grant us a non-exclusive, royalty-free license to display, distribute, and use that content in connection with operating the platform.

You represent that you have the right to post any content you share and that it does not infringe on the rights of any third party.`,
  },
  {
    title: "Platform Availability",
    body: `We aim to keep MyCommNet available at all times but cannot guarantee uninterrupted access. We may perform maintenance, updates, or encounter technical issues that temporarily affect availability.

We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice where possible.`,
  },
  {
    title: "Limitation of Liability",
    body: `MyCommNet is provided "as is" without warranties of any kind. To the fullest extent permitted by law, MyCommNet shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.

Our total liability to you for any claims under these terms shall not exceed the amount you paid us in the last 12 months (or $10 if you have not made any payments).`,
  },
  {
    title: "Changes to Terms",
    body: `We may revise these Terms of Service at any time. When we make material changes, we'll notify you via email or an in-app notification at least 14 days before the changes take effect.

Continued use of MyCommNet after changes take effect constitutes your acceptance of the revised terms.`,
  },
];

function TermsPage() {
  return (
    <div style={{ backgroundColor: "#020617", color: "#dae2fd", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <PublicNav />

      <main className="pt-[72px]">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-12">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#adc6ff", ...mono }}>
              Legal
            </p>
            <h1 className="text-4xl font-bold mb-4" style={{ ...hanken, color: "#dae2fd" }}>
              Terms of Service
            </h1>
            <p style={{ color: "#cbc3d7" }}>
              Last updated: <span style={mono}>July 3, 2026</span>
            </p>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "#cbc3d7" }}>
              Please read these terms carefully before using MyCommNet. They outline your rights and
              responsibilities as a member of our community.
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
                    style={{ background: "rgba(173,198,255,0.1)", color: "#adc6ff", ...mono }}
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
            style={{ background: "rgba(173,198,255,0.05)", border: "1px solid rgba(173,198,255,0.15)" }}
          >
            <p className="text-sm mb-3" style={{ color: "#cbc3d7" }}>
              Questions about these terms?
            </p>
            <a
              href="mailto:legal@mycommnet.app"
              className="text-sm font-semibold hover:underline"
              style={{ color: "#adc6ff" }}
            >
              legal@mycommnet.app
            </a>
          </div>

          <div className="mt-10 flex gap-6 text-sm" style={{ color: "#cbc3d7" }}>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
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
