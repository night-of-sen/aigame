"use client";

import React, { useEffect, useRef, useState } from "react";

type ModuleType = "empty" | "solar" | "dock" | "turret";

export function KeplerRingGame({ onScore }: { onScore?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<{
    slots: ModuleType[];
    credits: number;
    energy: number;
    integrity: number;
    score: number;
    selectedBuild: "solar" | "dock" | "turret";
  }>({
    slots: ["solar", "dock", "turret", "empty", "empty", "empty", "empty", "empty"],
    credits: 120,
    energy: 30,
    integrity: 100,
    score: 0,
    selectedBuild: "dock"
  });

  const [hud, setHud] = useState({ credits: 120, energy: 30, integrity: 100, score: 0, selectedBuild: "dock" as "solar" | "dock" | "turret" });

  const costs = { solar: 40, dock: 60, turret: 80 };

  const selectBuild = (b: "solar" | "dock" | "turret") => {
    stateRef.current.selectedBuild = b;
    setHud((h) => ({ ...h, selectedBuild: b }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const CY = H / 2;
    const RING_R = 128;

    let raf = 0;
    let frame = 0;
    const meteors: Array<{ x: number; y: number; vx: number; vy: number; hp: number }> = [];
    const lasers: Array<{ x1: number; y1: number; x2: number; y2: number; life: number }> = [];

    const onPointerDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const py = ((e.clientY - r.top) / r.height) * H;
      const st = stateRef.current;

      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8 + frame * 0.004;
        const sx = CX + Math.cos(ang) * RING_R;
        const sy = CY + Math.sin(ang) * RING_R;
        if (Math.hypot(px - sx, py - sy) < 26) {
          const cost = costs[st.selectedBuild];
          if (st.credits >= cost && st.slots[i] !== st.selectedBuild) {
            st.credits -= cost;
            st.slots[i] = st.selectedBuild;
            st.score += 150;
          }
          break;
        }
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      frame++;
      const st = stateRef.current;

      const solars = st.slots.filter((s) => s === "solar").length;
      const docks = st.slots.filter((s) => s === "dock").length;
      const turrets = st.slots.filter((s) => s === "turret").length;

      // Resource ticks
      if (frame % 45 === 0) {
        st.energy = Math.min(200, st.energy + solars * 6);
        const income = docks * 14;
        st.credits += income;
        st.score += income * 3 + turrets * 10;
      }

      // Spawn rogue meteors
      if (frame % Math.max(38, 110 - Math.floor(st.score / 800) * 6) === 0) {
        const a = Math.random() * Math.PI * 2;
        const dist = 280;
        const speed = 1.15 + Math.random() * 0.6;
        meteors.push({
          x: CX + Math.cos(a) * dist,
          y: CY + Math.sin(a) * dist,
          vx: -Math.cos(a) * speed,
          vy: -Math.sin(a) * speed,
          hp: 2
        });
      }

      // Space backdrop
      ctx.fillStyle = "#06080d";
      ctx.fillRect(0, 0, W, H);

      // Planet core + orbital ring
      ctx.fillStyle = "#0f1729";
      ctx.strokeStyle = "rgba(0,240,212,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(CX, CY, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CX, CY, RING_R, 0, Math.PI * 2);
      ctx.stroke();

      // Autonomous AI cargo shuttles orbiting per Mining Dock
      for (let d = 0; d < docks * 2; d++) {
        const sa = frame * 0.032 + d * 1.1;
        const sr = RING_R + 24 + (d % 2) * 14;
        ctx.fillStyle = "#00F0D4";
        ctx.beginPath();
        ctx.arc(CX + Math.cos(sa) * sr, CY + Math.sin(sa) * sr, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw 8 Orbital Ring Slots + Turret auto-fire
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8 + frame * 0.004;
        const sx = CX + Math.cos(ang) * RING_R;
        const sy = CY + Math.sin(ang) * RING_R;
        const kind = st.slots[i];

        if (kind === "turret" && frame % 28 === i % 28 && meteors.length > 0 && st.energy >= 2) {
          const target = meteors[0];
          target.hp -= 1;
          st.energy -= 2;
          lasers.push({ x1: sx, y1: sy, x2: target.x, y2: target.y, life: 1 });
          if (target.hp <= 0) {
            meteors.shift();
            st.credits += 18;
            st.score += 180;
          }
        }

        ctx.fillStyle =
          kind === "solar"
            ? "rgba(243,255,0,0.22)"
            : kind === "dock"
              ? "rgba(0,240,212,0.22)"
              : kind === "turret"
                ? "rgba(255,42,60,0.28)"
                : "rgba(255,255,255,0.06)";
        ctx.strokeStyle =
          kind === "solar" ? "#F3FF00" : kind === "dock" ? "#00F0D4" : kind === "turret" ? "#FF2A3C" : "rgba(255,255,255,0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(kind === "empty" ? "+" : kind.slice(0, 3).toUpperCase(), sx, sy + 4);
      }

      // Meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        if (Math.hypot(m.x - CX, m.y - CY) < RING_R - 8) {
          meteors.splice(i, 1);
          st.integrity = Math.max(0, st.integrity - 15);
          if (st.integrity <= 0) {
            st.slots = ["solar", "dock", "turret", "empty", "empty", "empty", "empty", "empty"];
            st.credits = 120;
            st.energy = 30;
            st.integrity = 100;
            st.score = 0;
            meteors.length = 0;
            break;
          }
          continue;
        }
        ctx.fillStyle = "#FF9F1C";
        ctx.beginPath();
        ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Laser beams
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.life -= 0.1;
        if (l.life <= 0) {
          lasers.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(255,42,60,${l.life})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      }

      if (frame % 10 === 0) {
        setHud({
          credits: st.credits,
          energy: st.energy,
          integrity: st.integrity,
          score: st.score,
          selectedBuild: st.selectedBuild
        });
        onScore?.(st.score);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onScore]);

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <canvas ref={canvasRef} width={880} height={420} style={{ width: "100%", height: 420, display: "block", cursor: "pointer" }} />
      <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", background: "#090b10", borderTop: "1px solid var(--hairline)", fontSize: 12 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <span>CREDITS <strong style={{ color: "var(--volt)" }}>{hud.credits}</strong></span>
          <span>ENERGY <strong style={{ color: "var(--cyan)" }}>{hud.energy}</strong></span>
          <span>RING HP <strong style={{ color: hud.integrity < 40 ? "var(--vermilion)" : "#fff" }}>{hud.integrity}%</strong></span>
          <span>SCORE <strong>{hud.score.toLocaleString()}</strong></span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className={`country-btn ${hud.selectedBuild === "solar" ? "active" : ""}`} onClick={() => selectBuild("solar")}>SOLAR ($40)</button>
          <button type="button" className={`country-btn ${hud.selectedBuild === "dock" ? "active" : ""}`} onClick={() => selectBuild("dock")}>AI DOCK ($60)</button>
          <button type="button" className={`country-btn ${hud.selectedBuild === "turret" ? "active" : ""}`} onClick={() => selectBuild("turret")}>TURRET ($80)</button>
        </div>
      </div>
    </div>
  );
}
