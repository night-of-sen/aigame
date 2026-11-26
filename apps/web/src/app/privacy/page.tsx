import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — SYNTHPLAY",
  description: "How SYNTHPLAY collects, uses, and protects your account and gameplay data."
};

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#07080B", color: "#F1F3F6", padding: "48px 20px 80px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <Link
            href="/"
            className="font-mono"
            style={{
              color: "#F3FF00",
              textDecoration: "none",
              fontSize: 12,
              letterSpacing: "0.08em",
              border: "1px solid rgba(243,255,0,0.35)",
              padding: "6px 12px"
            }}
          >
            ← BACK TO SYNTHPLAY
          </Link>
          <span className="font-mono" style={{ fontSize: 11, color: "#8C93A0" }}>
            LAST UPDATED: 2026-11-26
          </span>
        </div>

        <h1 className="font-display" style={{ fontSize: 38, letterSpacing: "0.04em", marginBottom: 8 }}>
          PRIVACY POLICY
        </h1>
        <p style={{ color: "#9AA2B1", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          SYNTHPLAY (<strong style={{ color: "#F1F3F6" }}>synthplay.games</strong>) is a free global platform for playing
          and publishing browser-based AI games. This Privacy Policy explains what information we collect, how we use it,
          and your rights regarding your data.
        </p>

        <div style={{ display: "grid", gap: 24, fontSize: 14, lineHeight: 1.75, color: "#C6CCD6" }}>
          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              1. INFORMATION WE COLLECT
            </h2>
            <ul style={{ paddingLeft: 20, margin: 0, display: "grid", gap: 8 }}>
              <li>
                <strong>Account &amp; Google Sign-In Data:</strong> When you sign in with Google or register via email,
                we collect your email address, display name, profile avatar URL (if provided by Google), and an
                auto-detected or user-selected country/region code for global leaderboards.
              </li>
              <li>
                <strong>Gameplay &amp; Community Activity:</strong> We store games you submit, game ratings and reviews,
                anonymous/account play counts, and leaderboard rankings.
              </li>
              <li>
                <strong>Technical &amp; Security Data:</strong> We use essential HttpOnly session cookies for
                authentication, a locale preference cookie (<code>synthplay_locale</code>), and Cloudflare network
                headers (such as <code>CF-IPCountry</code>) to prevent abuse and display regional statistics.
              </li>
            </ul>
          </section>

          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              2. HOW WE USE GOOGLE USER DATA
            </h2>
            <p style={{ margin: 0 }}>
              SYNTHPLAY requests only basic Google profile scopes (<code>openid</code>, <code>email</code>, and{" "}
              <code>profile</code>) strictly to authenticate you, create your player/creator profile, and display your
              nickname and avatar next to your published games or reviews. We do <strong>not</strong> sell Google user
              data, access your Google Drive/Contacts/Gmail, or share your Google profile data with third-party data
              brokers.
            </p>
          </section>

          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              3. SANDBOX ISOLATION &amp; THIRD-PARTY CONTENT
            </h2>
            <p style={{ margin: 0 }}>
              User-uploaded HTML5 games run inside sandboxed iframes served from an isolated domain (
              <code>synthplay-box.cloud</code>) so third-party game scripts cannot access your{" "}
              <code>synthplay.games</code> session cookies. Optional third-party payment or sponsorship partners (such as
              Creem, Ko-fi, Patreon, PayPal) and advertising partners (such as Google AdSense) process transactions or
              ads under their own privacy policies.
            </p>
          </section>

          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              4. DATA RETENTION, DELETION &amp; CONTACT
            </h2>
            <p style={{ margin: 0 }}>
              You may request export or permanent deletion of your SYNTHPLAY account and associated personal data at any
              time by contacting{" "}
              <a href="mailto:sesenight@gmail.com" style={{ color: "#00F0D4" }}>
                sesenight@gmail.com
              </a>
              . We respond to deletion requests within 14 business days.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
