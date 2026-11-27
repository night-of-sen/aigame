import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadFullStore } from "@synthplay/db";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");

export async function generateMetadata({
  params
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const store = await loadFullStore();
  const user = store.users.find((u) => u.username.toLowerCase() === decoded.toLowerCase());
  const games = store.games.filter(
    (g) => g.status === "published" && g.creatorName.toLowerCase() === decoded.toLowerCase()
  );
  if (!user && games.length === 0) return { title: "Creator Not Found" };

  const displayName = user?.username || games[0]?.creatorName || decoded;
  const country = user?.countryCode || games[0]?.creatorCountryCode || "GLOBAL";
  const canonical = `${BASE_URL}/u/${encodeURIComponent(displayName)}`;

  return {
    title: `@${displayName} [${country}] — Indie & AI Game Creator`,
    description: `Play ${games.length} free browser HTML5 & AI-crafted games by @${displayName} [${country}] on SYNTHPLAY. Zero downloads, 100% free online.`,
    alternates: { canonical },
    openGraph: {
      title: `@${displayName} on SYNTHPLAY`,
      description: `Explore ${games.length} free HTML5 & AI browser games created by @${displayName} [${country}].`,
      url: canonical,
      siteName: "SYNTHPLAY",
      type: "profile"
    }
  };
}

export default async function CreatorProfilePage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const store = await loadFullStore();

  const user = store.users.find((u) => u.username.toLowerCase() === decoded.toLowerCase());
  const games = store.games.filter(
    (g) => g.status === "published" && g.creatorName.toLowerCase() === decoded.toLowerCase()
  );

  if (!user && games.length === 0) notFound();

  const displayName = user?.username || games[0]?.creatorName || decoded;
  const country = user?.countryCode || games[0]?.creatorCountryCode || "US";
  const totalPlays = games.reduce((sum, g) => sum + g.totalValidPlays, 0);
  const tips = user?.creatorTipLinks || {};
  const canonical = `${BASE_URL}/u/${encodeURIComponent(displayName)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        name: displayName,
        url: canonical,
        sameAs: [tips.kofi, tips.patreon, tips.paypalMe].filter(Boolean)
      },
      {
        "@type": "ItemList",
        name: `Games by ${displayName} on SYNTHPLAY`,
        numberOfItems: games.length,
        itemListElement: games.map((g, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: g.title,
          url: `${BASE_URL}/games/${g.slug}`
        }))
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
          <Link href="/" className="btn-volt sp-signin-btn" style={{ textDecoration: "none" }}>
            BROWSE ALL GAMES →
          </Link>
        </div>
      </header>

      <main className="sp-container" style={{ paddingTop: 36, paddingBottom: 76 }}>
        {/* Creator Identity Banner */}
        <section className="cab-energy-border" style={{ padding: 28, marginBottom: 32 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                className="font-display"
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(243,255,0,0.22), rgba(0,240,212,0.18))",
                  border: "2px solid var(--volt)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--volt)",
                  flexShrink: 0
                }}
              >
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <h1 className="font-display" style={{ margin: 0, fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}>
                    @{displayName}
                  </h1>
                  <span className="font-mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--hairline-strong)", color: "#fff" }}>
                    [{country}]
                  </span>
                  {user?.isVerifiedCreator && (
                    <span className="font-mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(0,240,212,0.15)", border: "1px solid rgba(0,240,212,0.45)", color: "var(--cyan)", fontWeight: 700 }}>
                      VERIFIED CREATOR
                    </span>
                  )}
                  {user?.isProSupporter && (
                    <span className="font-mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "var(--volt)", color: "#07080B", fontWeight: 700 }}>
                      PRO SUPPORTER
                    </span>
                  )}
                </div>
                <div className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 8, display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <span>PUBLISHED GAMES: <strong style={{ color: "#fff" }}>{games.length}</strong></span>
                  <span>VERIFIED PLAYS: <strong style={{ color: "var(--volt)" }}>{totalPlays.toLocaleString()}</strong></span>
                  <span>HOSTING CUT: <strong style={{ color: "var(--cyan)" }}>0% FREE</strong></span>
                </div>
              </div>
            </div>

            {/* Direct 0%-cut Creator Tip Links */}
            {(tips.kofi || tips.patreon || tips.paypalMe) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tips.kofi && (
                  <a href={tips.kofi} target="_blank" rel="noopener noreferrer" className="btn-volt" style={{ padding: "8px 14px", fontSize: 11, textDecoration: "none" }}>
                    TIP ON KO-FI (0% CUT) ↗
                  </a>
                )}
                {tips.patreon && (
                  <a href={tips.patreon} target="_blank" rel="noopener noreferrer" className="btn-steel" style={{ padding: "8px 14px", fontSize: 11, textDecoration: "none" }}>
                    PATREON ↗
                  </a>
                )}
                {tips.paypalMe && (
                  <a href={tips.paypalMe} target="_blank" rel="noopener noreferrer" className="btn-steel" style={{ padding: "8px 14px", fontSize: 11, textDecoration: "none" }}>
                    PAYPAL.ME ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Creator's Playable Games Portfolio */}
        <div className="section-bar">
          <div>
            <div className="section-index">CREATOR PORTFOLIO // FREE IN BROWSER</div>
            <h2 className="section-heading">GAMES BY @{displayName} ({games.length})</h2>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="cab-surface" style={{ padding: 28, color: "var(--ink-muted)" }}>
            This creator hasn&apos;t published any games yet.
          </div>
        ) : (
          <div className="catalog-grid">
            {games.map((g) => (
              <Link
                key={g.id}
                href={`/games/${g.slug}`}
                className="arcade-card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div className="arcade-card-img-wrap">
                  <img src={g.coverImage} alt={g.title} className="arcade-card-img" />
                  <div className="arcade-card-play-overlay">
                    <span className="font-mono" style={{ fontSize: 10, padding: "3px 7px", borderRadius: 4, background: "rgba(6,7,10,0.86)", border: "1px solid rgba(0,240,212,0.5)", color: "var(--cyan)" }}>
                      {g.category} · FREE ONLINE
                    </span>
                    <span className="play-chip">PLAY NOW ▶</span>
                  </div>
                </div>
                <div style={{ padding: "15px 17px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <h3 className="font-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
                      {g.title}
                    </h3>
                    <span className="font-mono" style={{ fontSize: 12, color: "var(--volt)" }}>
                      ★ {g.rating.toFixed(2)}
                    </span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-muted)", margin: "8px 0 12px", lineHeight: 1.5 }}>
                    {g.tagline}
                  </p>
                  <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-muted)", paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
                    <span>{g.aiTools.slice(0, 3).map((t) => `#${t}`).join(" ")}</span>
                    <span style={{ color: "#fff", fontWeight: 700 }}>{g.totalValidPlays.toLocaleString()} PLAYS</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
