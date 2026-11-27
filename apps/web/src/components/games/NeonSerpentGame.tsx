"use client";

import React, { useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface Orb {
  x: number;
  y: number;
  kind: "volt" | "overdrive" | "phase";
  ttl: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const COLS = 28;
const ROWS = 18;
const CELL = 24;
const W = COLS * CELL;
const H = ROWS * CELL;

export function NeonSerpentGame({ onScore }: { onScore?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirRef = useRef<Point>({ x: 1, y: 0 });
  const boostRef = useRef(false);
  const touchStartRef = useRef<Point | null>(null);
  const [hud, setHud] = useState({ score: 0, best: 0, combo: 1, phaseMs: 0, dead: false });
  const [runId, setRunId] = useState(0);

  const setDirection = (nx: number, ny: number) => {
    const cur = dirRef.current;
    if (cur.x + nx === 0 && cur.y + ny === 0) return;
    nextDirRef.current = { x: nx, y: ny };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const snake: Point[] = [
      { x: 10, y: 9 },
      { x: 9, y: 9 },
      { x: 8, y: 9 },
      { x: 7, y: 9 }
    ];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    boostRef.current = false;

    const sparks: Spark[] = [];
    let score = 0;
    let best = 0;
    let combo = 1;
    let lastEatAt = 0;
    let phaseUntil = 0;
    let dead = false;
    let stepAccum = 0;
    let lastTs = performance.now();

    const spawnOrb = (kind: Orb["kind"]): Orb => {
      for (let tries = 0; tries < 80; tries++) {
        const x = 1 + Math.floor(Math.random() * (COLS - 2));
        const y = 1 + Math.floor(Math.random() * (ROWS - 2));
        if (!snake.some((s) => s.x === x && s.y === y)) {
          return { x, y, kind, ttl: kind === "volt" ? 999999 : 9000 };
        }
      }
      return { x: 14, y: 9, kind, ttl: 999999 };
    };

    const orbs: Orb[] = [spawnOrb("volt"), spawnOrb("volt")];

    const burst = (gx: number, gy: number, color: string, count = 14) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const sp = 1.2 + Math.random() * 3.6;
        sparks.push({
          x: gx * CELL + CELL / 2,
          y: gy * CELL + CELL / 2,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
          color
        });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") setDirection(0, -1);
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") setDirection(0, 1);
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setDirection(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setDirection(1, 0);
      if (e.key === "Shift" || e.key === " ") boostRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key === " ") boostRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(50, now - lastTs);
      lastTs = now;

      if (!dead) {
        const baseStepMs = Math.max(62, 128 - Math.min(52, snake.length * 1.4));
        const stepMs = boostRef.current ? baseStepMs * 0.62 : baseStepMs;
        stepAccum += dt;

        for (let i = orbs.length - 1; i >= 0; i--) {
          if (orbs[i].kind !== "volt") {
            orbs[i].ttl -= dt;
            if (orbs[i].ttl <= 0) orbs.splice(i, 1);
          }
        }
        if (orbs.length < 3 && Math.random() < 0.008) {
          orbs.push(spawnOrb(Math.random() < 0.55 ? "overdrive" : "phase"));
        }

        while (stepAccum >= stepMs && !dead) {
          stepAccum -= stepMs;
          dirRef.current = nextDirRef.current;
          const head = snake[0];
          const nx = (head.x + dirRef.current.x + COLS) % COLS;
          const ny = (head.y + dirRef.current.y + ROWS) % ROWS;
          const isPhase = now < phaseUntil;

          const hitSelf = snake.some((seg, idx) => idx > 0 && seg.x === nx && seg.y === ny);
          if (hitSelf && !isPhase) {
            dead = true;
            burst(nx, ny, "#FF2A3C", 28);
            onScore?.(score);
            setHud({ score, best: Math.max(best, score), combo, phaseMs: 0, dead: true });
            break;
          }

          snake.unshift({ x: nx, y: ny });
          const eatenIdx = orbs.findIndex((o) => o.x === nx && o.y === ny);
          if (eatenIdx >= 0) {
            const eaten = orbs.splice(eatenIdx, 1)[0];
            combo = now - lastEatAt < 3200 ? Math.min(8, combo + 1) : 1;
            lastEatAt = now;
            const pts = (eaten.kind === "overdrive" ? 120 : eaten.kind === "phase" ? 80 : 40) * combo;
            score += pts;
            best = Math.max(best, score);
            if (eaten.kind === "phase") phaseUntil = now + 6000;
            burst(nx, ny, eaten.kind === "overdrive" ? "#FF2A3C" : eaten.kind === "phase" ? "#00F0D4" : "#F3FF00", 18);
            if (!orbs.some((o) => o.kind === "volt")) orbs.push(spawnOrb("volt"));
            onScore?.(score);
          } else {
            snake.pop();
          }
          setHud({ score, best, combo, phaseMs: Math.max(0, Math.round(phaseUntil - now)), dead: false });
        }
      }

      // Draw cyberpunk arena
      ctx.fillStyle = "#06080E";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(0, 240, 212, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, H);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL);
        ctx.lineTo(W, y * CELL);
        ctx.stroke();
      }

      // Orbs
      for (const orb of orbs) {
        const cx = orb.x * CELL + CELL / 2;
        const cy = orb.y * CELL + CELL / 2;
        const pulse = 0.85 + Math.sin(now * 0.008) * 0.2;
        const col = orb.kind === "overdrive" ? "#FF2A3C" : orb.kind === "phase" ? "#00F0D4" : "#F3FF00";
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 16;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, (orb.kind === "volt" ? 7 : 8.5) * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Serpent trail
      const isPhase = now < phaseUntil;
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const ratio = 1 - i / Math.max(1, snake.length);
        const col = isPhase
          ? "#00F0D4"
          : i === 0
            ? "#FFFFFF"
            : i % 2 === 0
              ? "#F3FF00"
              : "#00F0D4";
        ctx.save();
        ctx.globalAlpha = 0.4 + ratio * 0.6;
        ctx.shadowColor = col;
        ctx.shadowBlur = i === 0 ? 18 : 10;
        ctx.fillStyle = col;
        const pad = i === 0 ? 2 : 3.5;
        ctx.fillRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
        ctx.restore();
      }

      // Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.035;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [runId, onScore]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ color: "var(--volt)", fontWeight: 700 }}>SCORE: {hud.score.toLocaleString()}</span>
          <span style={{ color: "var(--cyan)" }}>COMBO: x{hud.combo}</span>
          {hud.phaseMs > 0 && <span style={{ color: "#00F0D4", fontWeight: 700 }}>PHASE SHIELD {(hud.phaseMs / 1000).toFixed(1)}s</span>}
        </div>
        <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>WASD / ARROWS · SPACE BOOST · WRAP EDGES</span>
      </div>

      <div style={{ position: "relative", border: "1px solid rgba(0,240,212,0.35)", borderRadius: 8, overflow: "hidden", background: "#06080E" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            touchStartRef.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const start = touchStartRef.current;
            const t = e.changedTouches[0];
            if (!start || !t) return;
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
            if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
            else setDirection(0, dy > 0 ? 1 : -1);
          }}
        />
        {hud.dead && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,10,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div className="font-display" style={{ fontSize: 28, color: "var(--vermilion)", fontWeight: 700 }}>SIGNAL COLLISION</div>
            <div className="font-mono" style={{ fontSize: 16, color: "var(--volt)" }}>FINAL SCORE: {hud.score.toLocaleString()}</div>
            <button type="button" className="btn-volt" onClick={() => setRunId((r) => r + 1)}>
              REBOOT SERPENT ▶
            </button>
          </div>
        )}
      </div>

      {/* Touch D-Pad for Mobile & iPad */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        <button type="button" className="btn-steel font-mono" style={{ padding: "10px 16px" }} onClick={() => setDirection(-1, 0)}>◀</button>
        <div style={{ display: "grid", gap: 6 }}>
          <button type="button" className="btn-steel font-mono" style={{ padding: "8px 18px" }} onClick={() => setDirection(0, -1)}>▲</button>
          <button type="button" className="btn-steel font-mono" style={{ padding: "8px 18px" }} onClick={() => setDirection(0, 1)}>▼</button>
        </div>
        <button type="button" className="btn-steel font-mono" style={{ padding: "10px 16px" }} onClick={() => setDirection(1, 0)}>▶</button>
        <button
          type="button"
          className="btn-volt font-mono"
          style={{ padding: "10px 14px", fontSize: 11, marginLeft: 8 }}
          onPointerDown={() => { boostRef.current = true; }}
          onPointerUp={() => { boostRef.current = false; }}
          onPointerLeave={() => { boostRef.current = false; }}
        >
          BOOST
        </button>
      </div>
    </div>
  );
}
