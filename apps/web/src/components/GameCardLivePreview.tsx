"use client";

import React, { useEffect, useRef, useState } from "react";

interface GameCardLivePreviewProps {
  category: string;
  accentColor: string;
  active: boolean;
  paused: boolean;
}

/**
 * Renders a hyper-kinetic, 60fps real-time simulated gameplay video reel
 * tailored to each game's genre when the user hovers over a game card.
 */
export function GameCardLivePreview({
  category,
  accentColor,
  active,
  paused
}: GameCardLivePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active || paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    let raf = 0;
    const start = performance.now();

    // Seed particles per mode
    const rain = Array.from({ length: 48 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      l: 10 + Math.random() * 18,
      s: 4 + Math.random() * 5
    }));

    const shards = Array.from({ length: 24 }, (_, i) => ({
      a: (Math.PI * 2 * i) / 24,
      r: 12 + Math.random() * 55,
      s: 2 + Math.random() * 4
    }));

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = (now - start) / 1000;
      setProgress(((t * 18) % 100));

      ctx.fillStyle = "rgba(6, 8, 12, 0.32)";
      ctx.fillRect(0, 0, W, H);

      const cat = category.toUpperCase();

      if (cat.includes("RACING")) {
        // Neo-Tokyo rainy highway drift cam
        const horizon = H * 0.44;
        const curve = Math.sin(t * 1.8) * 65;
        ctx.fillStyle = "#080b12";
        ctx.fillRect(0, 0, W, horizon);

        // City skyline glow
        for (let i = 0; i < 14; i++) {
          const bx = ((i * 34 - t * 22) % (W + 40) + W + 40) % (W + 40) - 20;
          const bh = 22 + ((i * 19) % 44);
          ctx.fillStyle = i % 3 === 0 ? "rgba(243,255,0,0.28)" : i % 2 === 0 ? "rgba(0,240,212,0.22)" : "rgba(255,42,60,0.22)";
          ctx.fillRect(bx, horizon - bh, 18, bh);
        }

        // Perspective asphalt rails
        ctx.strokeStyle = "rgba(0, 240, 212, 0.5)";
        ctx.lineWidth = 1.5;
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(W * 0.5 + curve + i * 14, horizon);
          ctx.lineTo(W * 0.5 + i * 115, H);
          ctx.stroke();
        }

        // Speed strips
        for (let i = 0; i < 9; i++) {
          const p = Math.pow(((t * 2.2 + i / 9) % 1), 2.1);
          const y = horizon + p * (H - horizon);
          ctx.strokeStyle = `rgba(243, 255, 0, ${0.15 + p * 0.7})`;
          ctx.beginPath();
          ctx.moveTo(W * 0.5 + curve * (1 - p) - p * 180, y);
          ctx.lineTo(W * 0.5 + curve * (1 - p) + p * 180, y);
          ctx.stroke();
        }

        // Drifting car & crimson tail-light ribbons
        const carX = W * 0.5 + Math.sin(t * 2.4) * 48;
        const carY = H * 0.78;
        ctx.strokeStyle = "#FF2A3C";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(carX - 24, carY + 6);
        ctx.quadraticCurveTo(carX - 55, H * 0.9, carX - 85, H);
        ctx.moveTo(carX + 24, carY + 6);
        ctx.quadraticCurveTo(carX - 5, H * 0.9, carX - 35, H);
        ctx.stroke();

        ctx.fillStyle = "#111520";
        ctx.strokeStyle = "#F3FF00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(carX - 28, carY + 8);
        ctx.lineTo(carX - 20, carY - 12);
        ctx.lineTo(carX + 20, carY - 12);
        ctx.lineTo(carX + 28, carY + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Speedometer HUD
        ctx.fillStyle = "#F3FF00";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`${Math.round(268 + Math.sin(t * 6) * 24)} KM/H // DRIFT x4`, 12, H - 18);
      } else if (cat.includes("SHMUP") || cat.includes("ARCADE")) {
        // Vertical Cave-style Bullet Hell spiral reel
        const cx = W * 0.5 + Math.sin(t * 1.4) * 55;
        const cy = H * 0.3;
        for (let arm = 0; arm < 8; arm++) {
          for (let k = 0; k < 7; k++) {
            const r = ((t * 95 + k * 28) % 210);
            const ang = arm * (Math.PI / 4) + t * 2.1 + r * 0.025;
            const bx = cx + Math.cos(ang) * r;
            const by = cy + Math.sin(ang) * r;
            ctx.fillStyle = arm % 2 === 0 ? "#F3FF00" : "#00F0D4";
            ctx.beginPath();
            ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Starfighter weaving below
        const px = W * 0.5 + Math.cos(t * 3.1) * 75;
        const py = H * 0.78 + Math.sin(t * 4.2) * 12;
        ctx.fillStyle = "#FF2A3C";
        ctx.fillRect(px - 2, 0, 4, py - 10);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(px, py - 14);
        ctx.lineTo(px - 12, py + 10);
        ctx.lineTo(px + 12, py + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#00F0D4";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`GRAZE CHAIN ${Math.floor(t * 38) + 120} // BOSS 42%`, 12, H - 18);
      } else if (cat.includes("NOIR")) {
        // Rainy cyberpunk alley + live AI interrogation waveform
        ctx.strokeStyle = "rgba(0, 240, 212, 0.55)";
        ctx.lineWidth = 1.2;
        rain.forEach((d) => {
          d.y += d.s;
          d.x -= 0.8;
          if (d.y > H) { d.y = -12; d.x = Math.random() * W; }
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - 3, d.y + d.l);
          ctx.stroke();
        });
        // Holographic suspect voice equalizer
        ctx.strokeStyle = "#00F0D4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 20; x < W - 20; x += 6) {
          const amp = Math.sin(x * 0.08 + t * 9) * Math.sin(t * 3 + x * 0.02) * 24;
          const y = H * 0.52 + amp;
          x === 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = "#F3FF00";
        ctx.font = "bold 11px monospace";
        ctx.fillText("AI SUSPECT PULSE: DECEPTION DETECTED 89%", 12, H - 18);
      } else if (cat.includes("TACTICS")) {
        // Isometric mech lock-on & railgun strike
        ctx.strokeStyle = "rgba(243, 255, 0, 0.22)";
        ctx.lineWidth = 1;
        for (let r = -3; r <= 3; r++) {
          ctx.beginPath();
          ctx.moveTo(W * 0.5 + r * 38, H * 0.25);
          ctx.lineTo(W * 0.5 + r * 72, H * 0.9);
          ctx.stroke();
        }
        const tx = W * 0.68 + Math.sin(t * 2) * 22;
        const ty = H * 0.48 + Math.cos(t * 2) * 14;
        // Railgun beam pulse
        const beamAlpha = Math.max(0, Math.sin(t * 7));
        if (beamAlpha > 0.2) {
          ctx.strokeStyle = `rgba(243, 255, 0, ${beamAlpha})`;
          ctx.lineWidth = 5 * beamAlpha;
          ctx.beginPath();
          ctx.moveTo(64, H * 0.72);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
        // Target reticle
        ctx.strokeStyle = "#FF2A3C";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tx, ty, 18 + Math.sin(t * 8) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#F3FF00";
        ctx.font = "bold 11px monospace";
        ctx.fillText("UNIT-04 RAILGUN LOCK // CRIT -480", 12, H - 18);
      } else if (cat.includes("ROGUELIKE")) {
        // Laser blade slash arcs + shattering monolith shards
        const cx = W * 0.5, cy = H * 0.5;
        const slash = (t * 2.8) % 1;
        ctx.strokeStyle = "#F3FF00";
        ctx.lineWidth = 6 * (1 - slash);
        ctx.beginPath();
        ctx.arc(cx, cy, 42 + slash * 35, -1.2 + slash * 2, 1.1 + slash * 2);
        ctx.stroke();

        shards.forEach((s) => {
          const dist = ((s.r + t * 55) % 110);
          const x = cx + Math.cos(s.a + t * 0.6) * dist;
          const y = cy + Math.sin(s.a + t * 0.6) * dist * 0.65;
          ctx.fillStyle = dist > 75 ? "#FF2A3C" : "#00F0D4";
          ctx.fillRect(x, y, s.s, s.s);
        });
        ctx.fillStyle = "#F3FF00";
        ctx.font = "bold 11px monospace";
        ctx.fillText("FLOOR 09 // OVERDRIVE SLASH COMBO x14", 12, H - 18);
      } else {
        // Orbital strategy station ring + shuttles
        const cx = W * 0.5, cy = H * 0.5;
        ctx.strokeStyle = "rgba(0, 240, 212, 0.5)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 115, 42, -0.22, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = t * 1.6 + (i * Math.PI) / 3;
          const sx = cx + Math.cos(a) * 115;
          const sy = cy + Math.sin(a) * 42;
          ctx.fillStyle = i % 2 === 0 ? "#F3FF00" : "#00F0D4";
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#00F0D4";
        ctx.font = "bold 11px monospace";
        ctx.fillText("ORBITAL RING-07 // SHUTTLE FLUX +94%", 12, H - 18);
      }

      // Subtle CRT scanline across preview
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, paused, category, accentColor]);

  return (
    <div className={`card-live-video ${active ? "is-active" : ""}`}>
      <canvas ref={canvasRef} width={380} height={214} className="card-live-canvas" />
      <div className="card-rec-hud font-mono">
        <span className="rec-dot" />
        <span>LIVE PREVIEW · 60FPS</span>
      </div>
      <div className="card-video-scrubber">
        <div className="card-video-scrubber-fill" style={{ width: `${progress}%`, background: accentColor }} />
      </div>
    </div>
  );
}
