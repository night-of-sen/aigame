import { ImageResponse } from "next/og";
import { loadFullStore } from "@synthplay/db";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function GameOpenGraphImage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await loadFullStore();
  const game = store.games.find((g) => g.slug === slug || g.id === slug);

  const title = game?.title || "SYNTHPLAY ARCADE";
  const tagline =
    game?.tagline || "Play free browser HTML5 & AI-crafted games instantly with zero downloads.";
  const genre = game?.category || "ARCADE";
  const creator = game ? `${game.creatorName} [${game.creatorCountryCode}]` : "SYNTHPLAY";
  const accent = game?.accentColor || "#F3FF00";
  const tools = (game?.aiTools || ["HTML5", "WebGL"]).slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 60px",
          background: "linear-gradient(135deg, #07080B 0%, #101624 58%, #09141C 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
          position: "relative"
        }}
      >
        {/* Top Neon Accent Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: `linear-gradient(90deg, ${accent} 0%, #00F0D4 60%, #FF2A3C 100%)`,
            display: "flex"
          }}
        />

        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#07080B",
                border: "2px solid #F3FF00",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 900,
                color: "#F3FF00"
              }}
            >
              SP
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.08em", color: "#F3FF00" }}>
              SYNTHPLAY.GAMES
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                display: "flex",
                padding: "8px 16px",
                borderRadius: 6,
                background: "rgba(0,240,212,0.14)",
                border: "1px solid rgba(0,240,212,0.45)",
                color: "#00F0D4",
                fontSize: 16,
                fontWeight: 700
              }}
            >
              {genre}
            </div>
            <div
              style={{
                display: "flex",
                padding: "8px 16px",
                borderRadius: 6,
                background: "rgba(243,255,0,0.14)",
                border: "1px solid rgba(243,255,0,0.45)",
                color: "#F3FF00",
                fontSize: 16,
                fontWeight: 700
              }}
            >
              FREE IN BROWSER
            </div>
          </div>
        </div>

        {/* Center Title & Tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 20, color: "#00F0D4", fontWeight: 700, letterSpacing: "0.08em" }}>
            CREATED BY {creator.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 70,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#FFFFFF"
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 26,
              lineHeight: 1.38,
              color: "#B6C0D4",
              maxWidth: 1000
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Bottom AI Tools + Play CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {tools.map((tool) => (
              <div
                key={tool}
                style={{
                  display: "flex",
                  padding: "9px 16px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#E2E8F0",
                  fontSize: 17,
                  fontWeight: 700
                }}
              >
                #{tool}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              padding: "14px 28px",
              borderRadius: 10,
              background: "#F3FF00",
              color: "#07080B",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.05em"
            }}
          >
            PLAY NOW ▶
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
