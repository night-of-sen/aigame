import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SYNTHPLAY // Global Free & AI-Crafted Cyber Arcade",
  description:
    "Play free browser HTML5, WebGL & AI-crafted games instantly. Compete on Global & Country Leaderboards, paste single-file AI HTML games to publish in 10 seconds."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
