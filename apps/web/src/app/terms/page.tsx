import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — SYNTHPLAY",
  description: "Terms of Service for playing and publishing AI-built web games on SYNTHPLAY."
};

export default function TermsOfServicePage() {
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
          TERMS OF SERVICE
        </h1>
        <p style={{ color: "#9AA2B1", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          By accessing or using <strong style={{ color: "#F1F3F6" }}>SYNTHPLAY</strong> (<code>synthplay.games</code>),
          you agree to these Terms of Service.
        </p>

        <div style={{ display: "grid", gap: 24, fontSize: 14, lineHeight: 1.75, color: "#C6CCD6" }}>
          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              1. PLATFORM ACCESS &amp; ACCOUNTS
            </h2>
            <p style={{ margin: 0 }}>
              SYNTHPLAY provides free browser access to HTML5 and AI-assisted games. You are responsible for keeping
              your account credentials secure and for all activity conducted under your account. We reserve the right to
              suspend accounts involved in abuse, automated play-count manipulation, or policy violations.
            </p>
          </section>

          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              2. CREATOR SUBMISSIONS &amp; SANDBOX RULES
            </h2>
            <ul style={{ paddingLeft: 20, margin: 0, display: "grid", gap: 8 }}>
              <li>
                You retain ownership of the games you upload and grant SYNTHPLAY a non-exclusive, worldwide, royalty-free
                license to host, sandbox, preview, and distribute your game on <code>synthplay.games</code> and{" "}
                <code>synthplay-box.cloud</code>.
              </li>
              <li>
                You must not upload malware, cryptominers, phishing forms, unauthorized credential harvesters,
                copyright-infringing assets, or illegal content. All uploads undergo automated static security scanning
                and moderation review.
              </li>
            </ul>
          </section>

          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              3. SPONSORSHIPS &amp; CREATOR TIPS
            </h2>
            <p style={{ margin: 0 }}>
              Direct creator tip links (e.g., Ko-fi, Patreon, PayPal.me) connect players directly to third-party creator
              pages with zero commission taken by SYNTHPLAY; SYNTHPLAY is not a party to those transactions. Platform
              sponsorship slots and Pro Supporter memberships are subject to review and compliance with our brand safety
              guidelines.
            </p>
          </section>

          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              4. DISCLAIMER &amp; CONTACT
            </h2>
            <p style={{ margin: 0 }}>
              SYNTHPLAY is provided &ldquo;as is&rdquo; without warranties of any kind. For legal notices, DMCA takedown
              requests, or support inquiries, contact{" "}
              <a href="mailto:sesenight@gmail.com" style={{ color: "#00F0D4" }}>
                sesenight@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
