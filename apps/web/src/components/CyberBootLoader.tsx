"use client";

import React, { useEffect, useState } from "react";

const BOOT_LINES = [
  "SYS.BOOT // SYNTHPLAY NEURAL ARCADE OS v2.6",
  "GPU.SHADER // MOUNTING GLSL PHOSPHOR ENGINE [OK]",
  "NET.EDGE // CLOUDFLARE R2 ZERO-EGRESS NODES [OK]",
  "SANDBOX // ISOLATION *.SYNTHPLAY-BOX.CLOUD [OK]"
];

/**
 * Non-blocking Cyberpunk boot reveal:
 * - Renders ONLY after client hydration (so SSR/preview can NEVER hang on 000%)
 * - Driven by timer + CSS failsafe auto-dismiss, guaranteed to finish in ~950ms
 * - Click anywhere to dismiss immediately
 */
export function CyberBootLoader() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"boot" | "split" | "done">("boot");
  const [pct, setPct] = useState(12);

  useEffect(() => {
    setMounted(true);
    let current = 12;
    const iv = setInterval(() => {
      current = Math.min(100, current + 14);
      setPct(current);
      if (current >= 100) {
        clearInterval(iv);
        setPhase("split");
      }
    }, 85);

    const tSplit = setTimeout(() => {
      setPct(100);
      setPhase("split");
    }, 680);

    const tDone = setTimeout(() => {
      setPhase("done");
    }, 1180);

    return () => {
      clearInterval(iv);
      clearTimeout(tSplit);
      clearTimeout(tDone);
    };
  }, []);

  if (!mounted || phase === "done") return null;

  const visibleLines = Math.max(1, Math.ceil((pct / 100) * BOOT_LINES.length));

  return (
    <div
      className={`cyber-boot-overlay ${phase === "split" ? "is-splitting" : ""}`}
      onClick={() => setPhase("done")}
      role="status"
      aria-label="Loading SYNTHPLAY"
    >
      <div className="cyber-boot-half top" />
      <div className="cyber-boot-half bottom" />
      <div className="cyber-boot-laser" />

      <div className="cyber-boot-core">
        <div className="cyber-boot-logo-wrap">
          <div className="cyber-boot-hex" />
          <span className="font-display cyber-boot-word">SYNTHPLAY</span>
        </div>

        <div className="cyber-boot-bar-shell">
          <div className="cyber-boot-bar-fill" style={{ width: `${pct}%` }} />
          <div className="cyber-boot-bar-spark" style={{ left: `${pct}%` }} />
        </div>

        <div className="font-mono cyber-boot-meta">
          <span>LINKING CYBER ARCADE MATRIX</span>
          <span style={{ color: "var(--volt)", fontWeight: 700 }}>{String(pct).padStart(3, "0")}%</span>
        </div>

        <div className="font-mono cyber-boot-log">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={line} style={{ opacity: i === visibleLines - 1 ? 1 : 0.6 }}>
              &gt; {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CyberPageShutter({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;
  return (
    <div className="cyber-shutter-overlay" aria-hidden="true">
      <div className="cyber-shutter-band b1" />
      <div className="cyber-shutter-band b2" />
      <div className="cyber-shutter-label font-display">
        <span>// WARPING TO {label}</span>
      </div>
    </div>
  );
}
