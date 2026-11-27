import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-9713722525832645";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "SYNTHPLAY // Global Free & AI-Crafted Cyber Arcade",
    template: "%s"
  },
  description:
    "Play free browser HTML5, WebGL & AI-crafted games instantly. Compete on Global & Country Leaderboards, paste single-file AI HTML or upload HTML5 ZIP games in seconds.",
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "SYNTHPLAY",
    title: "SYNTHPLAY // Global Free & AI-Crafted Cyber Arcade",
    description: "Play free browser AI games instantly with zero downloads. Publish HTML5 ZIP or single-file AI games on zero-egress R2 sandboxes.",
    images: [{ url: "/games/tokyo-drift.jpg", width: 1280, height: 720, alt: "SYNTHPLAY Cyber Arcade" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "SYNTHPLAY // Global Free & AI-Crafted Cyber Arcade",
    description: "Free browser AI & indie HTML5 games. Global & Country Leaderboards.",
    images: ["/games/tokyo-drift.jpg"]
  }
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
        {ADSENSE_CLIENT.startsWith("ca-pub-") && (
          <>
            <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
              crossOrigin="anonymous"
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
