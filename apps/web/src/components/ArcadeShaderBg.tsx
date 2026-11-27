"use client";

import React, { useEffect, useRef } from "react";
import { arcadeAudio } from "@/lib/arcadeAudio";

interface ArcadeShaderBgProps {
  accentHex: string;
  paused: boolean;
  quality: "ultra" | "balanced" | "lite";
  onFps?: (fps: number) => void;
}

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Ultra-fast 60fps analytical Cyberpunk Neon Plasma + Chromatic Energy Wave GLSL shader
const FRAG_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_accent;
uniform float u_pulse;

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.55;

  float w1 = sin(p.x * 2.6 + t + sin(p.y * 2.2 - t * 0.7));
  float w2 = cos(p.y * 3.1 - t * 0.8 + cos(p.x * 1.9 + t * 0.6));
  float wave = 0.5 + 0.5 * sin(w1 * 1.7 + w2 * 1.5);

  float beam1 = pow(max(0.0, sin(p.x * 3.2 + p.y * 1.5 - t * 1.3 + w1 * 0.9)), 5.0);
  float beam2 = pow(max(0.0, sin(-p.x * 2.4 + p.y * 2.1 - t * 0.9 + w2 * 0.8)), 6.0);
  float horizon = exp(-abs(p.y + 0.12) * 3.5) * 0.16;

  float dist = length(p - m);
  float hoverGlow = exp(-dist * 3.2) * 0.38;
  float ring = exp(-abs(dist - (1.0 - u_pulse) * 0.95) * 24.0) * u_pulse * 0.85;

  vec3 base = vec3(0.024, 0.028, 0.042);
  vec3 cyan = vec3(0.0, 0.94, 0.83);
  vec3 crimson = vec3(1.0, 0.16, 0.23);

  vec3 col = base;
  col += u_accent * (wave * 0.14 + beam1 * 0.16);
  col += cyan * (beam2 * 0.18 + horizon);
  col += crimson * (pow(wave, 4.0) * 0.09);
  col += mix(u_accent, crimson, 0.4) * (hoverGlow + ring);

  float scan = 0.965 + 0.035 * sin(gl_FragCoord.y * 1.8);
  col *= scan;

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return [0.95, 1.0, 0.0];
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255
  ];
}

