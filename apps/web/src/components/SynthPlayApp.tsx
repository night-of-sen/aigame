"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { GameRecord, SponsorSlotRecord } from "@synthplay/db";
import { COUNTRIES, SUPPORTED_LOCALES, getCountryName, type Locale, t } from "@synthplay/i18n";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { ArcadeShaderBg } from "./ArcadeShaderBg";
import { ScrambleText } from "./ScrambleText";
import { ArcadeCabinetModal } from "./ArcadeCabinetModal";
import { StudioView } from "./StudioView";
import { DashboardView } from "./DashboardView";
import { SponsorView } from "./SponsorView";
import { CyberBootLoader, CyberPageShutter } from "./CyberBootLoader";
import { GameCardLivePreview } from "./GameCardLivePreview";
import { AuthModal, type AuthUserSummary } from "./AuthModal";
import { AdSenseSlot } from "./AdSenseSlot";
import { IconCpu, IconGlobe, IconPlay, IconSpark, IconTrophy, IconUpload, IconVolume } from "./Icons";

interface CountryRankItem {
  countryCode: string;
  totalPlays: number;
  gameCount: number;
  avgRating: number;
}

interface InitialData {
  games: GameRecord[];
  topPlayed: GameRecord[];
  countryPower: CountryRankItem[];
  aiNative: GameRecord[];
  sponsorSlots: SponsorSlotRecord[];
  monthlyFundingGoalUsd: number;
  monthlyFundingRaisedUsd: number;
  initialLocale: Locale;
  googleAuthEnabled: boolean;
  currentUser: AuthUserSummary | null;
}

