"use client";

import React, { useEffect, useRef, useState } from "react";

interface Drone {
  x: number;
  y: number;
  hp: number;
  speed: number;
  radius: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Gem {
  x: number;
  y: number;
  val: number;
}

const W = 680;
const H = 420;

export function HyperSurvivorGame({ onScore }: { onScore?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerTargetRef = useRef<{ x: number; y: number } | null>(null);
  const [hud, setHud] = useState({ score: 0, hp: 100, level: 1, kills: 0, dead: false });
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const player = { x: W / 2, y: H / 2, hp: 100 };
    const keys = { w: false, a: false, s: false, d: false };
    const drones: Drone[] = [];
    const bullets: Bullet[] = [];
    const gems: Gem[] = [];

    let score = 0;
    let xp = 0;
    let level = 1;
    let kills = 0;
    let dead = false;
    let fireTimer = 0;
    let spawnTimer = 0;
    let orbAngle = 0;
    let lastTs = performance.now();

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.w = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.s = true;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keys.a = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.d = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.w = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.s = false;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keys.a = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.d = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(40, now - lastTs);
      lastTs = now;

      if (!dead) {
        let vx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
        let vy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
        if (vx === 0 && vy === 0 && pointerTargetRef.current) {
          const dx = pointerTargetRef.current.x - player.x;
          const dy = pointerTargetRef.current.y - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            vx = dx / dist;
            vy = dy / dist;
          }
        } else if (vx !== 0 || vy !== 0) {
          const len = Math.hypot(vx, vy);
          vx /= len;
          vy /= len;
        }

        const moveSpd = 3.2 + Math.min(1.4, level * 0.14);
        player.x = Math.max(18, Math.min(W - 18, player.x + vx * moveSpd));
        player.y = Math.max(18, Math.min(H - 18, player.y + vy * moveSpd));

        // Spawn swarm drones from edges
        spawnTimer += dt;
        const spawnEvery = Math.max(240, 820 - level * 65);
        if (spawnTimer >= spawnEvery && drones.length < 48) {
          spawnTimer = 0;
          const edge = Math.floor(Math.random() * 4);
          const x = edge === 0 ? -14 : edge === 1 ? W + 14 : Math.random() * W;
          const y = edge === 2 ? -14 : edge === 3 ? H + 14 : Math.random() * H;
          const elite = level >= 3 && Math.random() < 0.2;
          drones.push({
            x,
            y,
            hp: elite ? 3 + level : 1 + Math.floor(level / 3),
            speed: elite ? 1.15 : 1.35 + Math.min(1.4, level * 0.1),
            radius: elite ? 14 : 9
          });
        }

        // Auto-aim plasma railgun toward closest drone
        fireTimer += dt;
        const fireEvery = Math.max(150, 440 - level * 32);
        if (fireTimer >= fireEvery && drones.length > 0) {
          fireTimer = 0;
          let nearest = drones[0];
          let minD = Infinity;
          for (const d of drones) {
            const dist = Math.hypot(d.x - player.x, d.y - player.y);
            if (dist < minD) { minD = dist; nearest = d; }
          }
          const baseAng = Math.atan2(nearest.y - player.y, nearest.x - player.x);
          const shots = level >= 5 ? 3 : level >= 3 ? 2 : 1;
          for (let s = 0; s < shots; s++) {
            const offset = (s - (shots - 1) / 2) * 0.18;
            bullets.push({
              x: player.x,
              y: player.y,
              vx: Math.cos(baseAng + offset) * 7.8,
              vy: Math.sin(baseAng + offset) * 7.8,
              life: 70
            });
          }
        }

        // Orbital blades (scales with level)
        orbAngle += 0.065;
        const bladeCount = Math.min(5, 1 + Math.floor(level / 2));
        const bladeR = 54;
        const blades = Array.from({ length: bladeCount }, (_, i) => {
          const a = orbAngle + (Math.PI * 2 * i) / bladeCount;
          return { x: player.x + Math.cos(a) * bladeR, y: player.y + Math.sin(a) * bladeR };
        });

        // Update bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.x += b.vx;
          b.y += b.vy;
          b.life -= 1;
          if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
            bullets.splice(i, 1);
            continue;
          }
          for (let j = drones.length - 1; j >= 0; j--) {
            const d = drones[j];
            if (Math.hypot(b.x - d.x, b.y - d.y) < d.radius + 5) {
              d.hp -= 1;
              bullets.splice(i, 1);
              if (d.hp <= 0) {
                gems.push({ x: d.x, y: d.y, val: d.radius > 10 ? 30 : 12 });
                drones.splice(j, 1);
                kills += 1;
                score += 25 * level;
                onScore?.(score);
              }
              break;
            }
          }
        }

