"use client";

import React, { useState } from "react";
import type { PaymentProvider } from "@synthplay/db";
import { COUNTRIES, getCountryName, type Locale, t } from "@synthplay/i18n";

export function SponsorView({
  locale,
  onOrderCreated
}: {
  locale: Locale;
  onOrderCreated: () => void;
}) {
  const [tier, setTier] = useState<"pro_monthly" | "gold_patron" | "diamond_b2b">("gold_patron");
  const [provider, setProvider] = useState<PaymentProvider>("creem");
  const [payerName, setPayerName] = useState("");
  const [country, setCountry] = useState("US");
  const [tagline, setTagline] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://");
  const [done, setDone] = useState<string | null>(null);

  const amountMap = {
    pro_monthly: 5,
    gold_patron: 35,
    diamond_b2b: 299
  };

  const submitSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setDone(null);
    const res = await fetch("/api/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payerName: payerName || "NEW PATRON",
        payerCountry: country,
        provider,
        tier,
        amountUsd: amountMap[tier],
        tagline: tagline || "Backing free global AI indie games on SYNTHPLAY.",
        targetUrl
      })
    });
    if (res.ok) {
      const data = await res.json();
      setDone(`Order ${data.orderId} recorded ($${amountMap[tier]} via ${provider.toUpperCase()}). Showcase Hall & Admin Ledger updated live!`);
      onOrderCreated();
    }
  };

  return (
    <section className="sp-container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="section-bar">
        <div>
          <div className="section-index">04 // MONETIZATION &amp; SPONSOR SHOWCASE SLOTS</div>
          <h1 className="section-heading">{t(locale, "sponsorPageTitle")}</h1>
          <p style={{ color: "var(--ink-muted)", fontSize: 14, marginTop: 6 }}>
            Tailored for Mainland Business PayPal + Payoneer USD + Creem MoR + Ko-fi + Patreon (Lemon Squeezy &amp; Paddle removed).
          </p>
        </div>
      </div>

      {/* 3 Tiers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginBottom: 28 }}>
        {[
          {
            key: "pro_monthly" as const,
            title: "PRO SUPPORTER",
            price: "$5 / MO",
            rail: "Creem MoR (Global Card / Apple Pay) or Patreon (-> Payoneer)",
            perks: ["Ad-free arcade cabinets", "Supporter Wall country badge", "Unlimited cloud saves & 300MB upload cap"]
          },
          {
            key: "gold_patron" as const,
            title: "GOLD PATRON SHOWCASE",
            price: "$35 / SLOT",
            rail: "Ko-fi (0% tip fee -> Business PayPal) or PayPal Checkout",
            perks: ["Dedicated Hall of Patrons glowing card", "Custom slogan + outbound backlink", "Permanent Gold Patron profile badge"]
          },
          {
            key: "diamond_b2b" as const,
            title: "DIAMOND B2B & JAM TITLE",
            price: "$299 / MO",
            rail: "PayPal Business Invoice or Payoneer Billing Service",
            perks: ["Top Hero LED Marquee global exposure", "Hall of Patrons Diamond spotlight", "Monthly 48H AI Game Jam title branding + commercial invoice"]
          }
        ].map((card) => (
          <div
            key={card.key}
            onClick={() => setTier(card.key)}
            className="cab-surface cab-chamfer"
            style={{
              padding: 22,
              cursor: "pointer",
              borderColor: tier === card.key ? "var(--volt)" : "var(--hairline)",
              boxShadow: tier === card.key ? "0 0 28px rgba(243,255,0,0.18)" : "none"
            }}
          >
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)" }}>{card.title}</div>
            <div className="font-display" style={{ fontSize: 30, fontWeight: 700, margin: "8px 0" }}>{card.price}</div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)", marginBottom: 14 }}>{card.rail}</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-muted)", display: "grid", gap: 6 }}>
              {card.perks.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Live Sponsorship Booking Form */}
      <form onSubmit={submitSponsor} className="cab-surface cab-chamfer" style={{ padding: 26, display: "grid", gap: 16 }}>
        <div className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>
          ACTIVATE SPONSOR SHOWCASE SLOT (SIMULATED CHECKOUT -&gt; WRITES LIVE TO STORE &amp; ADMIN)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>BRAND / PATRON NAME *</div>
            <input className="sp-input" required value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="e.g. HyperCompute AI" />
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>PAYMENT RAIL</div>
            <select className="sp-select" value={provider} onChange={(e) => setProvider(e.target.value as PaymentProvider)}>
              <option value="creem">Creem MoR (Cards / Apple Pay -&gt; Bank / Alipay)</option>
              <option value="kofi">Ko-fi (0% Fee -&gt; Mainland Business PayPal)</option>
              <option value="patreon">Patreon (Monthly -&gt; Payoneer USD)</option>
              <option value="paypal">Mainland Business PayPal (Cross-border / Invoice)</option>
              <option value="payoneer_b2b">Payoneer Billing Service (B2B Invoice -&gt; Payoneer)</option>
            </select>
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>COUNTRY</div>
            <select className="sp-select" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.filter((c) => c.code !== "ALL").map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {getCountryName(c.code, locale)}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>SHOWCASE SLOGAN</div>
            <input className="sp-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Displayed directly on Homepage Hall of Patrons" />
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>WEBSITE / PROFILE URL</div>
            <input className="sp-input" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            TOTAL: <strong style={{ color: "var(--volt)" }}>${amountMap[tier]} USD</strong> · Cross-border compliant
          </span>
          <button type="submit" className="btn-volt">CONFIRM &amp; ACTIVATE SHOWCASE SLOT</button>
        </div>

        {done && (
          <div className="font-mono" style={{ padding: 12, border: "1px solid var(--cyan)", background: "rgba(0,240,212,0.08)", color: "var(--cyan)", fontSize: 12 }}>
            {done}
          </div>
        )}
      </form>
    </section>
  );
}
