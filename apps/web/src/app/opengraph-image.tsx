import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SYNTHPLAY // Global Free & AI-Crafted HTML5 Cyber Arcade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #07080B 0%, #0D121D 55%, #09181A 100%)",
          color: "#F3F5FA",
          fontFamily: "sans-serif",
          position: "relative"
        }}
      >
        {/* Top Accent Strip */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #F3FF00 0%, #00F0D4 55%, #FF2A3C 100%)",
            display: "flex"
          }}
        />

        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background: "#07080B",
                border: "3px solid #F3FF00",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 900,
                color: "#F3FF00",
                letterSpacing: "-0.04em"
              }}
            >
              SP
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.08em", color: "#FFFFFF" }}>
                SYNTHPLAY
              </div>
              <div style={{ fontSize: 16, color: "#00F0D4", letterSpacing: "0.14em" }}>
                SYNTHPLAY.GAMES
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid rgba(243,255,0,0.5)",
              background: "rgba(243,255,0,0.12)",
              color: "#F3FF00",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.08em"
            }}
          >
            100% FREE BROWSER ARCADE
          </div>
        </div>

        {/* Center Hero Statement */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1020 }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 900,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: "#FFFFFF"
            }}
          >
            PLAY &amp; PUBLISH AI-CRAFTED HTML5 GAMES INSTANTLY
          </div>
          <div
            style={{
              fontSize: 26,
              lineHeight: 1.4,
              color: "#B6C0D4"
            }}
          >
            Zero downloads · Free global Cloudflare R2 hosting for indie &amp; AI creators · Global &amp; country leaderboards
          </div>
        </div>

        {/* Bottom Feature Pills */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {["INSTANT HTML5 / WEBGL", "FREE CREATOR HOSTING", "6 GLOBAL LANGUAGES"].map((pill) => (
              <div
                key={pill}
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(0,240,212,0.35)",
                  color: "#00F0D4",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.06em"
                }}
              >
                {pill}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              padding: "12px 26px",
              borderRadius: 8,
              background: "#F3FF00",
              color: "#07080B",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "0.06em"
            }}
          >
            PLAY FREE ▶
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
