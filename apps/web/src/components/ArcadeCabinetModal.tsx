"use client";

import React, { useEffect, useRef, useState } from "react";
import type { GameRecord, ScoreRecord } from "@synthplay/db";
import { IconShield, IconSpark, IconTrophy } from "./Icons";
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
  const [sdkScore, setSdkScore] = useState<number>(0);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [scoreStatus, setScoreStatus] = useState<string | null>(null);
  const [submittingScore, setSubmittingScore] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Load existing top high scores for this cabinet
  useEffect(() => {
    fetch(`/api/scores?gameId=${encodeURIComponent(game.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.scores)) setScores(d.scores);
      })
      .catch(() => {});
  }, [game.id]);

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

  // Listen for SynthPlay Game SDK postMessage events (SCORE / SAVE_STATE / LOAD_STATE / OPEN_TIP)
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || data.source !== "synthplay-sdk") return;
      if (data.type === "SCORE" && Number.isFinite(Number(data.score))) {
        setSdkScore((prev) => Math.max(prev, Number(data.score)));
      } else if (data.type === "SAVE_STATE" && data.payload && typeof data.payload === "object") {
        fetch("/api/cloud-save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: game.id, payload: data.payload })
        }).catch(() => {});
      } else if (data.type === "LOAD_STATE") {
        fetch(`/api/cloud-save?gameId=${encodeURIComponent(game.id)}`)
          .then((r) => (r.ok ? r.json() : { save: null }))
          .then((d) => {
            iframeRef.current?.contentWindow?.postMessage(
              { source: "synthplay-host", type: "LOAD_STATE_RESULT", payload: d?.save?.payload || null },
              "*"
            );
          })
          .catch(() => {});
      } else if (data.type === "OPEN_TIP" && game.creatorTipUrl) {
        window.open(game.creatorTipUrl, "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [game.creatorTipUrl, game.id]);

  const handleSubmitScore = async () => {
    if (sdkScore <= 0 || submittingScore) return;
    setSubmittingScore(true);
    setScoreStatus(null);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          score: sdkScore,
          countryCode: playerCountry === "ALL" ? "US" : playerCountry
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.scores)) setScores(data.scores);
        setScoreStatus(data.saved ? `NEW RECORD SAVED: ${data.personalBest.toLocaleString()}!` : `PERSONAL BEST: ${data.personalBest.toLocaleString()}`);
      }
    } finally {
      setSubmittingScore(false);
    }
  };

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
              {sdkScore > 0 && (
                <span style={{ color: "var(--volt)" }}>| BEST RUN: {sdkScore.toLocaleString()}</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {sdkScore > 0 && (
              <button
                type="button"
                className="btn-volt font-mono"
                onClick={handleSubmitScore}
                disabled={submittingScore}
                style={{ padding: "8px 14px", fontSize: 11 }}
              >
                <IconTrophy size={13} />
                <span>{submittingScore ? "SAVING..." : `POST SCORE (${sdkScore.toLocaleString()})`}</span>
              </button>
            )}
            <button
              type="button"
              className="btn-steel font-mono"
              onClick={() => {
                const target = iframeRef.current;
                if (target && target.requestFullscreen) {
                  target.requestFullscreen().catch(() => {});
                }
              }}
              style={{ padding: "8px 12px", fontSize: 11 }}
              title="Fullscreen Game"
            >
              ⛶ FULLSCREEN
            </button>
            <button className="btn-steel" onClick={onClose} style={{ padding: "8px 16px" }}>
              ESC / EXIT
            </button>
          </div>
        </div>

        {/* Game Viewport */}
        <div style={{ position: "relative", border: "1px solid var(--hairline-strong)", background: "#050608", overflow: "hidden" }}>
          {game.sandboxUrl ? (
            <iframe
              ref={iframeRef}
              title={game.title}
              allow="fullscreen; pointer-lock; autoplay; gamepad"
              allowFullScreen
              sandbox={
                game.sandboxUrl.startsWith("https://") || game.sandboxUrl.startsWith("/arcade/")
                  ? "allow-scripts allow-pointer-lock allow-same-origin"
                  : "allow-scripts allow-pointer-lock"
              }
              src={game.sandboxUrl}
              style={{ width: "100%", height: "min(68vh, 560px)", minHeight: 420, border: 0, display: "block", background: "#07080b" }}
            />
          ) : game.sandboxHtml ? (
            <iframe
              ref={iframeRef}
              title={game.title}
              allow="fullscreen; pointer-lock; autoplay"
              allowFullScreen
              sandbox="allow-scripts allow-pointer-lock"
              srcDoc={game.sandboxHtml}
              style={{ width: "100%", height: "min(68vh, 560px)", minHeight: 420, border: 0, display: "block", background: "#07080b" }}
            />
          ) : (
            <BuiltInGameRouter game={game} onScore={(s) => setSdkScore((prev) => Math.max(prev, s))} />
          )}
        </div>

        {/* Live Per-Game High Score Strip (PostgreSQL + Redis ZSET) */}
        <div
          className="font-mono"
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(9,11,16,0.92)",
            border: "1px solid var(--hairline)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            fontSize: 11
          }}
        >
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ color: "var(--volt)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <IconTrophy size={13} /> CABINET HIGH SCORES:
            </span>
            {scores.length === 0 ? (
              <span style={{ color: "var(--ink-muted)" }}>No scores posted yet — score points &amp; click POST SCORE to claim #1!</span>
            ) : (
              scores.slice(0, 5).map((sc, i) => (
                <span key={sc.id} style={{ color: i === 0 ? "var(--volt)" : "#d5dae6" }}>
                  #{i + 1} [{sc.countryCode}] {sc.playerName}: <strong>{sc.score.toLocaleString()}</strong>
                </span>
              ))
            )}
          </div>
          {scoreStatus && <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{scoreStatus}</span>}
        </div>

        {/* Slot #4: Game Page Dual Sponsor & Creator Tip Dock */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
            marginTop: 12
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
                Ad-free cabinets ($3/mo) · Support via Patreon or Ko-fi
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
