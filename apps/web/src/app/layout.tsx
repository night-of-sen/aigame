import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-9713722525832645";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "SYNTHPLAY — Free AI & Indie HTML5 Browser Games Arcade",
    template: "%s | SYNTHPLAY"
  },
  description:
    "Play free HTML5, WebGL & AI-crafted browser games instantly with zero downloads. Indie & AI creators publish single-file HTML5 or ZIP games 100% free on isolated Cloudflare R2 sandboxes.",
  keywords: [
    "AI games",
    "free browser games",
    "HTML5 games",
    "WebGL games",
    "indie web arcade",
    "play AI generated games online",
    "free HTML5 game hosting",
    "Cursor AI games",
    "Claude artifact games",
    "SYNTHPLAY"
  ],
  authors: [{ name: "SYNTHPLAY", url: BASE_URL }],
  creator: "SYNTHPLAY",
  publisher: "SYNTHPLAY",
  category: "gaming",
  alternates: {
    canonical: BASE_URL
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "SYNTHPLAY",
    locale: "en_US",
    alternateLocale: ["zh_CN", "ja_JP", "ko_KR", "es_ES", "pt_BR"],
    title: "SYNTHPLAY — Play & Publish AI-Crafted HTML5 Games Free",
    description:
      "Instant free browser arcade for indie & AI-generated HTML5/WebGL games. Zero downloads, global leaderboards, and 100% free developer hosting."
  },
  twitter: {
    card: "summary_large_image",
    title: "SYNTHPLAY — Free AI & Indie HTML5 Browser Arcade",
    description:
      "Play free AI-crafted HTML5 & WebGL games in your browser with zero downloads, or publish your own game 100% free."
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
        <link rel="alternate" type="text/plain" title="LLMs.txt — AI Crawler Index" href="/llms.txt" />
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
