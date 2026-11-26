"use client";

import React, { useEffect, useState } from "react";
import type { PaymentProvider } from "@synthplay/db";
import { COUNTRIES, getCountryName, type Locale, t } from "@synthplay/i18n";

interface RailStatus {
  creem: boolean;
  kofi: boolean;
  patreon: boolean;
  paypal: boolean;
  hostedUrls: { kofi: string; patreon: string; paypalMe: string };
}

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
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [rails, setRails] = useState<RailStatus | null>(null);

  useEffect(() => {
    fetch("/api/checkout")
      .then((r) => r.json())
      .then((d) => setRails(d))
      .catch(() => {});
  }, []);

  const amountMap = {
    pro_monthly: 5,
    gold_patron: 35,
    diamond_b2b: 299
  };

  const submitSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setDone(null);
    try {
      // 1. Try real live checkout rail (Creem MoR Checkout API / Hosted Ko-fi / Patreon / PayPal.me)
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          tier,
          payerName: payerName || "NEW PATRON",
          payerCountry: country,
          tagline,
          targetUrl
        })
      });
      const checkout = await checkoutRes.json();
      if (checkoutRes.ok && checkout.mode === "redirect" && checkout.checkoutUrl) {
        window.open(checkout.checkoutUrl, "_blank", "noopener,noreferrer");
        setDone(
          `Live ${provider.toUpperCase()} checkout opened in new tab! Once paid, our verified webhook automatically activates your Pro badge & Showcase slot.`
        );
        return;
      }

      // 2. Fallback: Sandbox booking / B2B invoice reservation
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
        setDone(
          `Order ${data.orderId} recorded ($${amountMap[tier]} via ${provider.toUpperCase()}). Showcase Hall & Admin Ledger updated live!`
        );
        onOrderCreated();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSelectedRailLive =
    (provider === "creem" && Boolean(rails?.creem)) ||
    (provider === "kofi" && Boolean(rails?.hostedUrls.kofi)) ||
    (provider === "patreon" && Boolean(rails?.hostedUrls.patreon)) ||
    (provider === "paypal" && Boolean(rails?.hostedUrls.paypalMe));

  return (
    <section className="sp-container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="section-bar">
        <div>
          <div className="section-index">04 // MONETIZATION &amp; SPONSOR SHOWCASE SLOTS</div>
          <h1 className="section-heading">{t(locale, "sponsorPageTitle")}</h1>
          <p style={{ color: "var(--ink-muted)", fontSize: 14, marginTop: 6 }}>
            Tailored for Mainland Business PayPal + Payoneer USD + Creem MoR + Ko-fi + Patreon with automated webhook fulfillment.
          </p>
        </div>
        {rails && (
          <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 10 }}>
            {(
              [
                ["CREEM", rails.creem],
                ["KO-FI", rails.kofi],
                ["PATREON", rails.patreon],
                ["PAYPAL", rails.paypal]
              ] as Array<[string, boolean]>
            ).map(([label, live]) => (
              <span
                key={label}
                style={{
                  padding: "3px 8px",
                  border: `1px solid ${live ? "var(--cyan)" : "var(--hairline)"}`,
                  color: live ? "var(--cyan)" : "var(--ink-muted)"
                }}
              >
                {label}: {live ? "WEBHOOK LIVE" : "STANDBY"}
              </span>
            ))}
          </div>
        )}
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
          {isSelectedRailLive
            ? `LIVE ${provider.toUpperCase()} CHECKOUT · AUTO-PROVISIONS VIA VERIFIED WEBHOOK`
            : "ACTIVATE SPONSOR SHOWCASE SLOT (DIRECT RESERVATION / SANDBOX MODE)"}
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
          <button type="submit" className="btn-volt" disabled={submitting}>
            {submitting ? "INITIALIZING..." : isSelectedRailLive ? `PAY VIA ${provider.toUpperCase()} ->` : "CONFIRM & ACTIVATE SHOWCASE SLOT"}
          </button>
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
