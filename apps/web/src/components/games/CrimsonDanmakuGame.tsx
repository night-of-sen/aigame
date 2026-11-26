"use client";

import React, { useEffect, useRef, useState } from "react";

export function CrimsonDanmakuGame({ onScore }: { onScore?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bombTriggerRef = useRef(false);
  const [hud, setHud] = useState({ score: 0, graze: 0, phase: 1, bossHp: 100, bombs: 2, lives: 3 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    let raf = 0;
    let frame = 0;

    const player = { x: W / 2, y: H - 64, tx: W / 2, ty: H - 64, invuln: 0 };
    const boss = { x: W / 2, y: 86, hp: 160, maxHp: 160, phase: 1 };
    const pBullets: Array<{ x: number; y: number; vx: number; vy: number }> = [];
    const eBullets: Array<{ x: number; y: number; vx: number; vy: number; color: string; grazed: boolean }> = [];
    const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];

    let score = 0;
    let graze = 0;
    let bombs = 2;
    let lives = 3;
    let bombFlash = 0;

    const setPointer = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      player.tx = Math.max(18, Math.min(W - 18, ((clientX - r.left) / r.width) * W));
      player.ty = Math.max(110, Math.min(H - 18, ((clientY - r.top) / r.height) * H));
    };

    const onPointerMove = (e: PointerEvent) => setPointer(e.clientX, e.clientY);
    const onPointerDown = (e: PointerEvent) => setPointer(e.clientX, e.clientY);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" || e.key === "B" || e.key === " ") {
        e.preventDefault();
        bombTriggerRef.current = true;
      }
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    const burst = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const s = 1.5 + Math.random() * 4;
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      frame++;

      player.x += (player.tx - player.x) * 0.28;
      player.y += (player.ty - player.y) * 0.28;
      if (player.invuln > 0) player.invuln--;

      // Boss figure-eight sway
      boss.x = W / 2 + Math.sin(frame * 0.022) * (W * 0.28);
      boss.y = 82 + Math.sin(frame * 0.044) * 18;

      // Hyper-Bomb trigger
      if (bombTriggerRef.current) {
        bombTriggerRef.current = false;
        if (bombs > 0) {
          bombs--;
          bombFlash = 24;
          score += eBullets.length * 40;
          eBullets.length = 0;
          boss.hp = Math.max(1, boss.hp - 25);
          burst(boss.x, boss.y, "#00F0D4", 26);
        }
      }

      // Player auto-spread fire
      if (frame % 5 === 0) {
        pBullets.push({ x: player.x - 9, y: player.y - 12, vx: -0.6, vy: -11.5 });
        pBullets.push({ x: player.x, y: player.y - 16, vx: 0, vy: -12 });
        pBullets.push({ x: player.x + 9, y: player.y - 12, vx: 0.6, vy: -11.5 });
      }

      // Procedural geometric danmaku patterns escalating with Boss phase
      if (frame % Math.max(10, 22 - boss.phase * 2) === 0) {
        const arms = 8 + boss.phase * 3;
        const spin = frame * 0.08;
        for (let k = 0; k < arms; k++) {
          const ang = spin + (Math.PI * 2 * k) / arms;
          const spd = 2.4 + boss.phase * 0.28;
          eBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: k % 2 === 0 ? "#FF2A3C" : "#F3FF00",
            grazed: false
          });
        }
      }
      // Aimed fan burst
      if (frame % 70 === 0) {
        const base = Math.atan2(player.y - boss.y, player.x - boss.x);
        for (let s = -2; s <= 2; s++) {
          const ang = base + s * 0.16;
          eBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(ang) * 3.8,
            vy: Math.sin(ang) * 3.8,
            color: "#00F0D4",
            grazed: false
          });
        }
      }

      // Background
      ctx.fillStyle = bombFlash > 0 ? "rgba(0,240,212,0.18)" : "rgba(6,7,11,0.34)";
      ctx.fillRect(0, 0, W, H);
      if (bombFlash > 0) bombFlash--;

      // Grid lines
      ctx.strokeStyle = "rgba(255,42,60,0.08)";
      ctx.lineWidth = 1;
      const offset = (frame * 3) % 44;
      for (let gy = offset; gy < H; gy += 44) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // Update player bullets
      ctx.fillStyle = "#00F0D4";
      for (let i = pBullets.length - 1; i >= 0; i--) {
        const b = pBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.y < -10) {
          pBullets.splice(i, 1);
          continue;
        }
        if (Math.hypot(b.x - boss.x, b.y - boss.y) < 34) {
          pBullets.splice(i, 1);
          boss.hp -= 1;
          score += 25;
          if (boss.hp <= 0) {
            boss.phase += 1;
            boss.maxHp = 160 + boss.phase * 70;
            boss.hp = boss.maxHp;
            score += 3000 * boss.phase;
            bombs = Math.min(4, bombs + 1);
            eBullets.length = 0;
            burst(boss.x, boss.y, "#F3FF00", 30);
          }
          continue;
        }
        ctx.fillRect(b.x - 1.5, b.y - 6, 3, 12);
      }

      // Update enemy danmaku bullets + Graze detection
      for (let i = eBullets.length - 1; i >= 0; i--) {
        const eb = eBullets[i];
        eb.x += eb.vx;
        eb.y += eb.vy;
        if (eb.x < -12 || eb.x > W + 12 || eb.y < -12 || eb.y > H + 12) {
          eBullets.splice(i, 1);
          continue;
        }

        const d = Math.hypot(eb.x - player.x, eb.y - player.y);
        if (!eb.grazed && d < 26 && d > 6) {
          eb.grazed = true;
          graze++;
          score += 120;
          burst(player.x, player.y, "#F3FF00", 3);
        } else if (d < 6 && player.invuln === 0) {
          eBullets.splice(i, 1);
          lives--;
          player.invuln = 80;
          burst(player.x, player.y, "#FF2A3C", 20);
          if (lives <= 0) {
            lives = 3;
            bombs = 2;
            score = 0;
            graze = 0;
            boss.phase = 1;
            boss.maxHp = 160;
            boss.hp = 160;
            eBullets.length = 0;
          }
          continue;
        }

        ctx.fillStyle = eb.color;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Crimson Boss Core
      ctx.strokeStyle = "#FF2A3C";
      ctx.lineWidth = 2.5;
      ctx.fillStyle = "rgba(255,42,60,0.22)";
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = frame * 0.03 + (Math.PI * 2 * s) / 6;
        const rx = boss.x + Math.cos(a) * 32;
        const ry = boss.y + Math.sin(a) * 24;
        if (s === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Boss HP bar
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(W / 2 - 140, 14, 280, 7);
      ctx.fillStyle = "#FF2A3C";
      ctx.fillRect(W / 2 - 140, 14, 280 * Math.max(0, boss.hp / boss.maxHp), 7);

      // Draw Player Ship + tiny cyan hitbox core
      if (player.invuln % 6 < 4) {
        ctx.fillStyle = "rgba(243,255,0,0.85)";
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 16);
        ctx.lineTo(player.x - 14, player.y + 12);
        ctx.lineTo(player.x + 14, player.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#00F0D4";
        ctx.beginPath();
        ctx.arc(player.x, player.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.04;
        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = sp.life;
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x, sp.y, 3, 3);
      }
      ctx.globalAlpha = 1;

      if (frame % 6 === 0) {
        setHud({
          score,
          graze,
          phase: boss.phase,
          bossHp: Math.round((boss.hp / boss.maxHp) * 100),
          bombs,
          lives
        });
        onScore?.(score);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onScore]);

  return (
    <div style={{ position: "relative", userSelect: "none", touchAction: "none" }}>
      <canvas ref={canvasRef} width={880} height={420} style={{ width: "100%", height: 420, display: "block", cursor: "none" }} />
      <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", background: "#090b10", borderTop: "1px solid var(--hairline)", fontSize: 12 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <span>PHASE <strong style={{ color: "var(--vermilion)" }}>{hud.phase}</strong> ({hud.bossHp}%)</span>
          <span>GRAZE <strong style={{ color: "var(--volt)" }}>{hud.graze}</strong></span>
          <span>SCORE <strong>{hud.score.toLocaleString()}</strong></span>
          <span>LIVES <strong style={{ color: "var(--cyan)" }}>{"♦".repeat(hud.lives)}</strong></span>
        </div>
        <button
          type="button"
          className="btn-crimson font-mono"
          style={{ padding: "8px 16px", fontSize: 12 }}
          onClick={() => {
            bombTriggerRef.current = true;
          }}
        >
          HYPER BOMB ({hud.bombs}) [SPACE]
        </button>
      </div>
    </div>
  );
}
