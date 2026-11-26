"use client";

import React, { useEffect, useRef, useState } from "react";
import type { GameRecord } from "@synthplay/db";
import { IconShield, IconSpark } from "./Icons";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [hp, setHp] = useState(3);
  const [visibleSec, setVisibleSec] = useState(0);
  const [counted, setCounted] = useState(false);

  // Anti-cheat visible-play heartbeat timer (10s in dev preview, 30s in prod)
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

  const [sdkScore, setSdkScore] = useState<number | null>(null);

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

  // Built-in 60fps HTML5 Arcade Action Canvas (when no custom user sandboxHtml or sandboxUrl is provided)
  useEffect(() => {
    if (game.sandboxHtml || game.sandboxUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const accent = game.accentColor || "#F3FF00";

    const player = { x: W / 2, y: H - 56, targetX: W / 2, targetY: H - 56 };
    const bullets: Array<{ x: number; y: number; vy: number }> = [];
    const enemies: Array<{ x: number; y: number; vx: number; vy: number; r: number; kind: "orb" | "drone" }> = [];
    const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];

    let localScore = 0;
    let localCombo = 1;
    let localHp = 3;
    let shake = 0;
    let frame = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      player.targetX = ((e.clientX - rect.left) / rect.width) * W;
      player.targetY = ((e.clientY - rect.top) / rect.height) * H;
    };

    const fire = () => {
      bullets.push({ x: player.x - 8, y: player.y - 12, vy: -11 });
      bullets.push({ x: player.x + 8, y: player.y - 12, vy: -11 });
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", fire);

    const spawnBurst = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const s = 1.8 + Math.random() * 4;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      frame++;

      // Smooth follow
      player.x += (player.targetX - player.x) * 0.22;
      player.y += (player.targetY - player.y) * 0.22;

      // Auto-fire cadence
      if (frame % 11 === 0) fire();

      // Spawn enemies & energy cores
      if (frame % 26 === 0) {
        const isOrb = Math.random() < 0.32;
        enemies.push({
          x: 40 + Math.random() * (W - 80),
          y: -18,
          vx: (Math.random() - 0.5) * 2.1,
          vy: isOrb ? 2.4 : 2.6 + Math.min(3.5, localScore / 3500),
          r: isOrb ? 10 : 14,
          kind: isOrb ? "orb" : "drone"
        });
      }

      ctx.save();
      if (shake > 0.2) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        shake *= 0.86;
      }

      // Motion-trail background
      ctx.fillStyle = "rgba(7, 8, 11, 0.34)";
      ctx.fillRect(0, 0, W, H);

      // Speed rails
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 64) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      const railY = (frame * 5) % 48;
      for (let gy = railY; gy < H; gy += 48) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // Update bullets
      ctx.fillStyle = accent;
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y += b.vy;
        if (b.y < -12) {
          bullets.splice(i, 1);
          continue;
        }
        ctx.fillRect(b.x - 1.5, b.y - 8, 3, 14);
      }

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        en.x += en.vx;
        en.y += en.vy;
        if (en.x < 18 || en.x > W - 18) en.vx *= -1;
        if (en.y > H + 24) {
          enemies.splice(i, 1);
          continue;
        }

        if (en.kind === "orb") {
          ctx.fillStyle = "#00F0D4";
          ctx.beginPath();
          ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = "#FF2A3C";
          ctx.lineWidth = 2;
          ctx.fillStyle = "rgba(255, 42, 60, 0.22)";
          ctx.beginPath();
          ctx.moveTo(en.x, en.y + en.r);
          ctx.lineTo(en.x - en.r, en.y - en.r * 0.7);
          ctx.lineTo(en.x + en.r, en.y - en.r * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Bullet hit
        if (en.kind === "drone") {
          let hit = false;
          for (let j = bullets.length - 1; j >= 0; j--) {
            if (Math.hypot(bullets[j].x - en.x, bullets[j].y - en.y) < en.r + 6) {
              bullets.splice(j, 1);
              hit = true;
              break;
            }
          }
          if (hit) {
            spawnBurst(en.x, en.y, "#FF2A3C", 14);
            enemies.splice(i, 1);
            localScore += 120 * localCombo;
            localCombo = Math.min(12, localCombo + 1);
            shake = 5;
            setScore(localScore);
            setCombo(localCombo);
            continue;
          }
        }

        // Player collision
        if (Math.hypot(player.x - en.x, player.y - en.y) < en.r + 13) {
          if (en.kind === "orb") {
            spawnBurst(en.x, en.y, "#00F0D4", 10);
            enemies.splice(i, 1);
            localScore += 250 * localCombo;
            setScore(localScore);
          } else {
            spawnBurst(player.x, player.y, "#F3FF00", 20);
            enemies.splice(i, 1);
            localHp -= 1;
            localCombo = 1;
            shake = 14;
            if (localHp <= 0) {
              localHp = 3;
              localScore = 0;
            }
            setHp(localHp);
            setCombo(localCombo);
            setScore(localScore);
          }
        }
      }

      // Draw Player Cyber Craft
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 16);
      ctx.lineTo(player.x - 14, player.y + 12);
      ctx.lineTo(player.x, player.y + 6);
      ctx.lineTo(player.x + 14, player.y + 12);
      ctx.closePath();
      ctx.fill();

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 0.035;
        if (pt.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 3, 3);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", fire);
    };
  }, [game.accentColor, game.sandboxHtml]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="cab-surface cab-chamfer"
        style={{ width: "100%", maxWidth: 960, padding: 20, border: "1px solid rgba(243,255,0,0.4)" }}
      >
        {/* Cabinet Top Telemetry Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <IconShield size={13} />
              <span>BG WEBGL SHADER SUSPENDED · 100% GPU DEDICATED TO GAME</span>
              <span style={{ color: counted ? "var(--volt)" : "var(--ink-muted)" }}>
                | HEARTBEAT: {visibleSec}s {counted ? "(VALID PLAY RECORDED)" : "(10s FOR RANK)"}
              </span>
              {sdkScore !== null && (
                <span style={{ color: "var(--volt)" }}>| SDK SCORE: {sdkScore.toLocaleString()}</span>
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
              style={{ width: "100%", height: 440, border: 0, display: "block", background: "#07080b" }}
            />
          ) : game.sandboxHtml ? (
            <iframe
              title={game.title}
              sandbox="allow-scripts allow-pointer-lock"
              srcDoc={game.sandboxHtml}
              style={{ width: "100%", height: 440, border: 0, display: "block", background: "#07080b" }}
            />
          ) : (
            <>
              <canvas
                ref={canvasRef}
                width={880}
                height={420}
                style={{ width: "100%", height: 400, display: "block", cursor: "crosshair" }}
              />
              <div
                className="font-mono"
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  display: "flex",
                  gap: 16,
                  padding: "6px 12px",
                  background: "rgba(7,8,11,0.82)",
                  border: "1px solid var(--hairline)",
                  fontSize: 12
                }}
              >
                <span>SCORE <strong style={{ color: "var(--volt)" }}>{score.toLocaleString()}</strong></span>
                <span>COMBO <strong style={{ color: "var(--cyan)" }}>x{combo}</strong></span>
                <span>SHIELD <strong style={{ color: "var(--vermilion)" }}>{"|".repeat(hp)}</strong></span>
                <span style={{ color: "var(--ink-muted)" }}>MOVE MOUSE · CLICK BOOST</span>
              </div>
            </>
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
