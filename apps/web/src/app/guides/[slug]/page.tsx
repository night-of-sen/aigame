import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadFullStore } from "@synthplay/db";
import { GUIDE_ARTICLES, getGuideBySlug } from "@/lib/guides";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getGuideBySlug(slug);
  if (!article) return { title: "Guide Not Found" };

  const canonical = `${BASE_URL}/guides/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonical,
      siteName: "SYNTHPLAY",
      type: "article",
      publishedTime: article.publishedAt
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description
    }
  };
}

export default async function GuideArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getGuideBySlug(slug);
  if (!article) notFound();

  const store = await loadFullStore();
  const recommendedGames = store.games.filter(
    (g) => g.status === "published" && article.recommendedGameSlugs.includes(g.slug)
  );
  const otherGuides = GUIDE_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);
  const canonical = `${BASE_URL}/guides/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        alternativeHeadline: article.titleZh,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
        url: canonical,
        keywords: article.keywords.join(", "),
        author: { "@type": "Organization", name: "SYNTHPLAY", url: BASE_URL },
        publisher: {
          "@type": "Organization",
          name: "SYNTHPLAY",
          logo: { "@type": "ImageObject", url: `${BASE_URL}/brand-logo.png` }
        }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "SYNTHPLAY", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE_URL}/guides` },
          { "@type": "ListItem", position: 3, name: article.title, item: canonical }
        ]
      }
    ]
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)", color: "var(--ink)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="sp-header">
        <div className="sp-header-inner">
          <Link href="/" className="sp-brand">
            <div className="sp-logo-mark">
              <img
                src="/brand-logo.png"
                alt="SYNTHPLAY"
                width={40}
                height={40}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>SYNTHPLAY</div>
              <div className="font-mono sp-brand-sub">← BACK TO ARCADE</div>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/guides" className="btn-steel sp-ctrl-pill font-mono" style={{ textDecoration: "none" }}>
              ALL GUIDES
            </Link>
            <Link href="/" className="btn-volt sp-signin-btn" style={{ textDecoration: "none" }}>
              PLAY FREE ▶
            </Link>
          </div>
        </div>
      </header>

      <main className="sp-container" style={{ maxWidth: 920, paddingTop: 38, paddingBottom: 76 }}>
        <article className="cab-surface" style={{ padding: "32px 28px" }}>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 10 }}>
            {article.category} · {article.readMinutes} MIN READ · PUBLISHED {article.publishedAt}
          </div>
          <h1 className="font-display" style={{ margin: "0 0 8px", fontSize: "clamp(1.7rem, 3.6vw, 2.5rem)", lineHeight: 1.15 }}>
            {article.title}
          </h1>
          <div style={{ fontSize: 14, color: "var(--cyan)", marginBottom: 18 }}>{article.titleZh}</div>
          <p style={{ fontSize: 15, color: "#d5dae6", lineHeight: 1.7, paddingBottom: 20, borderBottom: "1px solid var(--hairline)" }}>
            {article.description}
          </p>

          <div style={{ display: "grid", gap: 26, marginTop: 24 }}>
            {article.sections.map((sec) => (
              <section key={sec.heading}>
                <h2 className="font-display" style={{ margin: "0 0 12px", fontSize: 20, color: "var(--volt)" }}>
                  {sec.heading}
                </h2>
                <div style={{ display: "grid", gap: 12 }}>
                  {sec.body.map((para, idx) => (
                    <p key={idx} style={{ margin: 0, fontSize: 14.5, color: "#cfd5e3", lineHeight: 1.78 }}>
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        {/* Playable Games Mentioned in Guide */}
        {recommendedGames.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <div className="section-bar">
              <div>
                <div className="section-index">TRY INSTANTLY // ZERO DOWNLOADS</div>
                <h2 className="section-heading">PLAY FEATURED GAMES FROM THIS GUIDE</h2>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {recommendedGames.map((g) => (
                <Link key={g.id} href={`/games/${g.slug}`} className="arcade-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div className="arcade-card-img-wrap">
                    <img src={g.coverImage} alt={g.title} className="arcade-card-img" />
                    <div className="arcade-card-play-overlay">
                      <span className="font-mono" style={{ fontSize: 10, padding: "3px 7px", borderRadius: 4, background: "rgba(6,7,10,0.86)", color: "var(--cyan)" }}>
                        {g.category}
                      </span>
                      <span className="play-chip">PLAY ▶</span>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{g.title}</div>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>{g.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* More Guides */}
        <section style={{ marginTop: 36 }}>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)", marginBottom: 12 }}>
            MORE SYNTHPLAY GUIDES
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {otherGuides.map((og) => (
              <Link key={og.slug} href={`/guides/${og.slug}`} className="cab-surface" style={{ padding: 16, textDecoration: "none", color: "inherit" }}>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--volt)", marginBottom: 6 }}>{og.category}</div>
                <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{og.title}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