        // Update drones & orbital collisions
        for (let i = drones.length - 1; i >= 0; i--) {
          const d = drones[i];
          const dx = player.x - d.x;
          const dy = player.y - d.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          d.x += (dx / dist) * d.speed;
          d.y += (dy / dist) * d.speed;

          let killedByBlade = false;
          for (const bl of blades) {
            if (Math.hypot(bl.x - d.x, bl.y - d.y) < d.radius + 9) {
              d.hp -= 0.45;
              if (d.hp <= 0) {
                gems.push({ x: d.x, y: d.y, val: 15 });
                drones.splice(i, 1);
                kills += 1;
                score += 30 * level;
                onScore?.(score);
                killedByBlade = true;
                break;
              }
            }
          }
          if (killedByBlade) continue;

          if (dist < d.radius + 11) {
            player.hp = Math.max(0, player.hp - 0.55);
            if (player.hp <= 0) {
              dead = true;
              onScore?.(score);
              setHud({ score, hp: 0, level, kills, dead: true });
            }
          }
        }

        // Collect XP gems (magnetic pull!)
        for (let i = gems.length - 1; i >= 0; i--) {
          const g = gems[i];
          const dist = Math.hypot(player.x - g.x, player.y - g.y);
          if (dist < 85) {
            g.x += ((player.x - g.x) / Math.max(1, dist)) * 5.2;
            g.y += ((player.y - g.y) / Math.max(1, dist)) * 5.2;
          }
          if (dist < 18) {
            xp += g.val;
            score += g.val;
            gems.splice(i, 1);
            const needed = level * 80;
            if (xp >= needed) {
              xp -= needed;
              level += 1;
              player.hp = Math.min(100, player.hp + 20);
            }
            onScore?.(score);
          }
        }

        setHud({ score, hp: Math.ceil(player.hp), level, kills, dead });
      }

      // Render arena
      ctx.fillStyle = "#07090F";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      for (let x = 0; x < W; x += 34) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 34) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // XP Gems
      for (const g of gems) {
        ctx.fillStyle = "#00F0D4";
        ctx.fillRect(g.x - 3, g.y - 3, 6, 6);
      }

      // Orbital ring + blades
      const bladeCount = Math.min(5, 1 + Math.floor(level / 2));
      ctx.strokeStyle = "rgba(0,240,212,0.16)";
      ctx.beginPath();
      ctx.arc(player.x, player.y, 54, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < bladeCount; i++) {
        const a = orbAngle + (Math.PI * 2 * i) / bladeCount;
        const bx = player.x + Math.cos(a) * 54;
        const by = player.y + Math.sin(a) * 54;
        ctx.save();
        ctx.fillStyle = "#F3FF00";
        ctx.shadowColor = "#F3FF00";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Drones
      for (const d of drones) {
        ctx.save();
        ctx.fillStyle = d.radius > 10 ? "#FF9F1C" : "#FF2A3C";
        ctx.shadowColor = "#FF2A3C";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Bullets
      ctx.fillStyle = "#F3FF00";
      for (const b of bullets) {
        ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
      }

      // Player
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "#00F0D4";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [runId, onScore]);

  const updatePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerTargetRef.current = {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * W,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * H
    };
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", fontSize: 12 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ color: "var(--volt)", fontWeight: 700 }}>SCORE: {hud.score.toLocaleString()}</span>
          <span style={{ color: "var(--cyan)" }}>LVL {hud.level} · KILLS {hud.kills}</span>
          <span style={{ color: hud.hp > 35 ? "#00F0D4" : "var(--vermilion)" }}>HP {hud.hp}%</span>
        </div>
        <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>WASD / ARROWS OR TOUCH-HOLD TO STEER · AUTO-FIRE RAILGUN &amp; ORBITALS</span>
      </div>

      <div style={{ position: "relative", border: "1px solid rgba(0,240,212,0.35)", borderRadius: 8, overflow: "hidden", background: "#07090F" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
          onPointerDown={updatePointer}
          onPointerMove={(e) => { if (e.buttons > 0 || e.pointerType === "touch") updatePointer(e); }}
          onPointerUp={() => { pointerTargetRef.current = null; }}
          onPointerLeave={() => { pointerTargetRef.current = null; }}
        />
        {hud.dead && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,10,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div className="font-display" style={{ fontSize: 28, color: "var(--vermilion)", fontWeight: 700 }}>SWARM OVERLOAD</div>
            <div className="font-mono" style={{ fontSize: 15, color: "var(--volt)" }}>SCORE: {hud.score.toLocaleString()} · LVL {hud.level} · {hud.kills} KILLS</div>
            <button type="button" className="btn-volt" onClick={() => setRunId((r) => r + 1)}>
              DROP BACK IN ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
