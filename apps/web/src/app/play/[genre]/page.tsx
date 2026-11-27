import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { loadFullStore } from "@synthplay/db";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");

function normalizeGenreSlug(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatGenreLabel(slug: string): string {
  return slug.replace(/-/g, " ").toUpperCase();
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ genre: string }>;
}): Promise<Metadata> {
  const { genre } = await params;
  const label = genre === "all" ? "ALL FREE HTML5 & AI" : formatGenreLabel(genre);
  const canonical = `${BASE_URL}/play/${genre.toLowerCase()}`;

  return {
    title: `Free Online ${label} Browser Games (No Download)`,
    description: `Play free ${label.toLowerCase()} HTML5, WebGL, and AI-crafted browser games instantly on SYNTHPLAY. Works on desktop, iPad, and mobile with zero downloads.`,
    keywords: [
      `free ${label.toLowerCase()} browser games`,
      `${label.toLowerCase()} HTML5 games`,
      "no download online games",
      "AI browser games",
      "SYNTHPLAY"
    ],
    alternates: { canonical },
    openGraph: {
      title: `Free Online ${label} Games on SYNTHPLAY`,
      description: `Instant browser ${label.toLowerCase()} HTML5 & AI games — zero downloads, free forever.`,
      url: canonical,
      siteName: "SYNTHPLAY",
      type: "website"
    }
  };
}

export default async function PlayGenreLandingPage({
  params
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre } = await params;
  const genreSlug = genre.toLowerCase();
  const store = await loadFullStore();
  const published = store.games.filter((g) => g.status === "published");
  const allGenres = Array.from(new Set(published.map((g) => normalizeGenreSlug(g.category)))).sort();

  const matching =
    genreSlug === "all" || genreSlug === "ai-games"
      ? published
      : published.filter((g) => normalizeGenreSlug(g.category) === genreSlug);

  const label = genreSlug === "all" ? "ALL FREE AI & HTML5" : formatGenreLabel(genreSlug);
  const canonical = `${BASE_URL}/play/${genreSlug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `Free Online ${label} Browser Games`,
        url: canonical,
        description: `Curated collection of free ${label.toLowerCase()} HTML5 and AI-crafted browser games playable instantly on SYNTHPLAY.`
      },
      {
        "@type": "ItemList",
        numberOfItems: matching.length,
        itemListElement: matching.map((g, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: g.title,
          url: `${BASE_URL}/games/${g.slug}`
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "SYNTHPLAY", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: `${label} Games`, item: canonical }
        ]
      }
    ]
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)", color: "var(--ink)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            <Link href="/guides" className="btn-steel sp-ctrl-pill font-mono" style={{ textDecoration: "none" }}>
              GUIDES
            </Link>
            <Link href="/" className="btn-volt sp-signin-btn" style={{ textDecoration: "none" }}>
              ARCADE HOME ▶
            </Link>
          </div>
        </div>
      </header>

      <main className="sp-container" style={{ paddingTop: 38, paddingBottom: 76 }}>
        <div className="section-bar">
          <div>
            <div className="section-index">FREE BROWSER COLLECTION // ZERO DOWNLOADS</div>
            <h1 className="section-heading">FREE ONLINE {label} GAMES ({matching.length})</h1>
            <p style={{ color: "var(--ink-muted)", fontSize: 14, maxWidth: 720, marginTop: 8, lineHeight: 1.65 }}>
              Launch free {label.toLowerCase()} HTML5, WebGL, and AI-crafted games instantly in Chrome, Safari, Edge, or Firefox on desktop, iPad, and mobile.
            </p>
          </div>
        </div>

        {/* Cross-Genre Internal Links */}
        <div className="country-bar" style={{ marginBottom: 24 }}>
          <Link href="/play/all" className={`country-btn ${genreSlug === "all" ? "active" : ""}`} style={{ textDecoration: "none" }}>
            ALL GAMES
          </Link>
          {allGenres.map((gSlug) => (
            <Link
              key={gSlug}
              href={`/play/${gSlug}`}
              className={`country-btn ${genreSlug === gSlug ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {formatGenreLabel(gSlug)}
            </Link>
          ))}
        </div>

        <div className="catalog-grid">
          {matching.map((g) => (
            <Link key={g.id} href={`/games/${g.slug}`} className="arcade-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div className="arcade-card-img-wrap">
                <img src={g.coverImage} alt={g.title} className="arcade-card-img" />
                <div className="arcade-card-play-overlay">
                  <span className="font-mono" style={{ fontSize: 10, padding: "3px 7px", borderRadius: 4, background: "rgba(6,7,10,0.86)", color: "var(--cyan)" }}>
                    [{g.creatorCountryCode}] {g.category}
                  </span>
                  <span className="play-chip">PLAY NOW ▶</span>
                </div>
              </div>
              <div style={{ padding: "15px 17px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <h2 className="font-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
                    {g.title}
                  </h2>
                  <span className="font-mono" style={{ fontSize: 12, color: "var(--volt)" }}>★ {g.rating.toFixed(2)}</span>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--ink-muted)", margin: "8px 0 12px", lineHeight: 1.5 }}>
                  {g.tagline}
                </p>
                <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-muted)", paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
                  <span>by @{g.creatorName}</span>
                  <span style={{ color: "var(--cyan)" }}>{g.aiTools.slice(0, 2).map((t) => `#${t}`).join(" ")}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