export function SynthPlayApp({ initial }: { initial: InitialData }) {
  const [view, setView] = useState<"arcade" | "studio" | "dashboard" | "sponsor">("arcade");
  const [shutter, setShutter] = useState<{ active: boolean; label: string }>({ active: false, label: "" });
  const [locale, setLocale] = useState<Locale>(initial.initialLocale || "en");
  const [quality, setQuality] = useState<"ultra" | "balanced" | "lite">("ultra");
  const [sfxOn, setSfxOn] = useState(false);
  const [fps, setFps] = useState(60);

  const [currentUser, setCurrentUser] = useState<AuthUserSummary | null>(initial.currentUser);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [games, setGames] = useState<GameRecord[]>(initial.games);
  const [topPlayed, setTopPlayed] = useState<GameRecord[]>(initial.topPlayed);
  const [countryPower, setCountryPower] = useState<CountryRankItem[]>(initial.countryPower);
  const [aiNative, setAiNative] = useState<GameRecord[]>(initial.aiNative);
  const [sponsorSlots, setSponsorSlots] = useState<SponsorSlotRecord[]>(initial.sponsorSlots);
  const [fundingGoal, setFundingGoal] = useState(initial.monthlyFundingGoalUsd);
  const [fundingRaised, setFundingRaised] = useState(initial.monthlyFundingRaisedUsd);

  const [country, setCountry] = useState("ALL");
  const [catalogFilter, setCatalogFilter] = useState<"ALL" | "AI" | "WEBGL" | "SINGLE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchEngine, setSearchEngine] = useState<"meilisearch" | "local" | null>(null);
  const [searchHits, setSearchHits] = useState<GameRecord[] | null>(null);
  const [rankTab, setRankTab] = useState<"play" | "country" | "ai">("play");
  const [isSyncing, setIsSyncing] = useState(false);

  const [heroIdx, setHeroIdx] = useState(0);
  const [heroSwitching, setHeroSwitching] = useState(false);
  const [heroOffset, setHeroOffset] = useState({ x: 0, y: 0 });
  const [hoverAccent, setHoverAccent] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<GameRecord | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchHits(null);
      setSearchEngine(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&country=${encodeURIComponent(country)}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.games)) {
            setSearchHits(d.games);
            setSearchEngine(d.engine || "local");
          }
        })
        .catch(() => {});
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery, country]);

  const publishedGames = (searchHits ?? games).filter((g) => g.status === "published");
  const featuredList = games.filter((g) => g.status === "published").slice(0, 6);
  const heroGame = featuredList[heroIdx % Math.max(1, featuredList.length)] ?? featuredList[0];

  const triggerHeroSwitch = useCallback((nextIdx: number) => {
    setHeroSwitching(true);
    setHeroIdx(nextIdx);
    setTimeout(() => setHeroSwitching(false), 380);
  }, []);

  // Switch page view with snappy Cyberpunk Laser Shutter transition
  const navigateView = (nextView: "arcade" | "studio" | "dashboard" | "sponsor", label: string) => {
    if (nextView === view) return;
    arcadeAudio.playSwitch();
    setShutter({ active: true, label });
    setTimeout(() => {
      setView(nextView);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, 180);
    setTimeout(() => {
      setShutter({ active: false, label: "" });
    }, 430);
  };

  // Auto-cycle Hero Featured Cabinet every 7s
  useEffect(() => {
    if (view !== "arcade" || activeGame || featuredList.length < 2) return;
    const timer = setInterval(() => {
      triggerHeroSwitch((heroIdx + 1) % featuredList.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [view, activeGame, featuredList.length, heroIdx, triggerHeroSwitch]);

  const refreshData = useCallback(async (selectedCountry = country) => {
    setIsSyncing(true);
    try {
      const [gRes, rRes, sRes] = await Promise.all([
        fetch(`/api/games?country=${selectedCountry}&filter=${catalogFilter}`),
        fetch(`/api/rankings?country=${selectedCountry}`),
        fetch("/api/sponsors")
      ]);
      const [gData, rData, sData] = await Promise.all([gRes.json(), rRes.json(), sRes.json()]);
      if (gData.games) setGames(gData.games);
      if (rData.topPlayed) setTopPlayed(rData.topPlayed);
      if (rData.countryPower) setCountryPower(rData.countryPower);
      if (rData.aiNative) setAiNative(rData.aiNative);
      if (sData.slots) setSponsorSlots(sData.slots);
      if (typeof sData.monthlyFundingRaisedUsd === "number") setFundingRaised(sData.monthlyFundingRaisedUsd);
      if (typeof sData.monthlyFundingGoalUsd === "number") setFundingGoal(sData.monthlyFundingGoalUsd);
    } catch {
      // Keep existing state on transient error
    } finally {
      setTimeout(() => setIsSyncing(false), 260);
    }
  }, [catalogFilter, country]);

  useEffect(() => {
    refreshData(country);
  }, [country, catalogFilter, refreshData]);

  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    arcadeAudio.enabled = next;
    if (next) arcadeAudio.playCoin();
  };

  const launchGame = (game: GameRecord) => {
    arcadeAudio.playCoin();
    setHoveredCardId(null);
    setActiveGame(game);
  };

  // 3D perspective tilt + specular light sheen on game cards
  const handleCardMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--mx", `${rx * 100}%`);
    el.style.setProperty("--my", `${ry * 100}%`);
    if (quality !== "lite") {
      const tiltY = (rx - 0.5) * 10;
      const tiltX = (0.5 - ry) * 9;
      el.style.transform = `perspective(920px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px)`;
    }
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "";
    setHoverAccent(null);
    setHoveredCardId(null);
  };

  const handleHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    if (quality === "lite") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setHeroOffset({ x: -nx * 24, y: -ny * 16 });
  };

  const marqueeSponsors = sponsorSlots.filter((s) => s.placement === "hero_marquee" || s.placement === "hall_diamond");
  const diamondSponsors = sponsorSlots.filter((s) => s.placement === "hall_diamond");
  const goldSponsors = sponsorSlots.filter((s) => s.placement === "hall_gold");
  const fundingPct = Math.min(100, Math.round((fundingRaised / Math.max(1, fundingGoal)) * 100));

  const activeAccent = hoverAccent || heroGame?.accentColor || "#F3FF00";

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Cyberpunk Neural Boot Curtain & View-Switch Laser Shutter */}
      <CyberBootLoader />
      <CyberPageShutter active={shutter.active} label={shutter.label} />

      {/* Full-Bleed WebGL GLSL Fluid Shader + Kinetic Spark & Reticle Canvas */}
      <ArcadeShaderBg
        accentHex={activeAccent}
        paused={Boolean(activeGame)}
        quality={quality}
        onFps={setFps}
      />

      {/* Sticky Hardware Navigation Header */}
      <header className="sp-header">
        <div className="sp-header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <button
              type="button"
              className="sp-brand"
              style={{ background: "none", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}
              onClick={() => navigateView("arcade", "ARCADE HALL")}
            >
              <div className="sp-logo-mark">SP</div>
              <div>
                <div className="font-display" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1, color: "#fff" }}>
                  SYNTHPLAY
                </div>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--volt)", letterSpacing: "0.1em", marginTop: 2 }}>
                  SYNTHPLAY.GAMES // FREE AI ARCADE
                </div>
              </div>
            </button>

            <nav className="sp-nav" aria-label="Main navigation">
              <button
                type="button"
                className={`sp-nav-link ${view === "arcade" ? "active" : ""}`}
                onClick={() => navigateView("arcade", "ARCADE HALL")}
              >
                {t(locale, "navArcade")}
              </button>
              <button
                type="button"
                className={`sp-nav-link ${view === "studio" ? "active" : ""}`}
                onClick={() => navigateView("studio", "UPLOAD BAY")}
              >
                {t(locale, "navStudio")}
              </button>
              <button
                type="button"
                className={`sp-nav-link ${view === "dashboard" ? "active" : ""}`}
                onClick={() => navigateView("dashboard", "CREATOR STUDIO")}
              >
                {t(locale, "navDashboard")}
              </button>
              <button
                type="button"
                className={`sp-nav-link ${view === "sponsor" ? "active" : ""}`}
                onClick={() => navigateView("sponsor", "SPONSOR HUB")}
              >
                {t(locale, "navSponsor")}
              </button>
              <a
                href={process.env.NEXT_PUBLIC_ADMIN_DOMAIN || "http://localhost:3001"}
                target="_blank"
                rel="noreferrer"
                className="sp-nav-link"
                style={{ color: "var(--cyan)" }}
              >
                {t(locale, "navAdmin")} ↗
              </a>
            </nav>
          </div>

          {/* Right Controls: Locale, SFX, Quality Tier, Live GPU Telemetry */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", border: "1px solid var(--hairline)", borderRadius: 6, overflow: "hidden" }}>
              {SUPPORTED_LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    arcadeAudio.playSwitch();
                    setLocale(l.code);
                    document.cookie = `synthplay_locale=${l.code}; path=/; max-age=31536000; samesite=lax`;
                  }}
                  className="font-mono"
                  style={{
                    padding: "5px 8px",
                    fontSize: 11,
                    border: 0,
                    cursor: "pointer",
                    background: locale === l.code ? "var(--volt)" : "transparent",
                    color: locale === l.code ? "#07080b" : "var(--ink-muted)",
                    fontWeight: locale === l.code ? 700 : 400,
                    transition: "all 0.15s ease"
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleSfx}
              className="btn-steel font-mono"
              style={{ padding: "6px 10px", fontSize: 11, color: sfxOn ? "var(--volt)" : "var(--ink-muted)" }}
              title="Arcade Web Audio SFX"
            >
              <IconVolume on={sfxOn} size={14} />
              <span>{sfxOn ? t(locale, "audioOn") : t(locale, "audioOff")}</span>
            </button>

            <select
              aria-label="Graphics Quality Tier"
              value={quality}
              onChange={(e) => setQuality(e.target.value as "ultra" | "balanced" | "lite")}
              className="sp-select font-mono"
              style={{ width: "auto", padding: "6px 10px", fontSize: 11 }}
            >
              <option value="ultra">GPU: ULTRA</option>
              <option value="balanced">GPU: BALANCED</option>
              <option value="lite">GPU: LITE</option>
            </select>

            <div
              className="font-mono"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 11,
                border: `1px solid ${activeGame ? "var(--amber)" : "rgba(0,240,212,0.4)"}`,
                background: activeGame ? "rgba(255,159,28,0.12)" : "rgba(0,240,212,0.08)",
                color: activeGame ? "var(--amber)" : "var(--cyan)",
                boxShadow: activeGame ? "none" : "0 0 14px rgba(0,240,212,0.15)"
              }}
            >
              <IconCpu size={13} />
              <span>{activeGame ? "BG PAUSED" : `${fps} FPS`}</span>
            </div>

            {currentUser ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  className="btn-steel font-mono"
                  style={{ padding: "6px 10px", fontSize: 11, borderColor: "rgba(243,255,0,0.45)", color: "var(--volt)" }}
                  onClick={() => navigateView("dashboard", "CREATOR STUDIO")}
                >
                  <span>@{currentUser.username} [{currentUser.countryCode}]</span>
                </button>
                <button
                  type="button"
                  className="btn-steel font-mono"
                  style={{ padding: "6px 8px", fontSize: 10 }}
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setCurrentUser(null);
                  }}
                >
                  <span>EXIT</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-volt"
                style={{ padding: "7px 14px", fontSize: 11 }}
                onClick={() => setAuthModalOpen(true)}
              >
                <span>{t(locale, "authSignInBtn")}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ACTIVE VIEW ROUTER */}
      {view === "studio" && (
        <StudioView
          locale={locale}
          onUploaded={(newGame) => {
            setGames((prev) => [newGame, ...prev]);
            refreshData(country);
          }}
        />
      )}

      {view === "dashboard" && (
        <DashboardView locale={locale} onPlayGame={launchGame} />
      )}

      {view === "sponsor" && (
        <SponsorView
          locale={locale}
          onOrderCreated={() => {
            refreshData(country);
          }}
        />
      )}

      {view === "arcade" && heroGame && (
        <>
          {/* FULL-BLEED KINETIC HERO STAGE */}
          <section className="hero-stage" onMouseMove={handleHeroMove}>
            <div
              className={`hero-art-layer ${heroSwitching ? "is-switching" : ""}`}
              style={{ transform: `translate3d(${heroOffset.x}px, ${heroOffset.y}px, 0)` }}
            >
              <img src={heroGame.coverImage} alt={heroGame.title} className="hero-art-img" />
            </div>
            <div className="hero-scrim" />
            <div className="hero-scan-sweep" />

            <div className="hero-content">
              <div className="hero-grid">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="cyber-eq" aria-hidden="true">
                      <span /><span /><span /><span /><span />
                    </div>
                    <div className="font-mono" style={{ fontSize: 12, color: "var(--volt)", letterSpacing: "0.14em" }}>
                      {t(locale, "heroKicker")} // [{heroGame.creatorCountryCode}] {heroGame.category}
                    </div>
                  </div>
                  <h1 className="hero-title">
                    <ScrambleText text={heroGame.title} />
                  </h1>
                  <p style={{ maxWidth: 620, fontSize: 15, lineHeight: 1.65, color: "#d5dae6", margin: "0 0 18px" }}>
                    {heroGame.translations?.[locale]?.tagline || (locale === "zh-CN" ? heroGame.taglineZh : heroGame.tagline)}
                  </p>

                  {/* AI Toolchain Metadata Strip */}
                  <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24, fontSize: 11 }}>
                    <span style={{ padding: "5px 10px", borderRadius: 5, background: "rgba(255,255,255,0.08)", border: "1px solid var(--hairline-strong)" }}>
                      CREATOR: {heroGame.creatorName} [{heroGame.creatorCountryCode}]
                    </span>
                    <span style={{ padding: "5px 10px", borderRadius: 5, background: "rgba(0,240,212,0.12)", border: "1px solid rgba(0,240,212,0.45)", color: "var(--cyan)" }}>
                      PLAYS: {heroGame.totalValidPlays.toLocaleString()}
                    </span>
                    {heroGame.aiTools.map((tool) => (
                      <span key={tool} style={{ padding: "5px 10px", borderRadius: 5, background: "rgba(243,255,0,0.1)", border: "1px solid rgba(243,255,0,0.35)", color: "var(--volt)" }}>
                        {tool}
                      </span>
                    ))}
                  </div>

                  {/* Tactile Kinetic Arcade CTAs */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                    <button type="button" className="btn-volt" onClick={() => launchGame(heroGame)}>
                      <IconPlay size={16} />
                      <span>{t(locale, "heroCtaPlay")}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-steel"
                      onClick={() => navigateView("studio", "UPLOAD BAY")}
                    >
                      <IconUpload size={15} />
                      <span>{t(locale, "heroCtaUpload")}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-crimson"
                      onClick={() => navigateView("sponsor", "SPONSOR HUB")}
                    >
                      <IconSpark size={15} />
                      <span>{t(locale, "heroCtaSponsor")}</span>
                    </button>
                  </div>
                </div>

                {/* Right Cabinet Telemetry Block with Rotating Neon Energy Perimeter */}
                <div className="cab-energy-border" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                      LIVE NETWORK TELEMETRY
                    </span>
                    <span className="font-mono" style={{ fontSize: 10, color: "var(--cyan)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="rec-dot" style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />
                      ONLINE
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ borderLeft: "2px solid var(--volt)", paddingLeft: 12 }}>
                      <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>
                        {publishedGames.reduce((acc, g) => acc + g.totalValidPlays, 0).toLocaleString()}
                      </div>
                      <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>VERIFIED PLAYS</div>
                    </div>
                    <div style={{ borderLeft: "2px solid var(--cyan)", paddingLeft: 12 }}>
                      <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--cyan)" }}>
                        {countryPower.length} NATIONS
                      </div>
                      <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>ACTIVE CREATORS</div>
                    </div>
                  </div>
                  <div className="font-mono" style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--hairline)", fontSize: 11, color: "var(--ink-muted)" }}>
                    SANDBOX ORIGIN: <span style={{ color: "var(--volt)" }}>*.synthplay-box.cloud</span> · 0 EGRESS R2 CDN
                  </div>
                </div>
              </div>

              {/* Interactive 6-Cabinet Filmstrip Selector Dock */}
              <div className="hero-dock">
                {featuredList.map((g, idx) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`dock-item ${idx === heroIdx ? "active" : ""}`}
                    onMouseEnter={() => {
                      arcadeAudio.playHover();
                      setHoverAccent(g.accentColor);
                    }}
                    onMouseLeave={() => setHoverAccent(null)}
                    onClick={() => {
                      arcadeAudio.playSwitch();
                      triggerHeroSwitch(idx);
                    }}
                  >
                    <img src={g.coverImage} alt={g.title} className="dock-thumb" />
                    <div style={{ padding: "7px 9px" }}>
                      <div className="font-display" style={{ fontSize: 11, fontWeight: 700, color: idx === heroIdx ? "var(--volt)" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {g.title}
                      </div>
                      <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
                        [{g.creatorCountryCode}] · {g.category}
                      </div>
                    </div>
                    <div className="dock-progress" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SPONSOR SHOWCASE SLOT #1: INDUSTRIAL LED MARQUEE + PLASMA FUNDING METER */}
          <div className="led-strip">
            <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(300px, 0.9fr)", alignItems: "center" }}>
              <div style={{ overflow: "hidden", padding: "13px 0", borderRight: "1px solid var(--hairline)" }}>
                <div className="led-marquee">
                  {marqueeSponsors.length > 0
                    ? [...marqueeSponsors, ...marqueeSponsors, ...marqueeSponsors].map((sp, i) => (
                        <a
                          key={`${sp.id}-${i}`}
                          href={sp.targetUrl}
                          onClick={(e) => {
                            e.preventDefault();
                            navigateView("sponsor", "SPONSOR HUB");
                          }}
                          className="font-mono"
                          style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "0 28px", fontSize: 12, whiteSpace: "nowrap" }}
                        >
                          <span style={{ padding: "2px 7px", borderRadius: 4, background: "var(--volt)", color: "#07080b", fontWeight: 700, fontSize: 10 }}>
                            {sp.badgeLabel}
                          </span>
                          <strong style={{ color: "#fff" }}>{sp.brandName}</strong>
                          <span style={{ color: "var(--ink-muted)" }}>{sp.tagline}</span>
                          <span style={{ color: "var(--vermilion)" }}>///</span>
                        </a>
                      ))
                    : [0, 1, 2].map((repeatIdx) => (
                        <React.Fragment key={`open-ticker-${repeatIdx}`}>
                          <button
                            type="button"
                            onClick={() => navigateView("studio", "DEV STUDIO")}
                            className="font-mono"
                            style={{ background: "none", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 12, padding: "0 28px", fontSize: 12, whiteSpace: "nowrap" }}
                          >
                            <span style={{ padding: "2px 7px", borderRadius: 4, background: "var(--cyan)", color: "#07080b", fontWeight: 700, fontSize: 10 }}>
                              FREE HOSTING
                            </span>
                            <strong style={{ color: "#fff" }}>INDIE &amp; AI HTML5 ARCADE</strong>
                            <span style={{ color: "var(--ink-muted)" }}>Upload single-file HTML5 or ZIP games 100% free on Cloudflare R2</span>
                            <span style={{ color: "var(--vermilion)" }}>///</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateView("sponsor", "SPONSOR HUB")}
                            className="font-mono"
                            style={{ background: "none", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 12, padding: "0 28px", fontSize: 12, whiteSpace: "nowrap" }}
                          >
                            <span style={{ padding: "2px 7px", borderRadius: 4, background: "var(--volt)", color: "#07080b", fontWeight: 700, fontSize: 10 }}>
                              OPEN SPOTLIGHT
                            </span>
                            <strong style={{ color: "#fff" }}>FEATURE YOUR INDIE GAME ($29 / 7 DAYS)</strong>
                            <span style={{ color: "var(--ink-muted)" }}>Or go 100% Ad-Free Supporter ($3/mo via Patreon &amp; Ko-fi)</span>
                            <span style={{ color: "var(--vermilion)" }}>///</span>
                          </button>
                        </React.Fragment>
                      ))}
                </div>
              </div>

              {/* Monthly Edge CDN & AI Game Jam Plasma Funding Bar */}
              <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 6 }}>
                    <span style={{ color: "var(--ink-muted)" }}>{t(locale, "fundingTitle")}</span>
                    <span style={{ color: "var(--volt)", fontWeight: 700 }}>${fundingRaised} / ${fundingGoal} ({fundingPct}%)</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: "#1a1f2e", overflow: "hidden" }}>
                    <div className="plasma-bar-fill" style={{ width: `${fundingPct}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-steel font-mono"
                  style={{ padding: "6px 12px", fontSize: 11, flexShrink: 0 }}
                  onClick={() => navigateView("sponsor", "SPONSOR HUB")}
                >
                  <span>{t(locale, "fundingAction")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* MAIN WORKSPACE: COUNTRY FILTER + HOVER-VIDEO GAME WALL + DUAL LIVE LEADERBOARDS */}
          <main className="sp-container" style={{ paddingTop: 42, paddingBottom: 76 }}>
            {/* Country Classification Filter Bar */}
            <div className="section-bar">
              <div>
                <div className="section-index">01 // NATION CLASSIFICATION &amp; LIVE VIDEO DISCOVERY</div>
                <h2 className="section-heading" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <IconGlobe size={22} />
                  <span>{t(locale, "countrySectionTitle")}</span>
                </h2>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                {isSyncing && (
                  <div className="cyber-loader-bar font-mono">
                    <span className="cyber-radar-spinner" />
                    <span>SYNCING NODES...</span>
                  </div>
                )}
                {(["ALL", "AI", "WEBGL", "SINGLE"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`country-btn ${catalogFilter === f ? "active" : ""}`}
                    onClick={() => { arcadeAudio.playSwitch(); setCatalogFilter(f); }}
                  >
                    {f === "ALL"
                      ? t(locale, "catalogFilterAll")
                      : f === "AI"
                        ? t(locale, "catalogFilterAi")
                        : f === "WEBGL"
                          ? t(locale, "catalogFilterWebgl")
                          : t(locale, "catalogFilterSingle")}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 460 }}>
                <input
                  type="search"
                  className="sp-input font-mono"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH GAMES, AI TOOLS, CREATORS (EN / 中文 / 日本語 / 한국어)..."
                  style={{ fontSize: 12, paddingRight: searchQuery ? 96 : 14 }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="font-mono"
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid var(--hairline)",
                      color: "var(--volt)",
                      fontSize: 10,
                      padding: "3px 8px",
                      cursor: "pointer"
                    }}
                  >
                    CLEAR ✕
                  </button>
                )}
              </div>
              {searchEngine && (
                <span className="font-mono" style={{ fontSize: 10, color: searchEngine === "meilisearch" ? "var(--cyan)" : "var(--ink-muted)", border: "1px solid var(--hairline)", padding: "4px 8px" }}>
                  ENGINE: {searchEngine.toUpperCase()} ({publishedGames.length} HITS)
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`country-btn ${country === c.code ? "active" : ""}`}
                  onClick={() => { arcadeAudio.playSwitch(); setCountry(c.code); }}
                >
                  <span>[{c.flag}]</span>
                  <span>{getCountryName(c.code, locale)}</span>
                </button>
              ))}
            </div>

            {/* Split Grid: Left Game Catalog / Right Live Leaderboards */}
            <div className="arcade-main-grid">
              <div>
                <div className="catalog-grid">
                  {publishedGames.map((g, idx) => {
                    const isHovered = hoveredCardId === g.id;
                    return (
                      <article
                        key={g.id}
                        className="arcade-card"
                        style={{ animationDelay: `${idx * 65}ms` }}
                        onMouseMove={handleCardMouseMove}
                        onMouseEnter={() => {
                          arcadeAudio.playHover();
                          setHoverAccent(g.accentColor);
                          setHoveredCardId(g.id);
                        }}
                        onMouseLeave={handleCardMouseLeave}
                        onClick={() => launchGame(g)}
                      >
                        <div className="arcade-card-img-wrap">
                          <img src={g.coverImage} alt={g.title} className="arcade-card-img" />

                          {/* REAL-TIME 60FPS HOVER GAMEPLAY VIDEO PREVIEW */}
                          <GameCardLivePreview
                            category={g.category}
                            accentColor={g.accentColor}
                            active={isHovered && quality !== "lite"}
                            paused={Boolean(activeGame)}
                          />

                          <div className="arcade-card-play-overlay">
                            <div className="font-mono" style={{ display: "flex", gap: 6, fontSize: 10 }}>
                              <span style={{ padding: "3px 7px", borderRadius: 4, background: "rgba(6,7,10,0.86)", border: "1px solid var(--hairline-strong)", color: "#fff" }}>
                                {g.creatorCountryCode}
                              </span>
                              <span style={{ padding: "3px 7px", borderRadius: 4, background: "rgba(6,7,10,0.86)", border: "1px solid rgba(0,240,212,0.5)", color: "var(--cyan)" }}>
                                {t(locale, "freeOnline")}
                              </span>
                            </div>
                            <span className="play-chip">{t(locale, "playNow")} ▶</span>
                          </div>
                        </div>

                        <div style={{ padding: "15px 17px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                            <h3 className="font-display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isHovered ? "var(--volt)" : "#fff", transition: "color 0.2s ease" }}>
                              {g.translations?.[locale]?.title || (locale === "zh-CN" ? `${g.title} · ${g.titleZh}` : g.title)}
                            </h3>
                            <span className="font-mono" style={{ fontSize: 12, color: "var(--volt)", flexShrink: 0 }}>
                              ★ {g.rating.toFixed(2)}
                            </span>
                          </div>

                          <p style={{ fontSize: 12.5, color: "var(--ink-muted)", margin: "8px 0 12px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {g.translations?.[locale]?.tagline || (locale === "zh-CN" ? g.taglineZh : g.tagline)}
                          </p>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--hairline)", fontSize: 11, gap: 8 }}>
                            <div className="font-mono" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {g.aiTools.slice(0, 2).map((tool) => (
                                <span key={tool} style={{ color: "var(--ink-muted)" }}>#{tool}</span>
                              ))}
                            </div>
                            <div className="font-mono" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                              <Link
                                href={`/games/${g.slug}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: "var(--cyan)", textDecoration: "underline" }}
                              >
                                {locale === "zh-CN" ? "详情/评价" : "REVIEWS"}
                              </Link>
                              <span style={{ color: "#fff", fontWeight: 700 }}>
                                {g.totalValidPlays.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live Dual Leaderboard Engine with Rotating Neon Perimeter */}
              <aside className="cab-energy-border" style={{ padding: 20, position: "sticky", top: 90 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div className="font-display" style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <IconTrophy size={18} />
                    <span>{t(locale, "rankingsTitle")}</span>
                  </div>
                  <span className="font-mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(0,240,212,0.45)", color: "var(--cyan)", boxShadow: "0 0 12px rgba(0,240,212,0.16)" }}>
                    REDIS LIVE
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
                  {(
                    [
                      ["play", t(locale, "rankTabPlays")],
                      ["country", t(locale, "rankTabCountries")],
                      ["ai", t(locale, "rankTabAi")]
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { arcadeAudio.playSwitch(); setRankTab(key); }}
                      className="font-mono"
                      style={{
                        padding: "8px 6px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        border: "1px solid var(--hairline)",
                        cursor: "pointer",
                        background: rankTab === key ? "var(--volt)" : "#0a0c12",
                        color: rankTab === key ? "#07080b" : "var(--ink-muted)",
                        boxShadow: rankTab === key ? "0 0 18px rgba(243,255,0,0.38)" : "none",
                        transition: "all 0.18s ease"
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {rankTab === "country"
                    ? countryPower.map((c, idx) => {
                        const maxPlays = Math.max(1, countryPower[0]?.totalPlays || 1);
                        const pct = Math.round((c.totalPlays / maxPlays) * 100);
                        return (
                          <div
                            key={c.countryCode}
                            className="rank-row"
                            style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
                            onClick={() => { arcadeAudio.playSwitch(); setCountry(c.countryCode); }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className={`rank-num ${idx === 0 ? "top-1" : idx === 1 ? "top-2" : idx === 2 ? "top-3" : ""}`}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>
                                    [{c.countryCode}] {getCountryName(c.countryCode, locale)}
                                  </div>
                                  <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
                                    {c.gameCount} TITLES · AVG ★ {c.avgRating}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono" style={{ fontSize: 12, color: "var(--volt)", fontWeight: 700 }}>
                                {c.totalPlays.toLocaleString()}
                              </span>
                            </div>
                            <div style={{ height: 5, borderRadius: 99, background: "#1e2334", overflow: "hidden" }}>
                              <div className="plasma-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    : (rankTab === "ai" ? aiNative : topPlayed).map((g, idx) => (
                        <div key={g.id} className="rank-row" onClick={() => launchGame(g)}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <span className={`rank-num ${idx === 0 ? "top-1" : idx === 1 ? "top-2" : idx === 2 ? "top-3" : ""}`}>
                              {idx + 1}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {g.title}
                              </div>
                              <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
                                [{g.creatorCountryCode}] {g.aiTools[0] || g.category}
                              </div>
                            </div>
                          </div>
                          <div className="font-mono" style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan)" }}>
                              {(country !== "ALL" && rankTab === "play"
                                ? g.countryPlays[country] ?? g.totalValidPlays
                                : g.totalValidPlays
                              ).toLocaleString()}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--volt)" }}>★ {g.rating.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                </div>
              </aside>
            </div>

            <AdSenseSlot
              slotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HALL}
              isProSupporter={Boolean(currentUser?.isProSupporter)}
              onOpenSponsor={() => navigateView("sponsor", "SPONSOR HUB")}
              label="ARCADE HALL SPONSOR"
            />

            {/* SPONSOR SHOWCASE SLOT #2: HALL OF PATRONS */}
            <section style={{ marginTop: 68 }}>
              <div className="section-bar">
                <div>
                  <div className="section-index">02 // DEDICATED SPONSOR SHOWCASE · SLOT #2</div>
                  <h2 className="section-heading">{t(locale, "hallTitle")}</h2>
                  <p style={{ color: "var(--ink-muted)", fontSize: 13, marginTop: 6 }}>{t(locale, "hallSub")}</p>
                </div>
                <button type="button" className="btn-volt" onClick={() => navigateView("sponsor", "SPONSOR HUB")}>
                  <IconSpark size={15} />
                  <span>{t(locale, "hallCta")}</span>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20 }}>
                {diamondSponsors.map((sp) => (
                  <div
                    key={sp.id}
                    className="cab-energy-border"
                    style={{ padding: 24 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <span className="font-mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "var(--volt)", color: "#07080b", fontWeight: 700 }}>
                        {sp.badgeLabel}
                      </span>
                      <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>[{sp.countryCode}] · {sp.provider.toUpperCase()}</span>
                    </div>
                    <div className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{sp.brandName}</div>
                    <p style={{ fontSize: 13, color: "#cfd5e3", lineHeight: 1.55, margin: "0 0 14px" }}>{sp.tagline}</p>
                    <span className="font-mono" style={{ fontSize: 11, color: "var(--volt)" }}>OFFICIAL TITLE PARTNER ↗</span>
                  </div>
                ))}

                {goldSponsors.map((sp) => (
                  <div key={sp.id} className="cab-surface" style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <span className="font-mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(0,240,212,0.14)", border: "1px solid rgba(0,240,212,0.4)", color: "var(--cyan)", fontWeight: 700 }}>
                        {sp.badgeLabel}
                      </span>
                      <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>[{sp.countryCode}] · {sp.provider.toUpperCase()}</span>
                    </div>
                    <div className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{sp.brandName}</div>
                    <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.55, margin: 0 }}>{sp.tagline}</p>
                  </div>
                ))}

                {/* Open Commercial Slot CTA */}
                <div
                  className="cab-surface"
                  onClick={() => navigateView("sponsor", "SPONSOR HUB")}
                  style={{
                    padding: 24,
                    borderStyle: "dashed",
                    borderColor: "rgba(243,255,0,0.38)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <div className="font-mono" style={{ fontSize: 11, color: "var(--vermilion)", marginBottom: 6 }}>OPEN COMMUNITY SPOTLIGHT</div>
                  <div className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>FEATURE YOUR INDIE GAME OR STUDIO</div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-muted)", margin: 0 }}>
                    Feature your indie/AI game ($29/7d) or become a $3/mo Ad-Free Supporter via Ko-fi &amp; Patreon.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </>
      )}

      {/* Full-Theater Playable Game Modal */}
      {activeGame && (
        <ArcadeCabinetModal
          game={activeGame}
          playerCountry={country}
          onClose={() => setActiveGame(null)}
          onPlayCounted={(gameId, newTotal) => {
            setGames((prev) =>
              prev.map((g) => (g.id === gameId ? { ...g, totalValidPlays: newTotal } : g))
            );
            refreshData(country);
          }}
          onOpenSponsor={() => navigateView("sponsor", "SPONSOR HUB")}
        />
      )}

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          locale={locale}
          googleEnabled={initial.googleAuthEnabled}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={(u) => setCurrentUser(u)}
        />
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--hairline)", padding: "24px", position: "relative", zIndex: 10, background: "rgba(6,7,10,0.92)" }}>
        <div className="sp-container font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 11, color: "var(--ink-muted)", padding: 0 }}>
          <span>SYNTHPLAY // SYNTHPLAY.GAMES · SANDBOX: *.SYNTHPLAY-BOX.CLOUD</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
            <a href="/about" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>ABOUT</a>
            <a href="/privacy" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>PRIVACY POLICY</a>
            <a href="/terms" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>TERMS OF SERVICE</a>
            <a href="mailto:support@synthplay.games" style={{ color: "var(--cyan)", textDecoration: "none" }}>support@synthplay.games</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