export function ArcadeShaderBg({ accentHex, paused, quality, onFps }: ArcadeShaderBgProps) {
  const glRef = useRef<HTMLCanvasElement | null>(null);
  const fxRef = useRef<HTMLCanvasElement | null>(null);
  const accentRef = useRef<[number, number, number]>(hexToRgb(accentHex));
  const pausedRef = useRef(paused);
  const qualityRef = useRef(quality);

  useEffect(() => {
    accentRef.current = hexToRgb(accentHex);
  }, [accentHex]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  // Hide native OS cursor whenever FPS crosshair is active (works on touchscreen laptops too!)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const active = !paused && quality !== "lite";
    document.body.classList.toggle("fps-cursor-active", active);
    return () => {
      document.body.classList.remove("fps-cursor-active");
    };
  }, [paused, quality]);

  useEffect(() => {
    const glCanvas = glRef.current;
    const fxCanvas = fxRef.current;
    if (!glCanvas || !fxCanvas) return;

    const gl = glCanvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false });
    const fx = fxCanvas.getContext("2d");

    let program: WebGLProgram | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uMouse: WebGLUniformLocation | null = null;
    let uAccent: WebGLUniformLocation | null = null;
    let uPulse: WebGLUniformLocation | null = null;

    if (gl) {
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type);
        if (!s) return null;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
      if (vs && fs) {
        program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);
          gl.useProgram(program);
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
          const loc = gl.getAttribLocation(program, "a_pos");
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

          uTime = gl.getUniformLocation(program, "u_time");
          uRes = gl.getUniformLocation(program, "u_res");
          uMouse = gl.getUniformLocation(program, "u_mouse");
          uAccent = gl.getUniformLocation(program, "u_accent");
          uPulse = gl.getUniformLocation(program, "u_pulse");
        }
      }
    }

    const mouse = {
      x: 0.5,
      y: 0.5,
      px: -200,
      py: -200,
      boxX: -200,
      boxY: -200,
      lastPx: -200,
      lastPy: -200,
      spread: 0,
      recoil: 0,
      hitFlash: 0,
      locked: false,
      lockLabel: "AIM",
      visible: false
    };

    let pulse = 0;
    const currentAccent: [number, number, number] = [...accentRef.current];

    const trail: Array<{ x: number; y: number; life: number }> = [];
    const sparks: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
      len: number;
    }> = [];
    const shockwaves: Array<{
      x: number;
      y: number;
      r: number;
      maxR: number;
      alpha: number;
      color: string;
      lineW: number;
      shape: "box" | "ring";
    }> = [];
    const muzzleFlashes: Array<{ x: number; y: number; life: number; tag?: string }> = [];

    const resize = () => {
      const maxW = qualityRef.current === "ultra" ? 640 : 420;
      const aspect = window.innerHeight / Math.max(window.innerWidth, 1);
      glCanvas.width = Math.min(maxW, Math.max(280, Math.floor(window.innerWidth * 0.45)));
      glCanvas.height = Math.max(180, Math.floor(glCanvas.width * aspect));
      fxCanvas.width = window.innerWidth;
      fxCanvas.height = window.innerHeight;
      if (gl) gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMove = (clientX: number, clientY: number, target: EventTarget | null) => {
      if (!mouse.visible) {
        mouse.boxX = clientX;
        mouse.boxY = clientY;
      }
      mouse.visible = true;
      mouse.x = clientX / Math.max(window.innerWidth, 1);
      mouse.y = 1.0 - clientY / Math.max(window.innerHeight, 1);

      const dx = mouse.lastPx < -100 ? 0 : clientX - mouse.lastPx;
      const dy = mouse.lastPy < -100 ? 0 : clientY - mouse.lastPy;
      const speed = Math.min(48, Math.hypot(dx, dy));
      mouse.spread = Math.min(20, Math.max(mouse.spread, speed * 0.48));

      mouse.lastPx = clientX;
      mouse.lastPy = clientY;
      mouse.px = clientX;
      mouse.py = clientY;

      const el = target as HTMLElement | null;
      const interactive = el?.closest("button, a, article, input, select");
      mouse.locked = Boolean(interactive);
      mouse.lockLabel = el?.closest("article") ? "PLAY // LOCK" : interactive ? "TGT // LOCK" : "AIM";

      if (!pausedRef.current && qualityRef.current !== "lite") {
        trail.push({ x: clientX, y: clientY, life: 1 });
        if (trail.length > 18) trail.shift();

        if (qualityRef.current === "ultra" && speed > 5 && Math.random() < 0.5) {
          sparks.push({
            x: clientX,
            y: clientY,
            vx: -dx * 0.14 + (Math.random() - 0.5) * 2.0,
            vy: -dy * 0.14 + (Math.random() - 0.5) * 2.0,
            life: 1,
            color: Math.random() > 0.4 ? "#00F0D4" : "#F3FF00",
            len: 6 + Math.random() * 7
          });
        }
      }
    };

    const isTouchOnly = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || isTouchOnly) {
        mouse.visible = false;
        document.body.classList.remove("fps-cursor-active");
        return;
      }
      if (!pausedRef.current && qualityRef.current !== "lite") {
        document.body.classList.add("fps-cursor-active");
      }
      handleMove(e.clientX, e.clientY, e.target);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isTouchOnly) return;
      handleMove(e.clientX, e.clientY, e.target);
    };

    const onDown = (e: MouseEvent) => {
      if (isTouchOnly) return;
      handleMove(e.clientX, e.clientY, e.target);
      pulse = 1.0;
      mouse.recoil = 24;
      mouse.hitFlash = 1.0;
      arcadeAudio.playHitmarker();

      if (pausedRef.current || qualityRef.current === "lite") return;

      const el = e.target as HTMLElement | null;
      const isTarget = Boolean(el?.closest("button, a, article"));

      // 1. Muzzle flash + optional CRIT/HIT micro tag
      muzzleFlashes.push({
        x: e.clientX,
        y: e.clientY,
        life: 1,
        tag: isTarget ? "HIT // LOCK" : undefined
      });

      // 2. Expanding Tactical Box + Dual Chromatic Plasma Shockwaves
      shockwaves.push(
        { x: e.clientX, y: e.clientY, r: 16, maxR: 92, alpha: 0.98, color: "#F3FF00", lineW: 2.5, shape: "box" },
        { x: e.clientX, y: e.clientY, r: 10, maxR: 120, alpha: 0.85, color: "#00F0D4", lineW: 1.6, shape: "ring" },
        { x: e.clientX, y: e.clientY, r: 6, maxR: 68, alpha: 0.92, color: "#FF2A3C", lineW: 2.2, shape: "ring" }
      );

      // 3. 22 High-velocity laser tracer rays
      for (let i = 0; i < 22; i++) {
        const ang = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.25;
        const spd = 4.6 + Math.random() * 7.2;
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1,
          color: i % 3 === 0 ? "#FF2A3C" : i % 2 === 0 ? "#F3FF00" : "#00F0D4",
          len: 10 + Math.random() * 14
        });
      }
    };

    const onLeave = () => {
      mouse.visible = false;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    let rafId = 0;
    const start = performance.now();
    let lastFpsTs = start;
    let frameCount = 0;

    const drawBoxBrackets = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      half: number,
      cornerLen: number,
      color: string,
      lineW: number
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(cx - half, cy - half + cornerLen);
      ctx.lineTo(cx - half, cy - half);
      ctx.lineTo(cx - half + cornerLen, cy - half);
      // Top-Right
      ctx.moveTo(cx + half - cornerLen, cy - half);
      ctx.lineTo(cx + half, cy - half);
      ctx.lineTo(cx + half, cy - half + cornerLen);
      // Bottom-Right
      ctx.moveTo(cx + half, cy + half - cornerLen);
      ctx.lineTo(cx + half, cy + half);
      ctx.lineTo(cx + half - cornerLen, cy + half);
      // Bottom-Left
      ctx.moveTo(cx - half + cornerLen, cy + half);
      ctx.lineTo(cx - half, cy + half);
      ctx.lineTo(cx - half, cy + half - cornerLen);
      ctx.stroke();
    };

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      if (pausedRef.current) return;

      const t = (now - start) / 1000;
      pulse = Math.max(0, pulse - 0.028);
      mouse.spread *= 0.84;
      mouse.recoil *= 0.78;
      mouse.hitFlash *= 0.82;

      for (let i = 0; i < 3; i++) {
        currentAccent[i] += (accentRef.current[i] - currentAccent[i]) * 0.06;
      }

      if (gl && program && qualityRef.current !== "lite") {
        gl.uniform1f(uTime, t);
        gl.uniform2f(uRes, glCanvas.width, glCanvas.height);
        gl.uniform2f(uMouse, mouse.x, mouse.y);
        gl.uniform3f(uAccent, currentAccent[0], currentAccent[1], currentAccent[2]);
        gl.uniform1f(uPulse, pulse);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      // Render Unified 60fps Canvas: Trail + Click Shockwaves + Sparks + RAZOR-SHARP FPS BOX CROSSHAIR
      if (fx) {
        fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        if (qualityRef.current !== "lite") {
          // 1. Sleek Phosphor Ribbon Trail
          if (trail.length > 2) {
            for (let i = 1; i < trail.length; i++) {
              const p0 = trail[i - 1];
              const p1 = trail[i];
              p0.life -= 0.06;
              const alpha = Math.max(0, (i / trail.length) * 0.45 * p0.life);
              if (alpha <= 0) continue;
              fx.strokeStyle = i > trail.length - 6 ? `rgba(243, 255, 0, ${alpha})` : `rgba(0, 240, 212, ${alpha})`;
              fx.lineWidth = (i / trail.length) * 2.6;
              fx.lineCap = "round";
              fx.beginPath();
              fx.moveTo(p0.x, p0.y);
              fx.lineTo(p1.x, p1.y);
              fx.stroke();
            }
            while (trail.length > 0 && trail[0].life <= 0) trail.shift();
          }

          // 2. Click Muzzle Impact Flash + Floating Hit Tag
          for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
            const mf = muzzleFlashes[i];
            mf.life -= 0.065;
            if (mf.life <= 0) {
              muzzleFlashes.splice(i, 1);
              continue;
            }
            const r = 34 * mf.life;
            const g = fx.createRadialGradient(mf.x, mf.y, 1, mf.x, mf.y, r);
            g.addColorStop(0, `rgba(255, 255, 255, ${mf.life})`);
            g.addColorStop(0.35, `rgba(243, 255, 0, ${mf.life * 0.85})`);
            g.addColorStop(1, "transparent");
            fx.fillStyle = g;
            fx.beginPath();
            fx.arc(mf.x, mf.y, r, 0, Math.PI * 2);
            fx.fill();

            // Crisp Crimson X Hitmarker
            const arm = 14 + (1 - mf.life) * 16;
            fx.strokeStyle = `rgba(255, 42, 60, ${Math.min(1, mf.life * 1.4)})`;
            fx.lineWidth = 2.6;
            fx.beginPath();
            fx.moveTo(mf.x - arm, mf.y - arm);
            fx.lineTo(mf.x - 5, mf.y - 5);
            fx.moveTo(mf.x + arm, mf.y - arm);
            fx.lineTo(mf.x + 5, mf.y - 5);
            fx.moveTo(mf.x - arm, mf.y + arm);
            fx.lineTo(mf.x - 5, mf.y + 5);
            fx.moveTo(mf.x + arm, mf.y + arm);
            fx.lineTo(mf.x + 5, mf.y + 5);
            fx.stroke();

            if (mf.tag) {
              fx.save();
              fx.globalAlpha = mf.life;
              fx.fillStyle = "#F3FF00";
              fx.font = "bold 10px monospace";
              fx.fillText(mf.tag, mf.x + 18, mf.y - 16 - (1 - mf.life) * 26);
              fx.restore();
            }
          }

          // 3. Expanding Tactical Box & Chromatic Ring Shockwaves
          for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.r += (sw.maxR - sw.r) * 0.16 + 2.4;
            sw.alpha -= 0.04;
            if (sw.alpha <= 0 || sw.r >= sw.maxR) {
              shockwaves.splice(i, 1);
              continue;
            }
            fx.save();
            fx.globalAlpha = sw.alpha;
            if (sw.shape === "box") {
              drawBoxBrackets(fx, sw.x, sw.y, sw.r, Math.max(8, sw.r * 0.34), sw.color, sw.lineW);
            } else {
              fx.strokeStyle = sw.color;
              fx.lineWidth = sw.lineW;
              fx.beginPath();
              fx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
              fx.stroke();
            }
            fx.restore();
          }

          // 4. High-Velocity Laser Tracer Sparks
          for (let i = sparks.length - 1; i >= 0; i--) {
            const sp = sparks[i];
            sp.x += sp.vx;
            sp.y += sp.vy;
            sp.vx *= 0.94;
            sp.vy *= 0.94;
            sp.life -= 0.036;
            if (sp.life <= 0) {
              sparks.splice(i, 1);
              continue;
            }
            fx.save();
            fx.globalAlpha = sp.life;
            fx.strokeStyle = sp.color;
            fx.lineWidth = 2.1;
            fx.lineCap = "round";
            fx.beginPath();
            fx.moveTo(sp.x, sp.y);
            fx.lineTo(sp.x - sp.vx * (sp.len * 0.25), sp.y - sp.vy * (sp.len * 0.25));
            fx.stroke();
            fx.restore();
          }

          // 5. DIRECT CANVAS-RENDERED CYBERPUNK FPS TACTICAL BOX CROSSHAIR (100% crisp, zero lag, unmistakable!)
          if (mouse.visible) {
            // Outer tactical box trails slightly with spring inertia; inner crosshair is 1:1 instant!
            mouse.boxX += (mouse.px - mouse.boxX) * 0.38;
            mouse.boxY += (mouse.py - mouse.boxY) * 0.38;

            const spread = Math.min(26, mouse.spread + mouse.recoil);
            const baseBox = mouse.locked ? 24 : 20;
            const boxHalf = baseBox + spread;
            const cornerLen = mouse.locked ? 11 : 9;
            const mainCol = mouse.hitFlash > 0.25 ? "#FF2A3C" : mouse.locked ? "#F3FF00" : "#00F0D4";

            fx.save();
            // Chromatic RGB split echo on locked/firing box brackets
            if (mouse.locked || mouse.hitFlash > 0.15) {
              fx.globalAlpha = 0.55;
              drawBoxBrackets(fx, mouse.boxX - 2, mouse.boxY, boxHalf, cornerLen, "#00F0D4", 2);
              drawBoxBrackets(fx, mouse.boxX + 2, mouse.boxY, boxHalf, cornerLen, "#FF2A3C", 2);
              fx.globalAlpha = 1;
            }

            // Primary Glowing 4-Corner Tactical Box Frame
            fx.shadowBlur = 12;
            fx.shadowColor = mainCol;
            drawBoxBrackets(fx, mouse.boxX, mouse.boxY, boxHalf, cornerLen, mainCol, 2.2);

            // Rotating dashed telemetry sub-ring inside box
            fx.save();
            fx.translate(mouse.boxX, mouse.boxY);
            fx.rotate(t * (mouse.locked ? 2.8 : 1.0));
            fx.strokeStyle = mouse.locked ? "rgba(243, 255, 0, 0.72)" : "rgba(0, 240, 212, 0.36)";
            fx.lineWidth = 1.2;
            fx.setLineDash([5, 5]);
            fx.beginPath();
            fx.arc(0, 0, mouse.locked ? 16 : 13, 0, Math.PI * 2);
            fx.stroke();
            fx.restore();

            // 1:1 Precision 4-Axis FPS Crosshair Ticks (+)
            const gap = 5 + spread * 0.4;
            const tickLen = 9;
            fx.strokeStyle = mouse.locked ? "#F3FF00" : "#FFFFFF";
            fx.shadowBlur = 8;
            fx.shadowColor = mainCol;
            fx.lineWidth = 2;
            fx.beginPath();
            // Top / Bottom / Left / Right
            fx.moveTo(mouse.px, mouse.py - gap - tickLen);
            fx.lineTo(mouse.px, mouse.py - gap);
            fx.moveTo(mouse.px, mouse.py + gap);
            fx.lineTo(mouse.px, mouse.py + gap + tickLen);
            fx.moveTo(mouse.px - gap - tickLen, mouse.py);
            fx.lineTo(mouse.px - gap, mouse.py);
            fx.moveTo(mouse.px + gap, mouse.py);
            fx.lineTo(mouse.px + gap + tickLen, mouse.py);
            fx.stroke();

            // Glowing Center Aim Dot
            fx.fillStyle = mouse.hitFlash > 0.2 ? "#FFFFFF" : "#F3FF00";
            fx.beginPath();
            fx.arc(mouse.px, mouse.py, mouse.hitFlash > 0.2 ? 3.2 : 2.1, 0, Math.PI * 2);
            fx.fill();

            // Crisp Telemetry Tags (AIM / TGT // LOCK + X:Y coords)
            fx.shadowBlur = 0;
            fx.font = "bold 9px monospace";
            fx.fillStyle = mainCol;
            fx.fillText(mouse.lockLabel, mouse.boxX + boxHalf + 7, mouse.boxY - boxHalf + 8);
            fx.fillStyle = "rgba(255,255,255,0.62)";
            fx.fillText(
              `${String(Math.round(mouse.px)).padStart(4, "0")}:${String(Math.round(mouse.py)).padStart(4, "0")}`,
              mouse.boxX + boxHalf + 7,
              mouse.boxY + boxHalf
            );
            fx.restore();
          }
        }
      }

      frameCount++;
      if (now - lastFpsTs >= 650) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsTs));
        onFps?.(fps);
        frameCount = 0;
        lastFpsTs = now;
      }
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [onFps]);

  return (
    <>
      <canvas
        ref={glRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          pointerEvents: "none",
          opacity: quality === "lite" ? 0 : 0.92
        }}
      />
      <canvas
        ref={fxRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 250,
          pointerEvents: "none"
        }}
      />
      <div className="crt-vignette" />
      <div className="crt-grain" />
    </>
  );
}
