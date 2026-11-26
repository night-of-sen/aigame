"use client";

import React, { useEffect, useState } from "react";
import type { GameRecord, UserRecord } from "@synthplay/db";
import { COUNTRIES, type Locale, t } from "@synthplay/i18n";

export function DashboardView({
  locale,
  onPlayGame
}: {
  locale: Locale;
  onPlayGame: (g: GameRecord) => void;
}) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [myGames, setMyGames] = useState<GameRecord[]>([]);
  const [kofi, setKofi] = useState("");
  const [patreon, setPatreon] = useState("");
  const [country, setCountry] = useState("CN");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setMyGames(d.myGames || []);
        setKofi(d.user?.creatorTipLinks?.kofi || "");
        setPatreon(d.user?.creatorTipLinks?.patreon || "");
        setCountry(d.user?.countryCode || "CN");
      })
      .catch(() => {});
  }, []);

  const saveSettings = async () => {
    setSaved(false);
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: country,
        creatorTipLinks: { kofi, patreon }
      })
    });
    if (res.ok) {
      const d = await res.json();
      setUser(d.user);
      setSaved(true);
    }
  };

  return (
    <section className="sp-container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="section-bar">
        <div>
          <div className="section-index">03 // PLAYER &amp; CREATOR DASHBOARD</div>
          <h1 className="section-heading">{t(locale, "dashboardTitle")}</h1>
        </div>
        {user && (
          <div className="font-mono" style={{ display: "flex", gap: 10, fontSize: 12 }}>
            <span style={{ padding: "6px 12px", background: "var(--bg-panel)", border: "1px solid var(--hairline)" }}>
              HANDLE: <strong style={{ color: "var(--volt)" }}>@{user.username}</strong>
            </span>
            <span style={{ padding: "6px 12px", background: "var(--bg-panel)", border: "1px solid var(--cyan)" }}>
              {user.isProSupporter ? "PRO SUPPORTER ACTIVE" : "FREE PLAYER"}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {/* Left: Creator Profile & Tip Links */}
        <div className="cab-surface cab-chamfer" style={{ padding: 24, display: "grid", gap: 14, alignContent: "start" }}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--volt)" }}>
            CREATOR PROFILE &amp; 0%-CUT TIP LINKS
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: 0 }}>
            Direct tips go straight to your Ko-fi / Patreon / PayPal.me so you keep 100% and avoid escrow delays.
          </p>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>COUNTRY BADGE</div>
            <select className="sp-select" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.filter((c) => c.code !== "ALL").map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.nameZh}</option>
              ))}
            </select>
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>KO-FI URL (0% TIP FEE -&gt; PAYPAL)</div>
            <input className="sp-input" value={kofi} onChange={(e) => setKofi(e.target.value)} />
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>PATREON URL (DIRECT TO PAYONEER)</div>
            <input className="sp-input" value={patreon} onChange={(e) => setPatreon(e.target.value)} />
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" className="btn-volt" onClick={saveSettings}>SAVE SETTINGS</button>
            {saved && <span className="font-mono" style={{ fontSize: 12, color: "var(--cyan)" }}>SAVED TO STORE</span>}
          </div>
        </div>

        {/* Right: My Published Games & Telemetry */}
        <div className="cab-surface cab-chamfer" style={{ padding: 24, display: "grid", gap: 14, alignContent: "start" }}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>
            MY PUBLISHED CABINETS ({myGames.length})
          </div>
          {myGames.map((g) => (
            <div
              key={g.id}
              style={{
                padding: 14,
                background: "var(--bg-panel)",
                border: "1px solid var(--hairline)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12
              }}
            >
              <div>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 15 }}>{g.title}</div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>
                  STATUS: <strong style={{ color: g.status === "published" ? "var(--cyan)" : "var(--amber)" }}>{g.status.toUpperCase()}</strong>
                  {" · "}PLAYS: {g.totalValidPlays.toLocaleString()}
                  {" · "}SCAN: {g.securityScore}/100
                </div>
              </div>
              <button type="button" className="btn-steel" style={{ padding: "8px 14px", fontSize: 11 }} onClick={() => onPlayGame(g)}>
                TEST PLAY
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
