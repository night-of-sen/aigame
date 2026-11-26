"use client";

import React, { useEffect, useRef, useState } from "react";

type UpgradeId = "wide_blade" | "overclock" | "heal_core";

export function MonolithBreakerGame({ onScore }: { onScore?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef({ w: false, a: false, s: false, d: false });
  const dashReqRef = useRef<{ active: boolean; tx?: number; ty?: number }>({ active: false });
  const upgradesRef = useRef({ bladeRadius: 62, dashCooldown: 24, maxHp: 5, hp: 5 });
  const pausedForDraftRef = useRef(false);

  const [hud, setHud] = useState({ floor: 1, hp: 5, maxHp: 5, score: 0, remaining: 5 });
  const [draftOpen, setDraftOpen] = useState(false);

  const applyUpgrade = (id: UpgradeId) => {
    if (id === "wide_blade") upgradesRef.current.bladeRadius += 20;
    if (id === "overclock") upgradesRef.current.dashCooldown = Math.max(10, upgradesRef.current.dashCooldown - 6);
    if (id === "heal_core") {
      upgradesRef.current.maxHp += 1;
      upgradesRef.current.hp = upgradesRef.current.maxHp;
    }
    pausedForDraftRef.current = false;
    setDraftOpen(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    let raf = 0;
    let frame = 0;

    const player = { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: 0, dashCd: 0, slashTimer: 0, invuln: 0 };
    let floor = 1;
    let score = 0;
    const enemies: Array<{ x: number; y: number; hp: number; speed: number; r: number }> = [];
    const slashes: Array<{ x: number; y: number; angle: number; r: number; life: number }> = [];

    const spawnFloor = (fl: number) => {
      enemies.length = 0;
      const count = 4 + fl * 2;
      for (let i = 0; i < count; i++) {
        const edge = i % 4;
        const x = edge === 0 ? 40 : edge === 1 ? W - 40 : 60 + Math.random() * (W - 120);
        const y = edge === 2 ? 40 : edge === 3 ? H - 40 : 60 + Math.random() * (H - 120);
        enemies.push({ x, y, hp: 1 + Math.floor(fl / 2), speed: 1.25 + fl * 0.16, r: 14 });
      }
    };
    spawnFloor(1);

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || e.key === "ArrowUp") keysRef.current.w = true;
      if (k === "s" || e.key === "ArrowDown") keysRef.current.s = true;
      if (k === "a" || e.key === "ArrowLeft") keysRef.current.a = true;
      if (k === "d" || e.key === "ArrowRight") keysRef.current.d = true;
      if (e.key === " ") {
        e.preventDefault();
        dashReqRef.current = { active: true };
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || e.key === "ArrowUp") keysRef.current.w = false;
      if (k === "s" || e.key === "ArrowDown") keysRef.current.s = false;
      if (k === "a" || e.key === "ArrowLeft") keysRef.current.a = false;
      if (k === "d" || e.key === "ArrowRight") keysRef.current.d = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      dashReqRef.current = {
        active: true,
        tx: ((e.clientX - r.left) / r.width) * W,
        ty: ((e.clientY - r.top) / r.height) * H
      };
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (pausedForDraftRef.current) return;
      frame++;

      const mx = (keysRef.current.d ? 1 : 0) - (keysRef.current.a ? 1 : 0);
      const my = (keysRef.current.s ? 1 : 0) - (keysRef.current.w ? 1 : 0);
      if (mx !== 0 || my !== 0) {
        player.angle = Math.atan2(my, mx);
        player.vx += mx * 0.9;
        player.vy += my * 0.9;
      }

      if (dashReqRef.current.active) {
        const req = dashReqRef.current;
        dashReqRef.current = { active: false };
        if (player.dashCd <= 0) {
          if (req.tx !== undefined && req.ty !== undefined) {
            player.angle = Math.atan2(req.ty - player.y, req.tx - player.x);
          }
          player.vx = Math.cos(player.angle) * 14;
          player.vy = Math.sin(player.angle) * 14;
          player.dashCd = upgradesRef.current.dashCooldown;
          player.slashTimer = 10;
          player.invuln = 14;
          slashes.push({ x: player.x, y: player.y, angle: player.angle, r: upgradesRef.current.bladeRadius, life: 1 });
        }
      }

      player.x = Math.max(20, Math.min(W - 20, player.x + player.vx));
      player.y = Math.max(20, Math.min(H - 20, player.y + player.vy));
      player.vx *= 0.82;
      player.vy *= 0.82;
      if (player.dashCd > 0) player.dashCd--;
      if (player.slashTimer > 0) player.slashTimer--;
      if (player.invuln > 0) player.invuln--;

      // Cathedral tiled floor
      ctx.fillStyle = "#080a0f";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(243,255,0,0.06)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 48) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        const ang = Math.atan2(player.y - en.y, player.x - en.x);
        en.x += Math.cos(ang) * en.speed;
        en.y += Math.sin(ang) * en.speed;

        const d = Math.hypot(en.x - player.x, en.y - player.y);
        if (player.slashTimer > 0 && d < upgradesRef.current.bladeRadius + en.r) {
          en.hp -= 1;
          en.x -= Math.cos(ang) * 28;
          en.y -= Math.sin(ang) * 28;
          if (en.hp <= 0) {
            enemies.splice(i, 1);
            score += 220 * floor;
            continue;
          }
        } else if (d < en.r + 12 && player.invuln === 0) {
          upgradesRef.current.hp -= 1;
          player.invuln = 45;
          if (upgradesRef.current.hp <= 0) {
            upgradesRef.current = { bladeRadius: 62, dashCooldown: 24, maxHp: 5, hp: 5 };
            floor = 1;
            score = 0;
            spawnFloor(1);
            break;
          }
        }

        ctx.fillStyle = "rgba(255,42,60,0.22)";
        ctx.strokeStyle = "#FF2A3C";
        ctx.lineWidth = 2;
        ctx.fillRect(en.x - en.r, en.y - en.r, en.r * 2, en.r * 2);
        ctx.strokeRect(en.x - en.r, en.y - en.r, en.r * 2, en.r * 2);
      }

      // Floor cleared -> trigger Roguelike Powerup Draft
      if (enemies.length === 0) {
        floor += 1;
        score += 800;
        spawnFloor(floor);
        pausedForDraftRef.current = true;
        setDraftOpen(true);
      }

      // Blade slash arcs
      for (let i = slashes.length - 1; i >= 0; i--) {
        const sl = slashes[i];
        sl.life -= 0.08;
        if (sl.life <= 0) {
          slashes.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(243,255,0,${sl.life})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(sl.x, sl.y, sl.r, sl.angle - 1.1, sl.angle + 1.1);
        ctx.stroke();
      }

      // Player cyber-blade hunter
      ctx.fillStyle = player.slashTimer > 0 ? "#00F0D4" : "#F3FF00";
      ctx.beginPath();
      ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
      ctx.fill();

      if (frame % 6 === 0) {
        setHud({
          floor,
          hp: upgradesRef.current.hp,
          maxHp: upgradesRef.current.maxHp,
          score,
          remaining: enemies.length
        });
        onScore?.(score);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onScore]);

  return (
    <div style={{ position: "relative", userSelect: "none", touchAction: "none" }}>
      <canvas ref={canvasRef} width={880} height={420} style={{ width: "100%", height: 420, display: "block", cursor: "crosshair" }} />

      {draftOpen && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,11,0.88)", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ maxWidth: 560, width: "100%", display: "grid", gap: 14, textAlign: "center" }}>
            <div className="font-mono" style={{ color: "var(--volt)", fontSize: 12 }}>FLOOR CLEARED // CHOOSE CYBER AUGMENT</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <button type="button" className="btn-steel" style={{ padding: 14, display: "grid", gap: 4 }} onClick={() => applyUpgrade("wide_blade")}>
                <strong style={{ color: "var(--volt)" }}>WIDE ARC BLADE</strong>
                <span className="font-mono" style={{ fontSize: 11 }}>+20px Slash Reach</span>
              </button>
              <button type="button" className="btn-steel" style={{ padding: 14, display: "grid", gap: 4 }} onClick={() => applyUpgrade("overclock")}>
                <strong style={{ color: "var(--cyan)" }}>OVERCLOCK DASH</strong>
                <span className="font-mono" style={{ fontSize: 11 }}>-25% Dash Cooldown</span>
              </button>
              <button type="button" className="btn-steel" style={{ padding: 14, display: "grid", gap: 4 }} onClick={() => applyUpgrade("heal_core")}>
                <strong style={{ color: "var(--vermilion)" }}>SHIELD CORE</strong>
                <span className="font-mono" style={{ fontSize: 11 }}>+1 Max HP &amp; Full Heal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: "#090b10", borderTop: "1px solid var(--hairline)", fontSize: 12 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <span>FLOOR <strong style={{ color: "var(--volt)" }}>B{hud.floor}</strong></span>
          <span>HP <strong style={{ color: "var(--vermilion)" }}>{hud.hp}/{hud.maxHp}</strong></span>
          <span>HOSTILES <strong style={{ color: "var(--cyan)" }}>{hud.remaining}</strong></span>
          <span>SCORE <strong>{hud.score.toLocaleString()}</strong></span>
        </div>
        <span style={{ color: "var(--ink-muted)" }}>CLICK / TAP ANYWHERE TO DASH-SLASH · WASD MOVE</span>
      </div>
    </div>
  );
}
