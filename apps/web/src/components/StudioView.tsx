"use client";

import React, { useRef, useState } from "react";
import { type Locale, t } from "@synthplay/i18n";
import type { GameRecord } from "@synthplay/db";
import { IconPlay, IconShield, IconUpload } from "./Icons";
import { AiToolsShelf } from "./AiToolsShelf";
import { TurnstileWidget } from "./TurnstileWidget";
import type { AuthUserSummary } from "./AuthModal";

const SAMPLE_AI_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{margin:0;background:#07080b;color:#f3ff00;font-family:monospace;overflow:hidden;display:grid;place-items:center;height:100vh;}
canvas{border:1px solid #f3ff00;background:#0b0d13;max-width:100%;max-height:100%;}
</style></head>
<body>
<canvas id="c" width="640" height="360"></canvas>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');
let px=320,py=300,score=0,orbs=[{x:200,y:60},{x:460,y:120}];
function setX(clientX){const r=c.getBoundingClientRect();px=(clientX-r.left)*(c.width/r.width);}
c.addEventListener('mousemove',e=>setX(e.clientX));
c.addEventListener('touchmove',e=>{if(e.touches[0])setX(e.touches[0].clientX);},{passive:true});
function loop(){
  x.fillStyle='rgba(7,8,11,0.28)';x.fillRect(0,0,640,360);
  x.fillStyle='#f3ff00';x.fillRect(px-28,py,56,10);
  orbs.forEach(o=>{
    o.y+=3.2;if(o.y>360){o.y=0;o.x=30+Math.random()*580;}
    if(Math.abs(o.x-px)<34 && Math.abs(o.y-py)<14){score+=100;o.y=0;o.x=30+Math.random()*580;if(window.SynthPlay)window.SynthPlay.submitScore(score);}
    x.fillStyle='#00f0d4';x.beginPath();x.arc(o.x,o.y,8,0,6.28);x.fill();
  });
  x.fillStyle='#fff';x.fillText('AI SINGLE-HTML SANDBOX DEMO // SCORE: '+score,16,24);
  requestAnimationFrame(loop);
}
loop();
</script>
</body>
</html>`;

const CATEGORIES = [
  { value: "FPS", label: "3D FPS / SHOOTER" },
  { value: "RACING", label: "RACING / DRIFT" },
  { value: "ARCADE", label: "ARCADE" },
  { value: "PUZZLE", label: "PUZZLE" },
  { value: "SURVIVAL", label: "SURVIVAL / ROGUELITE" },
  { value: "BRICK", label: "BRICK BREAKER" },
  { value: "SHMUP", label: "SHMUP / BULLET HELL" },
  { value: "ROGUELIKE", label: "ROGUELIKE / DUNGEON" },
  { value: "TACTICS", label: "TACTICS / MECHA" },
  { value: "STRATEGY", label: "STRATEGY / RTS" },
  { value: "AI NOIR", label: "AI INTERACTIVE / NPC" }
];

interface UploadResultState {
  game: GameRecord;
  autoPublished: boolean;
  scanScore: number;
  scanVerdict: string;
  translated: boolean;
  storageMode?: string;
  fileCount?: number;
}

/**
 * Center-crops and compresses any uploaded cover image to 1280x720 JPEG (16:9) in the browser
 * so it uploads fast and looks razor-sharp across Arcade cards, OG previews, and Bluesky/Dev.to shares.
 */
async function compressCoverTo16x9DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const targetW = 1280;
        const targetH = 720;
        const targetRatio = targetW / targetH;
        const srcRatio = img.width / img.height;

        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;

        if (srcRatio > targetRatio) {
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.fillStyle = "#07080b";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode image file. Please use PNG, JPG, or WebP."));
    };
    img.src = objectUrl;
  });
}

export function StudioView({
  locale,
  currentUser,
  onRequestSignIn,
  onUploaded
}: {
  locale: Locale;
  currentUser: AuthUserSummary | null;
  onRequestSignIn: () => void;
  onUploaded: (game: GameRecord) => void;
}) {
  const [inputTab, setInputTab] = useState<"drop" | "paste">("drop");
  const [detectedMode, setDetectedMode] = useState<"single_html" | "html5_zip">("single_html");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ARCADE");
  const [tagline, setTagline] = useState("");
  const [aiTools, setAiTools] = useState("HTML5, AI Assisted");
  const [tipUrl, setTipUrl] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const [sandboxHtml, setSandboxHtml] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [droppedFileName, setDroppedFileName] = useState<string | null>(null);
  const [droppedFileSize, setDroppedFileSize] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);

  const [showLivePreview, setShowLivePreview] = useState(false);
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [stageLabel, setStageLabel] = useState("RUNNING AST SANDBOX SCAN...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResultState | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const gameFileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const isTrustedCreator = Boolean(
    currentUser &&
      (currentUser.isVerifiedCreator ||
        currentUser.role === "admin" ||
        currentUser.role === "moderator")
  );

  const resetFormForNextUpload = () => {
    setTitle("");
    setTagline("");
    setSandboxHtml("");
    setZipFile(null);
    setDroppedFileName(null);
    setDroppedFileSize(0);
    setCoverDataUrl(null);
    setShowLivePreview(false);
    setUploadResult(null);
    setErrorMsg(null);
    setCopiedLink(false);
  };

  const handleUnifiedGameFile = async (file: File | null) => {
    if (!file) return;
    setErrorMsg(null);
    const lower = file.name.toLowerCase();

    if (lower.endsWith(".zip")) {
      if (file.size > 100 * 1024 * 1024) {
        setErrorMsg("ZIP bundle exceeds 100MB safety limit.");
        return;
      }
      setDetectedMode("html5_zip");
      setZipFile(file);
      setSandboxHtml("");
      setShowLivePreview(false);
      setDroppedFileName(file.name);
      setDroppedFileSize(file.size);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.zip$/i, "").replace(/[-_]+/g, " ").toUpperCase());
      }
      return;
    }

    if (lower.endsWith(".html") || lower.endsWith(".htm")) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Single HTML file exceeds 5MB limit. Package larger assets as a .zip bundle.");
        return;
      }
      try {
        const text = await file.text();
        if (text.trim().length < 40) {
          setErrorMsg("HTML file appears empty or too short to be a playable game.");
          return;
        }
        setDetectedMode("single_html");
        setZipFile(null);
        setSandboxHtml(text);
        setDroppedFileName(file.name);
        setDroppedFileSize(file.size);
        if (!title.trim()) {
          setTitle(file.name.replace(/\.html?$/i, "").replace(/[-_]+/g, " ").toUpperCase());
        }
      } catch {
        setErrorMsg("Failed to read HTML file from disk.");
      }
      return;
    }

    setErrorMsg("Unsupported file type. Please drop a single .html game file or an HTML5/WebGL .zip bundle.");
  };

  const handleCoverSelect = async (file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      setErrorMsg("Cover image must be PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg("Cover image file is too large (max 12MB before compression).");
      return;
    }
    setCoverLoading(true);
    setErrorMsg(null);
    try {
      const compressed = await compressCoverTo16x9DataUrl(file);
      setCoverDataUrl(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process cover image.");
    } finally {
      setCoverLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequestSignIn();
      return;
    }

    const effectiveMode = inputTab === "paste" ? "single_html" : detectedMode;
    setErrorMsg(null);
    setUploadResult(null);

    if (!title.trim()) {
      setErrorMsg("Please enter a game title.");
      return;
    }
    if (effectiveMode === "single_html" && sandboxHtml.trim().length < 40) {
      setErrorMsg("Drop a .html file or paste your playable HTML5 game code first.");
      return;
    }
    if (effectiveMode === "html5_zip" && !zipFile) {
      setErrorMsg("Please drop or select a .zip bundle containing index.html.");
      return;
    }

    setSubmitting(true);

    try {
      if (effectiveMode === "html5_zip" && zipFile) {
        setStageLabel("REQUESTING R2 QUARANTINE SLOT...");
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: zipFile.name, sizeBytes: zipFile.size })
        });
        const presign = await presignRes.json();
        if (!presignRes.ok) {
          setErrorMsg(presign.error || "Failed to initialize ZIP upload.");
          setSubmitting(false);
          return;
        }

        let uploadRes: Response;
        if (presign.mode === "r2_presigned" && presign.uploadUrl && presign.quarantineKey) {
          setStageLabel("UPLOADING TO CLOUDFLARE R2 QUARANTINE...");
          const putRes = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/zip" },
            body: zipFile
          });
          if (!putRes.ok) {
            setErrorMsg("Direct upload to Cloudflare R2 quarantine failed. Please retry.");
            setSubmitting(false);
            return;
          }

          setStageLabel("UNZIPPING · ZIP-BOMB GUARD · AST SCAN · AI 6-LANG I18N...");
          uploadRes = await fetch("/api/uploads/zip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quarantineKey: presign.quarantineKey,
              title: title.trim(),
              tagline: tagline.trim() || undefined,
              category,
              aiTools: aiTools.split(",").map((s) => s.trim()).filter(Boolean),
              creatorTipUrl: tipUrl.trim() || undefined,
              coverDataUrl: coverDataUrl || undefined,
              turnstileToken
            })
          });
        } else {
          setStageLabel("UPLOADING · UNZIPPING · AST SCAN · AI 6-LANG I18N...");
          const formData = new FormData();
          formData.append("file", zipFile);
          formData.append("title", title.trim());
          if (tagline.trim()) formData.append("tagline", tagline.trim());
          formData.append("category", category);
          formData.append("aiTools", aiTools);
          if (tipUrl.trim()) formData.append("creatorTipUrl", tipUrl.trim());
          if (coverDataUrl) formData.append("coverDataUrl", coverDataUrl);
          if (turnstileToken) formData.append("turnstileToken", turnstileToken);

          uploadRes = await fetch("/api/uploads/zip", {
            method: "POST",
            body: formData
          });
        }

        const data = await uploadRes.json();
        if (!uploadRes.ok) {
          setErrorMsg(data.error || "ZIP bundle blocked by security sandbox.");
        } else {
          setUploadResult({
            game: data.game,
            autoPublished: Boolean(data.autoPublished ?? data.game?.status === "published"),
            scanScore: data.scanReport?.score ?? 98,
            scanVerdict: data.scanReport?.verdict ?? "SAFE",
            translated: Boolean(data.translated),
            storageMode: data.storageMode,
            fileCount: data.fileCount
          });
          onUploaded(data.game);
        }
        return;
      }

      setStageLabel("RUNNING AST SANDBOX SCAN & AI 6-LANG TRANSLATION...");
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          titleZh: title.trim(),
          tagline: tagline.trim() || undefined,
          playType: "single_html",
          category,
          aiTools: aiTools.split(",").map((s) => s.trim()).filter(Boolean),
          creatorTipUrl: tipUrl.trim() || undefined,
          sandboxHtml,
          coverDataUrl: coverDataUrl || undefined,
          turnstileToken
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Upload blocked by security sandbox.");
      } else {
        setUploadResult({
          game: data.game,
          autoPublished: Boolean(data.autoPublished ?? data.game?.status === "published"),
          scanScore: data.scanReport?.score ?? 98,
          scanVerdict: data.scanReport?.verdict ?? "SAFE",
          translated: Boolean(data.translated)
        });
        onUploaded(data.game);
      }
    } catch {
      setErrorMsg("Network error while uploading game. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = uploadResult
    ? `${typeof window !== "undefined" ? window.location.origin : "https://synthplay.games"}/games/${uploadResult.game.slug}`
    : "";

  const handleCopyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <section className="sp-container" style={{ paddingTop: 28, paddingBottom: 64 }}>
      <div className="section-bar" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="section-index">02 // 10-SECOND CREATOR UPLOAD BAY</div>
          <h1 className="section-heading">{t(locale, "studioTitle")}</h1>
          <p style={{ color: "var(--ink-muted)", fontSize: 14, marginTop: 6 }}>
            Drop a single <code>.html</code> game (Claude / Cursor / Gemini) or an HTML5/WebGL <code>.zip</code> bundle. Free R2 sandbox hosting · 0% cut on creator tips.
          </p>
        </div>

        {currentUser && !uploadResult && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`country-btn ${inputTab === "drop" ? "active" : ""}`}
              onClick={() => setInputTab("drop")}
            >
              DROP .HTML / .ZIP FILE
            </button>
            <button
              type="button"
              className={`country-btn ${inputTab === "paste" ? "active" : ""}`}
              onClick={() => {
                setInputTab("paste");
                setDetectedMode("single_html");
              }}
            >
              PASTE HTML CODE
            </button>
          </div>
        )}
      </div>

      {/* SIGN-IN GATE FOR ANONYMOUS VISITORS */}
      {!currentUser ? (
        <div
          className="cab-surface cab-chamfer"
          style={{
            padding: "36px 28px",
            display: "grid",
            gap: 20,
            textAlign: "center",
            borderColor: "rgba(243,255,0,0.35)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                display: "grid",
                placeItems: "center",
                border: "1px solid var(--volt)",
                background: "rgba(243,255,0,0.08)",
                color: "var(--volt)"
              }}
            >
              <IconUpload size={26} />
            </div>
          </div>
          <div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)", letterSpacing: "0.14em" }}>
              FREE CLOUDFLARE R2 SANDBOX · ZERO BANDWIDTH FEES · 0% TIP CUT
            </div>
            <h2 className="font-display" style={{ fontSize: "clamp(22px, 3vw, 30px)", marginTop: 8 }}>
              SIGN IN TO PUBLISH YOUR GAME IN 10 SECONDS
            </h2>
            <p style={{ color: "var(--ink-muted)", fontSize: 14, maxWidth: 560, margin: "10px auto 0", lineHeight: 1.6 }}>
              Sign in with Google or email to link your game to your public creator profile (<code>/u/your-handle</code>), earn Verified Creator instant auto-publish, and keep 100% of player tips.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn-volt" onClick={onRequestSignIn}>
              <IconShield size={16} />
              <span>SIGN IN / REGISTER FREE</span>
            </button>
          </div>

          <div
            className="font-mono"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 18,
              flexWrap: "wrap",
              fontSize: 11,
              color: "var(--ink-muted)",
              paddingTop: 12,
              borderTop: "1px solid var(--hairline)"
            }}
          >
            <span>✓ SINGLE .HTML (MAX 5MB)</span>
            <span>✓ UNITY / GODOT / HTML5 .ZIP (MAX 100MB)</span>
            <span>✓ LIVE IN-FORM PREVIEW</span>
            <span>✓ AUTO 6-LANGUAGE SEO</span>
          </div>
        </div>
      ) : uploadResult ? (
        /* POST-UPLOAD VICTORY CARD */
        <div
          className="cab-surface cab-chamfer"
          style={{
            padding: 28,
            display: "grid",
            gap: 20,
            borderColor: uploadResult.autoPublished ? "var(--cyan)" : "var(--volt)"
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div
                className="font-mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: uploadResult.autoPublished ? "var(--cyan)" : "var(--volt)"
                }}
              >
                {uploadResult.autoPublished
                  ? "⚡ VERIFIED CREATOR · PUBLISHED LIVE INSTANTLY"
                  : "🛡 RECEIVED · IN FAST HUMAN REVIEW QUEUE"}
              </div>
              <h2 className="font-display" style={{ fontSize: "clamp(22px, 3vw, 30px)", marginTop: 6 }}>
                {uploadResult.game.title}
              </h2>
            </div>
            <span
              className="font-mono"
              style={{
                padding: "6px 12px",
                fontSize: 11,
                border: `1px solid ${uploadResult.autoPublished ? "var(--cyan)" : "var(--volt)"}`,
                color: uploadResult.autoPublished ? "var(--cyan)" : "var(--volt)",
                background: uploadResult.autoPublished ? "rgba(0,240,212,0.08)" : "rgba(243,255,0,0.08)"
              }}
            >
              SECURITY: {uploadResult.scanVerdict} ({uploadResult.scanScore}/100)
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12
            }}
          >
            <div style={{ padding: 14, background: "#0a0c11", border: "1px solid var(--hairline)" }}>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>STATUS</div>
              <div className="font-mono" style={{ fontSize: 13, marginTop: 4, color: uploadResult.autoPublished ? "var(--cyan)" : "var(--volt)" }}>
                {uploadResult.autoPublished ? "LIVE IN ARCADE HALL" : "PENDING REVIEW (FAST QUEUE)"}
              </div>
            </div>
            <div style={{ padding: 14, background: "#0a0c11", border: "1px solid var(--hairline)" }}>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>SANDBOX PIPELINE</div>
              <div className="font-mono" style={{ fontSize: 13, marginTop: 4 }}>
                {uploadResult.storageMode === "cloudflare_r2"
                  ? `CLOUDFLARE R2 (${uploadResult.fileCount || 1} FILES)`
                  : uploadResult.game.playType === "html5_zip"
                    ? `ISOLATED ZIP (${uploadResult.fileCount || 1} FILES)`
                    : "ISOLATED SINGLE-HTML"}
              </div>
            </div>
            <div style={{ padding: 14, background: "#0a0c11", border: "1px solid var(--hairline)" }}>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>GLOBAL SEO &amp; I18N</div>
              <div className="font-mono" style={{ fontSize: 13, marginTop: 4, color: "var(--cyan)" }}>
                {uploadResult.translated ? "AUTO-TRANSLATED (6 LANGS)" : "INDEXED READY"}
              </div>
            </div>
          </div>

          {!uploadResult.autoPublished && (
            <div
              className="font-mono"
              style={{
                padding: 14,
                background: "rgba(243,255,0,0.06)",
                border: "1px solid rgba(243,255,0,0.3)",
                fontSize: 12,
                color: "var(--ink)",
                lineHeight: 1.6
              }}
            >
              Your game passed our automated security scan ({uploadResult.scanScore}/100) and is queued for a quick human check to keep SYNTHPLAY safe &amp; AdSense-clean. Once approved, we can mark <strong>@{currentUser.username}</strong> as a Verified Creator so all future uploads publish live in 1 click!
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 6 }}>
            {uploadResult.autoPublished && (
              <a href={`/games/${uploadResult.game.slug}`} className="btn-volt">
                <IconPlay size={15} />
                <span>OPEN GAME PAGE</span>
              </a>
            )}
            <button type="button" className="btn-steel" onClick={handleCopyShare}>
              <span>{copiedLink ? "✓ LINK COPIED" : "COPY GAME LINK"}</span>
            </button>
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                `I just deployed "${uploadResult.game.title}" — play it free right in your browser on @synthplaygames! 🕹️`
              )}&url=${encodeURIComponent(shareUrl)}&hashtags=indiegames,AIgames,HTML5`}
              target="_blank"
              rel="noreferrer"
              className="btn-steel"
            >
              <span>POST ON X ↗</span>
            </a>
            <button type="button" className="btn-steel" onClick={resetFormForNextUpload}>
              <span>+ UPLOAD ANOTHER GAME</span>
            </button>
          </div>
        </div>
      ) : (
        /* STREAMLINED 10-SECOND UPLOAD FORM */
        <form onSubmit={handleSubmit} className="cab-surface cab-chamfer" style={{ padding: 24, display: "grid", gap: 18 }}>
          {/* CREATOR IDENTITY & TRUST TIER STRIP */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "#0a0c11",
              border: `1px solid ${isTrustedCreator ? "rgba(0,240,212,0.4)" : "var(--hairline-strong)"}`
            }}
          >
            <div className="font-mono" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "var(--ink-muted)" }}>PUBLISHING AS</span>
              <a href={`/u/${currentUser.username}`} style={{ color: "var(--volt)", textDecoration: "none", fontWeight: 700 }}>
                @{currentUser.username}
              </a>
              <span style={{ color: "var(--ink-muted)" }}>· {currentUser.countryCode}</span>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                color: isTrustedCreator ? "var(--cyan)" : "var(--volt)"
              }}
            >
              {isTrustedCreator
                ? "⚡ VERIFIED CREATOR · SAFE SCANS PUBLISH INSTANTLY"
                : "🛡 NEW CREATOR · FAST REVIEW QUEUE (GET VERIFIED FOR INSTANT AUTO-PUBLISH)"}
            </div>
          </div>

          {/* STEP 1: UNIFIED DROPZONE OR PASTE HTML */}
          {inputTab === "drop" ? (
            <div
              onClick={() => gameFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                void handleUnifiedGameFile(e.dataTransfer.files?.[0] || null);
              }}
              style={{
                padding: "28px 20px",
                border: `1px dashed ${dragActive || droppedFileName ? "var(--volt)" : "var(--hairline-strong)"}`,
                background: dragActive ? "rgba(243,255,0,0.06)" : "#0a0c11",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 140ms ease, background 140ms ease"
              }}
            >
              <input
                ref={gameFileInputRef}
                type="file"
                accept=".html,.htm,.zip,text/html,application/zip"
                style={{ display: "none" }}
                onChange={(e) => void handleUnifiedGameFile(e.target.files?.[0] || null)}
              />
              <IconUpload size={28} />
              {droppedFileName ? (
                <div style={{ marginTop: 10 }}>
                  <div className="font-display" style={{ fontSize: 16, color: "var(--volt)" }}>
                    READY: {droppedFileName} ({droppedFileSize >= 1024 * 1024 ? `${(droppedFileSize / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(droppedFileSize / 1024))} KB`})
                  </div>
                  <div className="font-mono" style={{ fontSize: 11, color: "var(--cyan)", marginTop: 6 }}>
                    DETECTED: {detectedMode === "html5_zip" ? "HTML5 / WEBGL ZIP BUNDLE -> CLOUDFLARE R2" : "SINGLE-FILE AI HTML5 -> ISOLATED SANDBOX"} · CLICK TO REPLACE
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <div className="font-display" style={{ fontSize: 15 }}>
                    DROP YOUR <code>.HTML</code> FILE OR <code>.ZIP</code> BUNDLE HERE (OR CLICK)
                  </div>
                  <p className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 6 }}>
                    Auto-detects single-file AI HTML (max 5MB) or Unity/Godot/HTML5 ZIP containing index.html (max 100MB)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--cyan)" }}>
                  PASTE SINGLE-FILE AI HTML (CLAUDE / GEMINI / CHATGPT ARTIFACT · MAX 5MB)
                </span>
                <button
                  type="button"
                  className="btn-steel"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                  onClick={() => {
                    setTitle("VOLT CATCHER AI");
                    setTagline("Single-file HTML5 arcade demo wrapped for SYNTHPLAY Sandbox.");
                    setSandboxHtml(SAMPLE_AI_HTML);
                    setDetectedMode("single_html");
                  }}
                >
                  LOAD SAMPLE PLAYABLE AI HTML
                </button>
              </div>
              <textarea
                className="sp-textarea font-mono"
                rows={8}
                value={sandboxHtml}
                onChange={(e) => {
                  setSandboxHtml(e.target.value);
                  setDetectedMode("single_html");
                }}
                placeholder="<!DOCTYPE html><html>... Paste your playable AI HTML5 game code here ..."
              />
            </div>
          )}

          {/* OPTIONAL LIVE IN-FORM SANDBOX PREVIEW FOR SINGLE-HTML GAMES */}
          {sandboxHtml.trim().length >= 40 && detectedMode === "single_html" && (
            <div style={{ border: "1px solid var(--hairline-strong)", background: "#07080b", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--cyan)" }}>
                  SANDBOX PREVIEW READY ({Math.max(1, Math.round(sandboxHtml.length / 1024))} KB HTML)
                </span>
                <button
                  type="button"
                  className="btn-steel"
                  style={{ padding: "5px 12px", fontSize: 11 }}
                  onClick={() => setShowLivePreview((prev) => !prev)}
                >
                  {showLivePreview ? "■ HIDE PREVIEW" : "▶ TEST PLAY BEFORE SUBMIT"}
                </button>
              </div>
              {showLivePreview && (
                <div style={{ marginTop: 12, aspectRatio: "16 / 9", width: "100%", border: "1px solid var(--volt)", overflow: "hidden", background: "#000" }}>
                  <iframe
                    title="Live Game Sandbox Preview"
                    sandbox="allow-scripts"
                    srcDoc={sandboxHtml}
                    style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ONLY 2 REQUIRED FIELDS (TITLE + CATEGORY) + OPTIONAL 16:9 COVER */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>
                GAME TITLE *
              </div>
              <input
                className="sp-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CYBER DRIFT ZERO"
                required
              />
            </label>
            <label>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>
                GENRE / CATEGORY *
              </div>
              <select className="sp-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* COMPACT 16:9 COVER IMAGE UPLOADER */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: 12,
              background: "#0a0c11",
              border: "1px solid var(--hairline)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {coverDataUrl ? (
                <img
                  src={coverDataUrl}
                  alt="Custom 16:9 game cover preview"
                  style={{ width: 112, height: 63, objectFit: "cover", border: "1px solid var(--volt)" }}
                />
              ) : (
                <div
                  className="font-mono"
                  style={{
                    width: 112,
                    height: 63,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 10,
                    color: "var(--ink-muted)",
                    border: "1px dashed var(--hairline-strong)",
                    background: "#07080b"
                  }}
                >
                  16:9 COVER
                </div>
              )}
              <div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--ink)" }}>
                  CUSTOM COVER ART (OPTIONAL · AUTO-CROPPED TO 1280×720)
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 3 }}>
                  {coverDataUrl
                    ? "Ready to deploy with your game on Cloudflare R2."
                    : "Leave blank to auto-assign a Neo-Tokyo cover matching your genre."}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => void handleCoverSelect(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="btn-steel"
                style={{ padding: "7px 12px", fontSize: 11 }}
                disabled={coverLoading}
                onClick={() => coverInputRef.current?.click()}
              >
                {coverLoading ? "OPTIMIZING..." : coverDataUrl ? "CHANGE COVER" : "UPLOAD COVER"}
              </button>
              {coverDataUrl && (
                <button
                  type="button"
                  className="btn-steel"
                  style={{ padding: "7px 10px", fontSize: 11, color: "var(--vermilion)" }}
                  onClick={() => setCoverDataUrl(null)}
                >
                  REMOVE
                </button>
              )}
            </div>
          </div>

          {/* COLLAPSIBLE MORE OPTIONS */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreOptions((prev) => !prev)}
              className="font-mono"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: "var(--ink-muted)",
                fontSize: 12,
                cursor: "pointer",
                letterSpacing: "0.06em"
              }}
            >
              {showMoreOptions ? "▾ HIDE OPTIONAL DETAILS" : "▸ MORE OPTIONS (OPTIONAL: TAGLINE, AI TOOLS, 0% TIP LINK)"}
            </button>

            {showMoreOptions && (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                  padding: 14,
                  background: "#0a0c11",
                  border: "1px solid var(--hairline)"
                }}
              >
                <label>
                  <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>
                    ONE-LINE SUMMARY (AUTO-TRANSLATED TO 6 LANGS)
                  </div>
                  <input
                    className="sp-input"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Dodge neon lasers in a 60fps browser bullet hell..."
                  />
                </label>
                <label>
                  <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>
                    AI / ENGINE TAGS (COMMA SEPARATED)
                  </div>
                  <input
                    className="sp-input"
                    value={aiTools}
                    onChange={(e) => setAiTools(e.target.value)}
                    placeholder="Claude, Cursor, Canvas2D"
                  />
                </label>
                <label>
                  <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>
                    YOUR TIP LINK (0% PLATFORM CUT)
                  </div>
                  <input
                    className="sp-input"
                    value={tipUrl}
                    onChange={(e) => setTipUrl(e.target.value)}
                    placeholder="https://ko-fi.com/yourname or https://patreon.com/..."
                  />
                </label>
              </div>
            )}
          </div>

          {/* TURNSTILE + SUBMIT FOOTER */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--hairline)"
            }}
          >
            <div>
              <TurnstileWidget onToken={setTurnstileToken} />
              <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                Auto-scanned for zip-bombs, crypto miners &amp; cookie theft · Isolated on <code>*.synthplay-box.cloud</code>
              </div>
            </div>

            <button type="submit" className="btn-volt" disabled={submitting}>
              {submitting ? <span className="cyber-radar-spinner" /> : <IconShield size={16} />}
              <span>
                {submitting
                  ? stageLabel
                  : isTrustedCreator
                    ? "SCAN & PUBLISH LIVE"
                    : "SCAN & SUBMIT FOR FAST REVIEW"}
              </span>
            </button>
          </div>

          {errorMsg && (
            <div
              className="font-mono"
              style={{
                padding: 14,
                border: "1px solid var(--vermilion)",
                background: "rgba(255,42,60,0.12)",
                fontSize: 13,
                color: "#ff8b94"
              }}
            >
              {errorMsg}
            </div>
          )}
        </form>
      )}

      <AiToolsShelf />
    </section>
  );
}
