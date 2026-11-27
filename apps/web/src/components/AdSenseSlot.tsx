"use client";

import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export function AdSenseSlot({
  slotId,
  isProSupporter = false,
  onOpenSponsor,
  label = "ARCADE NETWORK SPONSOR"
}: {
  slotId?: string;
  isProSupporter?: boolean;
  onOpenSponsor?: () => void;
  label?: string;
}) {
  const pushedRef = useRef(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-9713722525832645";
  const isLive = Boolean(client && client.startsWith("ca-pub-") && slotId);

  useEffect(() => {
    if (!isLive || isProSupporter || pushedRef.current) return;
    pushedRef.current = true;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ignore AdSense ad-blocker errors cleanly
    }
  }, [isLive, isProSupporter]);

  // Pro Supporters enjoy 100% ad-free cabinets & storefront
  if (isProSupporter) return null;

  if (isLive) {
    return (
      <div
        style={{
          margin: "20px 0",
          padding: "10px 12px",
          background: "rgba(13,16,23,0.72)",
          border: "1px solid var(--hairline)",
          textAlign: "center",
          minHeight: 100
        }}
      >
        <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.1em" }}>
          {label} · <button type="button" onClick={onOpenSponsor} style={{ background: "none", border: 0, color: "var(--volt)", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>REMOVE ADS WITH PRO</button>
        </div>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return (
    <div
      className="font-mono"
      style={{
        margin: "20px 0",
        padding: "12px 18px",
        background: "linear-gradient(90deg, rgba(243,255,0,0.05) 0%, rgba(0,240,212,0.05) 100%)",
        border: "1px dashed rgba(243,255,0,0.28)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        fontSize: 11
      }}
    >
      <div>
        <span style={{ color: "var(--volt)", fontWeight: 700 }}>{label}</span>
        <span style={{ color: "var(--ink-muted)", marginLeft: 10 }}>
          100% Free Global AI Arcade · Funded by Community Patrons &amp; Non-Intrusive Sponsors
        </span>
      </div>
      {onOpenSponsor && (
        <button
          type="button"
          className="btn-steel"
          style={{ padding: "6px 12px", fontSize: 11 }}
          onClick={onOpenSponsor}
        >
          GO AD-FREE ($3/MO SUPPORTER) / FEATURE YOUR GAME →
        </button>
      )}
    </div>
  );
}
