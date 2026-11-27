import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About SYNTHPLAY — Free Global Indie & AI Web Game Arcade",
  description:
    "SYNTHPLAY is a free browser showcase where indie developers and AI creators publish and share playable HTML5 & WebGL games worldwide with zero hosting fees."
};

export default function AboutPage() {
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
            SYNTHPLAY.GAMES
          </span>
        </div>

        <h1 className="font-display" style={{ fontSize: 38, letterSpacing: "0.04em", marginBottom: 10 }}>
          ABOUT SYNTHPLAY
        </h1>
        <p style={{ color: "#C6CCD6", fontSize: 15, lineHeight: 1.75, marginBottom: 32 }}>
          SYNTHPLAY (<strong style={{ color: "#F1F3F6" }}>synthplay.games</strong>) is an independent, free-to-play
          global arcade built for solo indie game developers and AI-assisted creators. Our mission is simple: let anyone
          publish a playable HTML5, WebGL, or single-file browser game in seconds with zero hosting fees, and let
          players worldwide discover and play instantly with zero downloads.
        </p>

        <div style={{ display: "grid", gap: 22, fontSize: 14, lineHeight: 1.75, color: "#C6CCD6" }}>
          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              1. BUILT FOR FREE CREATOR SHOWCASE
            </h2>
            <p style={{ margin: 0 }}>
              Every game uploaded to SYNTHPLAY undergoes automated static security scanning (blocking cookie theft,
              miners, and path traversal) and runs inside an isolated sandbox domain (<code>*.synthplay-box.cloud</code>)
              powered by Cloudflare R2 edge delivery. Creators retain 100% ownership of their intellectual property and
              can attach their own direct Ko-fi, Patreon, or PayPal tip links with 0% commission taken by SYNTHPLAY.
            </p>
          </section>

          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              2. HOW WE KEEP THE PLATFORM FREE
            </h2>
            <p style={{ margin: 0 }}>
              SYNTHPLAY is independently operated and sustained through non-intrusive display advertising (Google
              AdSense), optional community support on Ko-fi and Patreon (which removes ads for Supporters), indie game
              spotlight placements, and transparent affiliate partnerships with developer &amp; AI creation tools.
            </p>
          </section>

          <section style={{ background: "#0E1016", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
            <h2 className="font-mono" style={{ fontSize: 13, color: "#F3FF00", marginBottom: 10 }}>
              3. CONTACT &amp; SUPPORT
            </h2>
            <p style={{ margin: 0 }}>
              For creator inquiries, featured indie game spotlights, DMCA/copyright notices, or technical support, reach
              out anytime at{" "}
              <a href="mailto:support@synthplay.games" style={{ color: "#00F0D4" }}>
                support@synthplay.games
              </a>
              . We typically respond within 48 hours.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
