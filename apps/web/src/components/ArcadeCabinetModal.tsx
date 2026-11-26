"use client";

import React, { useEffect, useState } from "react";
import type { GameRecord } from "@synthplay/db";
import { IconShield, IconSpark } from "./Icons";
import { BuiltInGameRouter } from "./games/BuiltInGameRouter";

interface ArcadeCabinetModalProps {
  game: GameRecord;
  playerCountry: string;
  onClose: () => void;
  onPlayCounted: (gameId: string, newTotal: number) => void;
  onOpenSponsor: () => void;
}

export function ArcadeCabinetModal({
  game,
  playerCountry,
  onClose,
  onPlayCounted,
  onOpenSponsor
}: ArcadeCabinetModalProps) {
  const [visibleSec, setVisibleSec] = useState(0);
  const [counted, setCounted] = useState(false);
  const [sdkScore, setSdkScore] = useState<number | null>(null);

  // ESC to close cabinet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Anti-cheat visible-play heartbeat timer (10s visible play records a valid play)
  useEffect(() => {
    let sec = 0;
    let sent = false;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      sec += 1;
      setVisibleSec(sec);
      if (sec >= 10 && !sent) {
        sent = true;
        fetch("/api/play-heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: game.id,
            countryCode: playerCountry === "ALL" ? "JP" : playerCountry,
            visibleSeconds: sec
          })
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.counted) {
              setCounted(true);
              onPlayCounted(game.id, d.totalValidPlays);
            }
          })
          .catch(() => {});
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [game.id, onPlayCounted, playerCountry]);

  // Listen for SynthPlay Game SDK postMessage events (SCORE / OPEN_TIP)
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || data.source !== "synthplay-sdk") return;
      if (data.type === "SCORE" && Number.isFinite(Number(data.score))) {
        setSdkScore(Number(data.score));
      } else if (data.type === "OPEN_TIP" && game.creatorTipUrl) {
        window.open(game.creatorTipUrl, "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [game.creatorTipUrl]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="cab-surface cab-chamfer"
        style={{ width: "100%", maxWidth: 960, maxHeight: "94vh", overflowY: "auto", padding: 20, border: "1px solid rgba(243,255,0,0.4)" }}
      >
        {/* Cabinet Top Telemetry Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <span className="font-mono" style={{ fontSize: 11, padding: "2px 8px", background: "var(--volt)", color: "#07080b", fontWeight: 700 }}>
                SANDBOX ACTIVE
              </span>
              <span className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
                {game.title}
              </span>
              <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                [{game.creatorCountryCode}] by {game.creatorName}
              </span>
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)", marginTop: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <IconShield size={13} />
              <span>BG WEBGL SUSPENDED · 100% GPU DEDICATED</span>
              <span style={{ color: counted ? "var(--volt)" : "var(--ink-muted)" }}>
                | HEARTBEAT: {visibleSec}s {counted ? "(VALID PLAY RECORDED)" : "(10s FOR RANK)"}
              </span>
              {sdkScore !== null && (
                <span style={{ color: "var(--volt)" }}>| SCORE: {sdkScore.toLocaleString()}</span>
              )}
            </div>
          </div>

          <button className="btn-steel" onClick={onClose} style={{ padding: "8px 16px" }}>
            ESC / EXIT CABINET
          </button>
        </div>

        {/* Game Viewport */}
        <div style={{ position: "relative", border: "1px solid var(--hairline-strong)", background: "#050608", overflow: "hidden" }}>
          {game.sandboxUrl ? (
            <iframe
              title={game.title}
              sandbox={
                game.sandboxUrl.startsWith("https://")
                  ? "allow-scripts allow-pointer-lock allow-same-origin"
                  : "allow-scripts allow-pointer-lock"
              }
              src={game.sandboxUrl}
              style={{ width: "100%", height: 460, border: 0, display: "block", background: "#07080b" }}
            />
          ) : game.sandboxHtml ? (
            <iframe
              title={game.title}
              sandbox="allow-scripts allow-pointer-lock"
              srcDoc={game.sandboxHtml}
              style={{ width: "100%", height: 460, border: 0, display: "block", background: "#07080b" }}
            />
          ) : (
            <BuiltInGameRouter game={game} onScore={setSdkScore} />
          )}
        </div>

        {/* Slot #4: Game Page Dual Sponsor & Creator Tip Dock */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
            marginTop: 14
          }}
        >
          <div style={{ padding: "12px 14px", background: "var(--bg-panel)", border: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 700 }}>
                DIRECT TIP TO {game.creatorName}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                0% platform cut · Direct Ko-fi / Patreon / PayPal.me
              </div>
            </div>
            <a
              href={game.creatorTipUrl || "https://ko-fi.com"}
              target="_blank"
              rel="noreferrer"
              className="btn-crimson"
              style={{ padding: "8px 14px", fontSize: 12, flexShrink: 0 }}
            >
              TIP CREATOR
            </a>
          </div>

          <div style={{ padding: "12px 14px", background: "var(--bg-panel)", border: "1px solid rgba(243,255,0,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: "var(--volt)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconSpark size={14} /> PRO SUPPORTER / SPONSOR SLOT
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                Ad-free cabinets · Patron Wall · Creem / PayPal / Ko-fi
              </div>
            </div>
            <button
              className="btn-volt"
              onClick={() => {
                onClose();
                onOpenSponsor();
              }}
              style={{ padding: "8px 14px", fontSize: 12, flexShrink: 0 }}
            >
              BACK SYNTHPLAY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
