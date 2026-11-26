"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
  onScore?: (score: number) => void;
}

export function WanganDriftGame({ onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef({ left: false, right: false, nitro: false });
  const [hud, setHud] = useState({ speed: 180, score: 0, nitro: 100, drift: 0, best: 0, crashed: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    let raf = 0;
    let frame = 0;

    let playerX = 0; // -1..1 across road
    let steerVel = 0;
    let speed = 180; // km/h
    let nitro = 100;
    let score = 0;
    let best = 0;
    let roadCurve = 0;
    let targetCurve = 0;
    let shake = 0;
    let invuln = 0;

    const rivals: Array<{ z: number; lane: number; speed: number; color: string; ghost?: boolean }> = [];
    const pads: Array<{ z: number; lane: number }> = [];
    const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = true;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        inputRef.current.nitro = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = false;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputRef.current.nitro = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const spawnSparks = (x: number, y: number, color: string, n = 6) => {
      for (let i = 0; i < n; i++) {
        sparks.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 4 - 1,
          life: 1,
          color
        });
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      frame++;

      // Dynamic Neo-Tokyo expressway curves
      if (frame % 160 === 0) {
        targetCurve = (Math.random() - 0.5) * 1.9;
      }
      roadCurve += (targetCurve - roadCurve) * 0.015;

      // Steering & drift physics
      const steerInput = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
      steerVel += steerInput * 0.011;
      steerVel *= 0.84;
      playerX += steerVel - roadCurve * (speed / 280) * 0.008;
      playerX = Math.max(-1.05, Math.min(1.05, playerX));

      const drifting = Math.abs(steerVel) > 0.022 && speed > 170;
      const boosting = inputRef.current.nitro && nitro > 4;

      if (boosting) {
        speed += (340 - speed) * 0.06;
        nitro = Math.max(0, nitro - 0.85);
      } else {
        speed += (215 - speed) * 0.025;
        nitro = Math.min(100, nitro + (drifting ? 0.55 : 0.14));
      }

      if (invuln > 0) invuln--;
      const distStep = speed * 0.00018;
      score += Math.round((speed / 28) * (drifting ? 2.2 : 1) * (boosting ? 1.8 : 1));
      if (score > best) best = score;

      // Spawn rival cars & volt boost pads
      if (frame % 44 === 0) {
        const isGhost = Math.random() < 0.28;
        rivals.push({
          z: 1,
          lane: [-0.66, 0, 0.66][Math.floor(Math.random() * 3)],
          speed: isGhost ? 150 : 110 + Math.random() * 45,
          color: isGhost ? "#00F0D4" : "#FF2A3C",
          ghost: isGhost
        });
      }
      if (frame % 95 === 0) {
        pads.push({ z: 1, lane: [-0.66, 0, 0.66][Math.floor(Math.random() * 3)] });
      }

      ctx.save();
      if (shake > 0.3) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        shake *= 0.85;
      }

      // Sky + Neo-Tokyo skyline
      const horizonY = H * 0.42;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, "#050609");
      skyGrad.addColorStop(1, "#121626");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizonY);

      // Skyline towers
      ctx.fillStyle = "#0b0e18";
      for (let i = 0; i < 18; i++) {
        const bx = ((i * 68 - roadCurve * 55) % (W + 120)) - 60;
        const bh = 28 + ((i * 37) % 72);
        ctx.fillRect(bx, horizonY - bh, 42, bh);
        ctx.fillStyle = i % 3 === 0 ? "rgba(243,255,0,0.45)" : "rgba(0,240,212,0.35)";
        ctx.fillRect(bx + 6, horizonY - bh + 8, 8, 4);
        ctx.fillRect(bx + 22, horizonY - bh + 18, 10, 4);
        ctx.fillStyle = "#0b0e18";
      }

      // Wet asphalt ground
      ctx.fillStyle = "#07090e";
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // Pseudo-3D perspective road strips
      const strips = 44;
      for (let i = strips; i >= 1; i--) {
        const z1 = i / strips;
        const z2 = (i - 1) / strips;
        const y1 = horizonY + Math.pow(1 - z1, 2.15) * (H - horizonY);
        const y2 = horizonY + Math.pow(1 - z2, 2.15) * (H - horizonY);
        const cx1 = W / 2 + roadCurve * z1 * z1 * 210 - playerX * (1 - z1) * 140;
        const cx2 = W / 2 + roadCurve * z2 * z2 * 210 - playerX * (1 - z2) * 140;
        const rw1 = 36 + (1 - z1) * 320;
        const rw2 = 36 + (1 - z2) * 320;

        const stripe = Math.floor(z1 * 18 + frame * distStep * 14) % 2 === 0;

        // Road deck
        ctx.fillStyle = stripe ? "#121520" : "#0e111a";
        ctx.beginPath();
        ctx.moveTo(cx1 - rw1, y1);
        ctx.lineTo(cx1 + rw1, y1);
        ctx.lineTo(cx2 + rw2, y2);
        ctx.lineTo(cx2 - rw2, y2);
        ctx.closePath();
        ctx.fill();

        // Neon guardrails
        ctx.strokeStyle = stripe ? "#F3FF00" : "#FF2A3C";
        ctx.lineWidth = Math.max(1.5, (1 - z1) * 5);
        ctx.beginPath();
        ctx.moveTo(cx1 - rw1, y1);
        ctx.lineTo(cx2 - rw2, y2);
        ctx.moveTo(cx1 + rw1, y1);
        ctx.lineTo(cx2 + rw2, y2);
        ctx.stroke();

        // Center lane dashes
        if (stripe) {
          ctx.strokeStyle = "rgba(0,240,212,0.45)";
          ctx.lineWidth = Math.max(1, (1 - z1) * 3);
          ctx.beginPath();
          ctx.moveTo(cx1 - rw1 * 0.33, y1);
          ctx.lineTo(cx2 - rw2 * 0.33, y2);
          ctx.moveTo(cx1 + rw1 * 0.33, y1);
          ctx.lineTo(cx2 + rw2 * 0.33, y2);
          ctx.stroke();
        }
      }

      const project = (z: number, lane: number) => {
        const y = horizonY + Math.pow(1 - z, 2.15) * (H - horizonY);
        const cx = W / 2 + roadCurve * z * z * 210 - playerX * (1 - z) * 140;
        const rw = 36 + (1 - z) * 320;
        return { x: cx + lane * rw * 0.72, y, scale: Math.max(0.14, 1 - z) };
      };

      // Update & draw volt boost pads
      for (let i = pads.length - 1; i >= 0; i--) {
        const p = pads[i];
        p.z -= distStep * 1.15;
        if (p.z <= 0.04) {
          if (Math.abs(p.lane - playerX) < 0.34) {
            nitro = Math.min(100, nitro + 35);
            speed = Math.min(350, speed + 45);
            score += 400;
            spawnSparks(W / 2, H - 56, "#F3FF00", 14);
          }
          pads.splice(i, 1);
          continue;
        }
        const pr = project(p.z, p.lane);
        ctx.fillStyle = "rgba(243,255,0,0.75)";
        ctx.fillRect(pr.x - 26 * pr.scale, pr.y - 4 * pr.scale, 52 * pr.scale, 10 * pr.scale);
      }

      // Update & draw rival traffic / AI ghost cars
      for (let i = rivals.length - 1; i >= 0; i--) {
        const r = rivals[i];
        const rel = Math.max(0.004, (speed - r.speed) * 0.00018);
        r.z -= rel;
        if (r.z <= 0.06) {
          if (Math.abs(r.lane - playerX) < 0.31 && invuln === 0) {
            shake = 16;
            speed = 115;
            invuln = 55;
            score = Math.max(0, score - 500);
            spawnSparks(W / 2, H - 62, "#FF2A3C", 18);
          } else if (r.z <= 0.02) {
            // Near-miss overtake bonus!
            score += r.ghost ? 600 : 250;
            rivals.splice(i, 1);
            continue;
          }
        }
        if (r.z <= 0.01) {
          rivals.splice(i, 1);
          continue;
        }
        const pr = project(r.z, r.lane);
        const cw = 64 * pr.scale;
        const ch = 34 * pr.scale;
        ctx.fillStyle = r.ghost ? "rgba(0,240,212,0.22)" : "#191c28";
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.fillRect(pr.x - cw / 2, pr.y - ch, cw, ch);
        ctx.strokeRect(pr.x - cw / 2, pr.y - ch, cw, ch);
        // Tail lights
        ctx.fillStyle = r.color;
        ctx.fillRect(pr.x - cw * 0.4, pr.y - ch * 0.4, cw * 0.24, ch * 0.22);
        ctx.fillRect(pr.x + cw * 0.16, pr.y - ch * 0.4, cw * 0.24, ch * 0.22);
      }

      // Player Cyber GT Car
      const carX = W / 2 + steerVel * 220;
      const carY = H - 56;
      const tilt = steerVel * 3.8;
      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(tilt);
      if (invuln % 6 < 4) {
        // Under-glow
        ctx.fillStyle = boosting ? "rgba(0,240,212,0.35)" : "rgba(243,255,0,0.22)";
        ctx.fillRect(-44, 10, 88, 14);
        // Chassis
        ctx.fillStyle = "#0d1018";
        ctx.strokeStyle = boosting ? "#00F0D4" : "#F3FF00";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-36, 12);
        ctx.lineTo(-28, -18);
        ctx.lineTo(28, -18);
        ctx.lineTo(36, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Rear spoiler + twin crimson tail light bar
        ctx.fillStyle = "#FF2A3C";
        ctx.fillRect(-30, -4, 60, 5);
        // Nitro exhaust flames
        if (boosting) {
          ctx.fillStyle = "#00F0D4";
          ctx.fillRect(-20, 12, 10, 14 + Math.random() * 14);
          ctx.fillRect(10, 12, 10, 14 + Math.random() * 14);
        }
      }
      ctx.restore();

      if (drifting && frame % 2 === 0) {
        spawnSparks(carX + (steerVel > 0 ? -30 : 30), carY + 12, "#F3FF00", 2);
      }

      // Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.05;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, 3, 3);
      }
      ctx.globalAlpha = 1;

      // Wet rain streaks
      ctx.strokeStyle = "rgba(180,220,255,0.14)";
      ctx.lineWidth = 1;
      for (let r = 0; r < 22; r++) {
        const rx = ((r * 73 + frame * 7) % W);
        const ry = ((r * 41 + frame * 17) % H);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 4, ry + 16);
        ctx.stroke();
      }

      ctx.restore();

      if (frame % 6 === 0) {
        setHud({ speed: Math.round(speed), score, nitro: Math.round(nitro), drift: drifting ? 1 : 0, best, crashed: invuln > 35 });
        onScore?.(score);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onScore]);

  const bindHold = (key: "left" | "right" | "nitro") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current[key] = true;
    },
    onPointerUp: () => {
      inputRef.current[key] = false;
    },
    onPointerLeave: () => {
      inputRef.current[key] = false;
    },
    onPointerCancel: () => {
      inputRef.current[key] = false;
    }
  });

  return (
    <div style={{ position: "relative", userSelect: "none", touchAction: "none" }}>
      <canvas ref={canvasRef} width={880} height={420} style={{ width: "100%", height: 420, display: "block", background: "#050608" }} />

      {/* Top HUD */}
      <div
        className="font-mono"
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 10,
          pointerEvents: "none"
        }}
      >
        <div style={{ display: "flex", gap: 14, padding: "6px 12px", background: "rgba(7,8,11,0.82)", border: "1px solid rgba(243,255,0,0.35)", fontSize: 12 }}>
          <span>SPEED <strong style={{ color: "var(--volt)" }}>{hud.speed} KM/H</strong></span>
          <span>SCORE <strong style={{ color: "#fff" }}>{hud.score.toLocaleString()}</strong></span>
          <span>NITRO <strong style={{ color: "var(--cyan)" }}>{hud.nitro}%</strong></span>
          {hud.drift === 1 && <span style={{ color: "var(--volt)", fontWeight: 700 }}>DRIFT x2.2!</span>}
          {hud.crashed && <span style={{ color: "var(--vermilion)", fontWeight: 700 }}>IMPACT!</span>}
        </div>
        <div style={{ padding: "6px 10px", background: "rgba(7,8,11,0.8)", border: "1px solid var(--hairline)", fontSize: 11, color: "var(--ink-muted)" }}>
          A/D OR ←/→ STEER · SPACE NITRO
        </div>
      </div>

      {/* Mobile / Touch Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", background: "#090b10", borderTop: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-steel font-mono" style={{ padding: "10px 22px", fontSize: 13 }} {...bindHold("left")}>◀ DRIFT L</button>
          <button type="button" className="btn-steel font-mono" style={{ padding: "10px 22px", fontSize: 13 }} {...bindHold("right")}>DRIFT R ▶</button>
        </div>
        <button type="button" className="btn-volt font-mono" style={{ padding: "10px 24px", fontSize: 13 }} {...bindHold("nitro")}>⚡ HOLD NITRO</button>
      </div>
    </div>
  );
}
