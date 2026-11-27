"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { GameRecord, ReviewRecord } from "@synthplay/db";
import { ArcadeCabinetModal } from "./ArcadeCabinetModal";
import { AdSenseSlot } from "./AdSenseSlot";
import { TurnstileWidget } from "./TurnstileWidget";
import { AiToolsShelf } from "./AiToolsShelf";
import { IconPlay, IconShield, IconSpark } from "./Icons";

export function GameDetailClient({
  game,
  initialReviews
}: {
  game: GameRecord;
  initialReviews: ReviewRecord[];
}) {
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(game.totalValidPlays);
  const [reviews, setReviews] = useState<ReviewRecord[]>(initialReviews);
  const [gameplayScore, setGameplayScore] = useState(5);
  const [visualScore, setVisualScore] = useState(5);
  const [aiScore, setAiScore] = useState(5);
  const [comment, setComment] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/games/${game.slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameplayScore, visualScore, aiScore, comment, turnstileToken })
      });
      const data = await res.json();
      if (res.ok && data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setComment("");
        setMsg("Review published to PostgreSQL!");
      } else {
        setMsg(data.error || "Could not submit review.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)", color: "var(--ink)" }}>
      <header className="sp-header">
        <div className="sp-header-inner">
          <Link href="/" className="sp-brand">
            <div className="sp-logo-mark">SP</div>
            <div>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>SYNTHPLAY</div>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--volt)" }}>← BACK TO ARCADE HALL</div>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-steel" style={{ padding: "8px 14px", fontSize: 11 }} onClick={shareUrl}>
              <span>{copied ? "COPIED URL!" : "SHARE GAME LINK"}</span>
            </button>
            <button type="button" className="btn-volt" style={{ padding: "8px 18px", fontSize: 12 }} onClick={() => setPlaying(true)}>
              <IconPlay size={14} />
              <span>PLAY FREE NOW</span>
            </button>
          </div>
        </div>
      </header>

      <main className="sp-container" style={{ paddingTop: 34, paddingBottom: 72 }}>
        {/* Hero Key Art Banner */}
        <div className="cab-energy-border" style={{ overflow: "hidden", marginBottom: 28 }}>
          <div style={{ position: "relative", minHeight: 360, display: "flex", alignItems: "flex-end" }}>
            <img
              src={game.coverImage}
              alt={game.title}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(6,7,10,0.96) 0%, rgba(6,7,10,0.45) 55%, rgba(6,7,10,0.25) 100%)" }} />
            <div style={{ position: "relative", zIndex: 2, padding: 28, width: "100%", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
              <div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", letterSpacing: "0.14em" }}>
                  [{game.creatorCountryCode}] {game.category} · {game.playType.toUpperCase()} · 100% FREE ONLINE
                </div>
                <h1 className="font-display" style={{ margin: "8px 0 10px", fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
                  {game.title} <span style={{ color: "var(--ink-muted)", fontSize: "0.6em" }}>· {game.titleZh}</span>
                </h1>
                <p style={{ maxWidth: 660, color: "#d5dae6", margin: 0, lineHeight: 1.6 }}>
                  {game.taglineZh} — {game.tagline}
                </p>
              </div>
              <button type="button" className="btn-volt" onClick={() => setPlaying(true)}>
                <IconPlay size={16} />
                <span>BOOT ARCADE CABINET</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info + AI Creation Story + Reviews Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
            <div className="cab-surface" style={{ padding: 22 }}>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)", marginBottom: 10 }}>
                AI CREATION WORKFLOW &amp; TOOLCHAIN
              </div>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: "#d5dae6", lineHeight: 1.6 }}>
                {game.aiPromptNote || "Crafted with modern AI-assisted browser game tooling and hosted on Cloudflare R2 zero-egress edge."}
              </p>
              <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11 }}>
                {game.aiTools.map((tool) => (
                  <span key={tool} style={{ padding: "5px 10px", borderRadius: 5, background: "rgba(243,255,0,0.1)", border: "1px solid rgba(243,255,0,0.35)", color: "var(--volt)" }}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <div className="cab-surface" style={{ padding: 22, display: "grid", gap: 12 }}>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <IconShield size={14} /> SANDBOX VERIFICATION &amp; STATS
              </div>
              <div className="font-mono" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ padding: 12, background: "#0a0c12", borderRadius: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--volt)" }}>{plays.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>VERIFIED PLAYS</div>
                </div>
                <div style={{ padding: 12, background: "#0a0c12", borderRadius: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cyan)" }}>★ {game.rating.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>AVG RATING</div>
                </div>
                <div style={{ padding: 12, background: "#0a0c12", borderRadius: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{game.securityScore}/100</div>
                  <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>SANDBOX SCORE</div>
                </div>
              </div>

              <div style={{ paddingTop: 10, borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>SUPPORT {game.creatorName}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>0% platform commission · Direct creator tip</div>
                </div>
                <a
                  href={game.creatorTipUrl || "https://ko-fi.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-crimson"
                  style={{ padding: "8px 14px", fontSize: 12 }}
                >
                  <IconSpark size={13} /> TIP CREATOR
                </a>
              </div>
            </div>
          </div>

          {/* Community 4-Dimension Reviews */}
          <div className="cab-surface" style={{ padding: 22, display: "grid", gap: 16, alignContent: "start" }}>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 700 }}>
              COMMUNITY REVIEWS ({reviews.length})
            </div>

            <form onSubmit={submitReview} style={{ display: "grid", gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--hairline)" }}>
              <div className="font-mono" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 11 }}>
                <label>
                  GAMEPLAY: {gameplayScore}★
                  <input type="range" min={1} max={5} value={gameplayScore} onChange={(e) => setGameplayScore(Number(e.target.value))} style={{ width: "100%" }} />
                </label>
                <label>
                  VISUALS: {visualScore}★
                  <input type="range" min={1} max={5} value={visualScore} onChange={(e) => setVisualScore(Number(e.target.value))} style={{ width: "100%" }} />
                </label>
                <label>
                  AI MAGIC: {aiScore}★
                  <input type="range" min={1} max={5} value={aiScore} onChange={(e) => setAiScore(Number(e.target.value))} style={{ width: "100%" }} />
                </label>
              </div>
              <textarea
                className="sp-textarea"
                rows={3}
                required
                placeholder="Share your thoughts on gameplay, visuals, or AI mechanics..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <TurnstileWidget onToken={setTurnstileToken} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--cyan)" }}>{msg || ""}</span>
                <button type="submit" className="btn-volt" style={{ padding: "8px 16px", fontSize: 12 }} disabled={submitting}>
                  <span>{submitting ? "POSTING..." : "POST REVIEW"}</span>
                </button>
              </div>
            </form>

            <div style={{ display: "grid", gap: 10 }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ padding: 12, borderRadius: 8, background: "#0a0c12", border: "1px solid var(--hairline)" }}>
                  <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "#fff", fontWeight: 700 }}>@{r.authorName} [{r.authorCountry}]</span>
                    <span style={{ color: "var(--volt)" }}>★ {r.rating}.0 (Play {r.gameplayScore} · Art {r.visualScore} · AI {r.aiScore})</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#cfd5e3", lineHeight: 1.5 }}>{r.comment}</p>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  No reviews yet — be the first to rate this cabinet!
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <AiToolsShelf compact />
        </div>

        <AdSenseSlot
          slotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GAME}
          onOpenSponsor={() => { window.location.href = "/"; }}
          label="GAME CABINET SPONSOR"
        />
      </main>

      {playing && (
        <ArcadeCabinetModal
          game={game}
          playerCountry="JP"
          onClose={() => setPlaying(false)}
          onPlayCounted={(_id, total) => setPlays(total)}
          onOpenSponsor={() => { window.location.href = "/"; }}
        />
      )}
    </div>
  );
}
