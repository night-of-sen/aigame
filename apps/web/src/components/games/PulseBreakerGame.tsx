"use client";

import React, { useEffect, useRef, useState } from "react";

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  color: string;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Drop {
  x: number;
  y: number;
  vy: number;
  kind: "multi" | "wide";
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const W = 680;
const H = 420;

export function PulseBreakerGame({ onScore }: { onScore?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1, dead: false });
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let paddleX = W / 2;
    let paddleW = 108;
    let wideUntil = 0;
    let score = 0;
    let lives = 3;
    let wave = 1;
    let dead = false;
    const keys = { left: false, right: false };

    const balls: Ball[] = [{ x: W / 2, y: H - 64, vx: 3.4, vy: -4.2 }];
    const drops: Drop[] = [];
    const shards: Shard[] = [];
    let bricks: Brick[] = [];

    const buildWave = (wNum: number) => {
      const cols = 10;
      const rows = Math.min(7, 4 + wNum);
      const bw = 58;
      const bh = 18;
      const gap = 6;
      const offsetX = (W - (cols * bw + (cols - 1) * gap)) / 2;
      const palette = ["#FF2A3C", "#FF9F1C", "#F3FF00", "#00F0D4", "#38BDF8"];
      const out: Brick[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          out.push({
            x: offsetX + c * (bw + gap),
            y: 44 + r * (bh + gap),
            w: bw,
            h: bh,
            hp: r === 0 && wNum >= 2 ? 2 : 1,
            color: palette[r % palette.length]
          });
        }
      }
      bricks = out;
    };
    buildWave(1);

    const shatter = (x: number, y: number, color: string) => {
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.4 + Math.random() * 3.2;
        shards.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
      }
    };

    const setPaddleFromClientX = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = (clientX - rect.left) / Math.max(1, rect.width);
      paddleX = Math.max(paddleW / 2, Math.min(W - paddleW / 2, ratio * W));
    };

    const onPointerMove = (e: PointerEvent) => setPaddleFromClientX(e.clientX);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);

      if (!dead) {
        paddleW = now < wideUntil ? 156 : 108;
        if (keys.left) paddleX -= 7.5;
        if (keys.right) paddleX += 7.5;
        paddleX = Math.max(paddleW / 2, Math.min(W - paddleW / 2, paddleX));

        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          b.x += b.vx;
          b.y += b.vy;

          if (b.x < 8) { b.x = 8; b.vx = Math.abs(b.vx); }
          if (b.x > W - 8) { b.x = W - 8; b.vx = -Math.abs(b.vx); }
          if (b.y < 8) { b.y = 8; b.vy = Math.abs(b.vy); }

          // Paddle bounce
          if (b.vy > 0 && b.y >= H - 36 && b.y <= H - 20 && Math.abs(b.x - paddleX) <= paddleW / 2 + 8) {
            const rel = (b.x - paddleX) / (paddleW / 2);
            const speed = Math.min(7.4, Math.hypot(b.vx, b.vy) * 1.015);
            const angle = rel * 1.15;
            b.vx = Math.sin(angle) * speed;
            b.vy = -Math.cos(angle) * speed;
            b.y = H - 37;
          }

          // Brick hit
          for (let j = bricks.length - 1; j >= 0; j--) {
            const br = bricks[j];
            if (b.x + 7 > br.x && b.x - 7 < br.x + br.w && b.y + 7 > br.y && b.y - 7 < br.y + br.h) {
              b.vy = -b.vy;
              br.hp -= 1;
              if (br.hp <= 0) {
                shatter(br.x + br.w / 2, br.y + br.h / 2, br.color);
                bricks.splice(j, 1);
                score += 50 * wave;
                onScore?.(score);
                if (Math.random() < 0.16) {
                  drops.push({
                    x: br.x + br.w / 2,
                    y: br.y + br.h / 2,
                    vy: 2.5,
                    kind: Math.random() < 0.55 ? "multi" : "wide"
                  });
                }
              } else {
                br.color = "#FFFFFF";
                score += 20;
              }
              setHud({ score, lives, wave, dead: false });
              break;
            }
          }

          if (b.y > H + 18) {
            balls.splice(i, 1);
          }
        }

        if (balls.length === 0) {
          lives -= 1;
          if (lives <= 0) {
            dead = true;
            onScore?.(score);
            setHud({ score, lives: 0, wave, dead: true });
          } else {
            balls.push({ x: paddleX, y: H - 60, vx: (Math.random() > 0.5 ? 1 : -1) * 3.4, vy: -4.4 });
            setHud({ score, lives, wave, dead: false });
          }
        }

        if (bricks.length === 0) {
          wave += 1;
          score += 300;
          onScore?.(score);
          buildWave(wave);
          balls.splice(0, balls.length, { x: paddleX, y: H - 64, vx: 3.8, vy: -4.8 });
          setHud({ score, lives, wave, dead: false });
        }

        // Power-up drops
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.y += d.vy;
          if (d.y >= H - 36 && d.y <= H - 14 && Math.abs(d.x - paddleX) <= paddleW / 2 + 10) {
            if (d.kind === "multi" && balls.length < 6 && balls[0]) {
              const src = balls[0];
              balls.push({ x: src.x, y: src.y, vx: -src.vx, vy: -Math.abs(src.vy) });
              balls.push({ x: src.x, y: src.y, vx: src.vx * 0.65, vy: -Math.abs(src.vy) });
            } else {
              wideUntil = now + 10000;
            }
            drops.splice(i, 1);
          } else if (d.y > H + 20) {
            drops.splice(i, 1);
          }
        }
      }

      // Render
      ctx.fillStyle = "rgba(6, 8, 14, 0.42)";
      ctx.fillRect(0, 0, W, H);

      for (const br of bricks) {
        ctx.save();
        ctx.fillStyle = br.color;
        ctx.shadowColor = br.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(br.x, br.y, br.w, br.h);
        ctx.restore();
      }

      for (const d of drops) {
        ctx.save();
        const col = d.kind === "multi" ? "#F3FF00" : "#00F0D4";
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.fillRect(d.x - 12, d.y - 6, 24, 12);
        ctx.fillStyle = "#07080B";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(d.kind === "multi" ? "3X" : "WIDE", d.x, d.y + 3);
        ctx.restore();
      }

      // Paddle
      ctx.save();
      ctx.fillStyle = "#00F0D4";
      ctx.shadowColor = "#00F0D4";
      ctx.shadowBlur = 18;
      ctx.fillRect(paddleX - paddleW / 2, H - 30, paddleW, 11);
      ctx.fillStyle = "#F3FF00";
      ctx.fillRect(paddleX - paddleW / 2 + 6, H - 28, paddleW - 12, 4);
      ctx.restore();

      // Balls
      for (const b of balls) {
        ctx.save();
        ctx.fillStyle = "#F3FF00";
        ctx.shadowColor = "#F3FF00";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Shards
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.04;
        if (s.life <= 0) { shards.splice(i, 1); continue; }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [runId, onScore]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", fontSize: 12 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ color: "var(--volt)", fontWeight: 700 }}>SCORE: {hud.score.toLocaleString()}</span>
          <span style={{ color: "var(--cyan)" }}>WAVE {hud.wave}</span>
          <span style={{ color: "var(--vermilion)" }}>SHIELDS: {"♦".repeat(Math.max(0, hud.lives))}</span>
        </div>
        <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>MOVE MOUSE / TOUCH DRAG / ARROWS · CATCH 3X &amp; WIDE DROPS</span>
      </div>

      <div style={{ position: "relative", border: "1px solid rgba(255,42,60,0.4)", borderRadius: 8, overflow: "hidden", background: "#06080E" }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }} />
        {hud.dead && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,10,0.84)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div className="font-display" style={{ fontSize: 28, color: "var(--vermilion)", fontWeight: 700 }}>CORE SHATTERED</div>
            <div className="font-mono" style={{ fontSize: 16, color: "var(--volt)" }}>FINAL SCORE: {hud.score.toLocaleString()}</div>
            <button type="button" className="btn-volt" onClick={() => setRunId((r) => r + 1)}>
              PLAY AGAIN ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
