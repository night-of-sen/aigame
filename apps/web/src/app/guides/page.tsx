import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { GUIDE_ARTICLES } from "@/lib/guides";

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "AI & HTML5 Game Guides, Devlogs & Play Lists",
  description:
    "Original guides on building and publishing free AI-generated HTML5/WebGL games, top free cyberpunk browser games, sandbox security, and indie web game monetization.",
  alternates: { canonical: `${BASE_URL}/guides` },
  openGraph: {
    title: "SYNTHPLAY Guides — AI Game Devlogs & Free Browser Game Picks",
    description:
      "Learn how to build, host, and monetize free HTML5 & AI browser games, and explore curated game collections.",
    url: `${BASE_URL}/guides`,
    siteName: "SYNTHPLAY",
    type: "website"
  }
};

export default function GuidesIndexPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)", color: "var(--ink)" }}>
      <header className="sp-header">
        <div className="sp-header-inner">
          <Link href="/" className="sp-brand">
            <div className="sp-logo-mark">
              <img
                src="/brand-logo.png"
                alt="SYNTHPLAY"
                width={40}
                height={40}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>SYNTHPLAY</div>
              <div className="font-mono sp-brand-sub">← BACK TO ARCADE HALL</div>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/rss.xml" className="btn-steel sp-ctrl-pill font-mono" style={{ textDecoration: "none" }}>
              RSS FEED ↗
            </a>
            <Link href="/" className="btn-volt sp-signin-btn" style={{ textDecoration: "none" }}>
              PLAY GAMES ▶
            </Link>
          </div>
        </div>
      </header>

      <main className="sp-container" style={{ paddingTop: 38, paddingBottom: 76 }}>
        <div className="section-bar">
          <div>
            <div className="section-index">EDITORIAL HUB // AI GAME DEVLOGS &amp; PLAYER GUIDES</div>
            <h1 className="section-heading">SYNTHPLAY GUIDES &amp; CREATOR PLAYBOOK</h1>
            <p style={{ color: "var(--ink-muted)", fontSize: 14, maxWidth: 680, marginTop: 8, lineHeight: 1.6 }}>
              Practical tutorials for indie &amp; AI HTML5 game developers, deep-dives on browser sandbox architecture, and curated lists of free browser games.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 20 }}>
          {GUIDE_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/guides/${article.slug}`}
              className="cab-surface"
              style={{
                padding: 24,
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 14
              }}
            >
              <div>
                <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 10 }}>
                  <span style={{ color: "var(--volt)", fontWeight: 700 }}>{article.category}</span>
                  <span style={{ color: "var(--ink-muted)" }}>{article.readMinutes} MIN READ · {article.publishedAt}</span>
                </div>
                <h2 className="font-display" style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>
                  {article.title}
                </h2>
                <div style={{ fontSize: 12, color: "var(--cyan)", marginBottom: 10 }}>{article.titleZh}</div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6 }}>
                  {article.description}
                </p>
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", paddingTop: 12, borderTop: "1px solid var(--hairline)" }}>
                READ FULL GUIDE →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
