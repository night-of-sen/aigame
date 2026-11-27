"use client";

import React from "react";
import { IconSpark } from "./Icons";

interface ToolItem {
  name: string;
  role: string;
  tag: string;
  url: string;
  desc: string;
}

const RECOMMENDED_TOOLS: ToolItem[] = [
  {
    name: "CURSOR AI IDE",
    role: "CODE & GAME ENGINE",
    tag: "AI CODING",
    url: process.env.NEXT_PUBLIC_AFFILIATE_CURSOR || "https://cursor.com",
    desc: "Generate playable Canvas2D, Three.js & Phaser HTML5 games from natural language prompts."
  },
  {
    name: "MESHY 3D AI",
    role: "3D ASSETS & GLB",
    tag: "3D MODELS",
    url: process.env.NEXT_PUBLIC_AFFILIATE_MESHY || "https://www.meshy.ai",
    desc: "Text-to-3D game-ready GLB models & PBR textures for WebGL and Godot HTML5 builds."
  },
  {
    name: "SUNO STUDIO",
    role: "SYNTH SOUNDTRACKS",
    tag: "GAME AUDIO",
    url: process.env.NEXT_PUBLIC_AFFILIATE_SUNO || "https://suno.com",
    desc: "Compose retro arcade chiptune, synthwave boss themes, and ambient game loops in seconds."
  },
  {
    name: "HOSTINGER KVM VPS",
    role: "GAME SERVER HOSTING",
    tag: "CLOUD VPS",
    url: process.env.NEXT_PUBLIC_AFFILIATE_HOSTINGER || "https://www.hostinger.com/vps-hosting",
    desc: "Deploy multiplayer WebSocket rooms, Docker stacks, and custom game backends affordably."
  }
];

export function AiToolsShelf({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className="cab-surface"
      style={{
        padding: compact ? 18 : 24,
        marginTop: compact ? 0 : 28,
        border: "1px solid var(--hairline)"
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", display: "flex", alignItems: "center", gap: 6 }}>
          <IconSpark size={13} />
          <span>BUILD YOUR OWN AI GAME // RECOMMENDED CREATOR TOOLCHAIN</span>
        </div>
        <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
          PARTNER DISCLOSURE: SOME LINKS MAY EARN A SMALL COMMISSION AT NO EXTRA COST TO YOU
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        {RECOMMENDED_TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              display: "grid",
              gap: 6,
              padding: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--hairline)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 140ms ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                {tool.name}
              </span>
              <span className="font-mono" style={{ fontSize: 9, color: "var(--cyan)", border: "1px solid rgba(0,240,212,0.3)", padding: "2px 6px" }}>
                {tool.tag}
              </span>
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--volt)" }}>{tool.role}</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>{tool.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
