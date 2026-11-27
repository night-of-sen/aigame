"use client";

import React, { useEffect, useState } from "react";
import { type Locale, t } from "@synthplay/i18n";
import { AiToolsShelf } from "./AiToolsShelf";

interface RailStatus {
  kofi: boolean;
  patreon: boolean;
  hostedUrls: { kofi: string; patreon: string; paypalMe: string };
}

export function SponsorView({
  locale
}: {
  locale: Locale;
  onOrderCreated?: () => void;
}) {
  const [rails, setRails] = useState<RailStatus | null>(null);

  useEffect(() => {
    fetch("/api/checkout")
      .then((r) => r.json())
      .then((d) => setRails(d))
      .catch(() => {});
  }, []);

  const kofiUrl = rails?.hostedUrls?.kofi || "";
  const patreonUrl = rails?.hostedUrls?.patreon || "";
  const supportMailto = "mailto:support@synthplay.games?subject=SYNTHPLAY%20Featured%20Indie%20Game%20Spotlight";

  return (
    <section className="sp-container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="section-bar">
        <div>
          <div className="section-index">04 // SUPPORT FREE HOSTING &amp; FEATURE YOUR INDIE GAME</div>
          <h1 className="section-heading">{t(locale, "sponsorPageTitle")}</h1>
          <p style={{ color: "var(--ink-muted)", fontSize: 14, marginTop: 6, maxWidth: 680, lineHeight: 1.6 }}>
            SYNTHPLAY is 100% free for players and indie developers — zero upload fees and 0% cut on creator tips.
            Optional community support on Ko-fi &amp; Patreon keeps our global Cloudflare R2 edge servers running fast.
          </p>
        </div>
      </div>

      {/* 3 Clean Community & Indie Dev Tiers (Ko-fi + Patreon only — zero Creem, zero fake simulated checkout) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 18, marginBottom: 28 }}>
        {/* Tier 1: Coffee Tip via Ko-fi */}
        <div className="cab-surface cab-chamfer" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18 }}>
          <div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)" }}>ONE-TIME COMMUNITY TIP</div>
            <div className="font-display" style={{ fontSize: 30, fontWeight: 700, margin: "8px 0" }}>
              BUY A COFFEE
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 14 }}>
              Via Ko-fi · 0% platform cut · Cards &amp; PayPal (no account required)
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-muted)", display: "grid", gap: 8 }}>
              <li>Directly funds monthly VPS &amp; domain renewals</li>
              <li>Leave a shoutout message for the community</li>
              <li>Zero recurring commitment</li>
            </ul>
          </div>
          {kofiUrl ? (
            <a href={kofiUrl} target="_blank" rel="noopener noreferrer" className="btn-steel" style={{ textAlign: "center", justifyContent: "center" }}>
              TIP ON KO-FI →
            </a>
          ) : (
            <a href={supportMailto} className="btn-steel" style={{ textAlign: "center", justifyContent: "center" }}>
              KO-FI OPENING SOON · CONTACT US
            </a>
          )}
        </div>

        {/* Tier 2: Monthly Ad-Free Supporter via Patreon */}
        <div
          className="cab-surface cab-chamfer"
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 18,
            borderColor: "var(--volt)",
            boxShadow: "0 0 28px rgba(243,255,0,0.14)"
          }}
        >
          <div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)" }}>MOST POPULAR // AD-FREE MEMBERSHIP</div>
            <div className="font-display" style={{ fontSize: 30, fontWeight: 700, margin: "8px 0" }}>
              $3 <span style={{ fontSize: 14, color: "var(--ink-muted)" }}>/ MONTH</span>
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)", marginBottom: 14 }}>
              Via Patreon · Cancel anytime · Auto-syncs Pro badge via email
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#d5dae6", display: "grid", gap: 8 }}>
              <li>100% ad-free arcade cabinets &amp; game pages</li>
              <li>PRO Supporter badge next to your global high scores</li>
              <li>Listed on the Community Hall of Patrons</li>
              <li>Use the same email as your SYNTHPLAY login for instant activation</li>
            </ul>
          </div>
          {patreonUrl ? (
            <a href={patreonUrl} target="_blank" rel="noopener noreferrer" className="btn-volt" style={{ textAlign: "center", justifyContent: "center" }}>
              JOIN ON PATREON ($3/MO) →
            </a>
          ) : (
            <a href={supportMailto} className="btn-volt" style={{ textAlign: "center", justifyContent: "center" }}>
              PATREON OPENING SOON · CONTACT US
            </a>
          )}
        </div>

        {/* Tier 3: Indie Dev Featured Spotlight */}
        <div className="cab-surface cab-chamfer" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18 }}>
          <div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--vermilion)" }}>FOR INDIE &amp; AI GAME DEVS</div>
            <div className="font-display" style={{ fontSize: 30, fontWeight: 700, margin: "8px 0" }}>
              $29 <span style={{ fontSize: 14, color: "var(--ink-muted)" }}>/ 7 DAYS</span>
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 14 }}>
              Featured Game Spotlight · Ko-fi or Direct Email Booking
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-muted)", display: "grid", gap: 8 }}>
              <li>Pin your HTML5/WebGL game or Steam Wishlist demo in the Arcade Spotlight</li>
              <li>Dedicated card in the Hall of Patrons &amp; Homepage Marquee</li>
              <li>Full review for quality &amp; player safety before going live</li>
            </ul>
          </div>
          <a
            href={kofiUrl || supportMailto}
            target={kofiUrl ? "_blank" : undefined}
            rel={kofiUrl ? "noopener noreferrer" : undefined}
            className="btn-crimson"
            style={{ textAlign: "center", justifyContent: "center" }}
          >
            BOOK INDIE SPOTLIGHT →
          </a>
        </div>
      </div>

      {/* Transparent Direct Contact Bar */}
      <div
        className="cab-surface font-mono"
        style={{
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          fontSize: 12
        }}
      >
        <span style={{ color: "var(--ink-muted)" }}>
          Want to sponsor a game jam, showcase an AI dev tool, or partner with SYNTHPLAY?
        </span>
        <a href="mailto:support@synthplay.games" style={{ color: "var(--cyan)", textDecoration: "none", fontWeight: 700 }}>
          support@synthplay.games →
        </a>
      </div>

      {/* AI Creator Toolchain Affiliate Recommendations */}
      <AiToolsShelf />
    </section>
  );
}
