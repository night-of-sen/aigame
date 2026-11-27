"use client";

import React, { useRef, useState } from "react";
import { COUNTRIES, getCountryName, type Locale, t } from "@synthplay/i18n";
import type { GameRecord } from "@synthplay/db";
import { IconShield, IconUpload } from "./Icons";
import { AiToolsShelf } from "./AiToolsShelf";

const SAMPLE_AI_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{margin:0;background:#07080b;color:#f3ff00;font-family:monospace;overflow:hidden;display:grid;place-items:center;height:100vh;}
canvas{border:1px solid #f3ff00;background:#0b0d13;}
</style></head>
<body>
<canvas id="c" width="640" height="360"></canvas>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');
let px=320,py=300,score=0,orbs=[{x:200,y:60},{x:460,y:120}];
c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();px=(e.clientX-r.left)*(c.width/r.width);});
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

export function StudioView({
  locale,
  onUploaded
}: {
  locale: Locale;
  onUploaded: (game: GameRecord) => void;
}) {
  const [mode, setMode] = useState<"single_html" | "html5_zip">("single_html");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [creatorName, setCreatorName] = useState("NightOfSen");
  const [country, setCountry] = useState("US");
  const [category, setCategory] = useState("ARCADE");
  const [aiTools, setAiTools] = useState("Claude, Single-HTML, Canvas2D");
  const [tipUrl, setTipUrl] = useState("https://ko-fi.com/synthplay");
  const [sandboxHtml, setSandboxHtml] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [publishNow, setPublishNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stageLabel, setStageLabel] = useState("RUNNING AST SANDBOX SCAN...");
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; text: string; score?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleZipSelect = (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setResultMsg({ ok: false, text: "Only .zip HTML5/WebGL bundles are accepted." });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setResultMsg({ ok: false, text: "ZIP bundle exceeds 100MB safety limit." });
      return;
    }
    setResultMsg(null);
    setZipFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.zip$/i, "").replace(/[-_]+/g, " ").toUpperCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResultMsg(null);

    try {
      if (mode === "html5_zip") {
        if (!zipFile) {
          setResultMsg({ ok: false, text: "Please select or drop a .zip game bundle containing index.html." });
          setSubmitting(false);
          return;
        }

        setStageLabel("REQUESTING R2 QUARANTINE SLOT...");
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: zipFile.name, sizeBytes: zipFile.size })
        });
        const presign = await presignRes.json();
        if (!presignRes.ok) {
          setResultMsg({ ok: false, text: presign.error || "Failed to initialize ZIP upload." });
          setSubmitting(false);
          return;
        }

        let uploadRes: Response;
        if (presign.mode === "r2_presigned" && presign.uploadUrl && presign.quarantineKey) {
          setStageLabel("UPLOADING DIRECTLY TO CLOUDFLARE R2 QUARANTINE...");
          const putRes = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/zip" },
            body: zipFile
          });
          if (!putRes.ok) {
            setResultMsg({ ok: false, text: "Direct upload to Cloudflare R2 quarantine failed. Check R2 CORS settings." });
            setSubmitting(false);
            return;
          }

          setStageLabel("UNZIPPING · ZIP-BOMB GUARD · AST SCAN · AI TRANSLATING...");
          uploadRes = await fetch("/api/uploads/zip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quarantineKey: presign.quarantineKey,
              title: title || zipFile.name.replace(/\.zip$/i, ""),
              tagline: tagline || "Community HTML5/WebGL ZIP game deployed to SYNTHPLAY Sandbox.",
              creatorName,
              creatorCountryCode: country,
              category,
              aiTools: aiTools.split(",").map((s) => s.trim()).filter(Boolean),
              creatorTipUrl: tipUrl,
              publishImmediately: publishNow
            })
          });
        } else {
          setStageLabel("UPLOADING · UNZIPPING · AST SCAN · AI TRANSLATING...");
          const formData = new FormData();
          formData.append("file", zipFile);
          formData.append("title", title || zipFile.name.replace(/\.zip$/i, ""));
          formData.append("tagline", tagline || "Community HTML5/WebGL ZIP game deployed to SYNTHPLAY Sandbox.");
          formData.append("creatorName", creatorName);
          formData.append("creatorCountryCode", country);
          formData.append("category", category);
          formData.append("aiTools", aiTools);
          formData.append("creatorTipUrl", tipUrl);
          formData.append("publishImmediately", String(publishNow));

          uploadRes = await fetch("/api/uploads/zip", {
            method: "POST",
            body: formData
          });
        }

        const data = await uploadRes.json();
        if (!uploadRes.ok) {
          setResultMsg({ ok: false, text: data.error || "ZIP bundle blocked by security sandbox." });
        } else {
          const storageTag = data.storageMode === "cloudflare_r2" ? "CLOUDFLARE R2 CDN" : "LOCAL SANDBOX";
          const i18nTag = data.translated ? " · AI 4-LANG TRANSLATED" : "";
          setResultMsg({
            ok: true,
            text:
              data.game.status === "published"
                ? `Published LIVE (${data.fileCount} files -> ${storageTag}${i18nTag})! Security: ${data.scanReport.verdict} (${data.scanReport.score}/100).`
                : `Submitted to Admin Review (${data.fileCount} files -> ${storageTag}${i18nTag})! Security: ${data.scanReport.verdict} (${data.scanReport.score}/100).`,
            score: data.scanReport.score
          });
          setZipFile(null);
          onUploaded(data.game);
        }
        return;
      }

      setStageLabel("RUNNING AST SANDBOX SCAN & AI TRANSLATION...");
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "VOLT CATCHER AI",
          titleZh: title || "伏特捕手 AI",
          tagline: tagline || "Community AI single-file game deployed via SYNTHPLAY Sandbox.",
          creatorName,
          creatorCountryCode: country,
          playType: mode,
          category,
          aiTools: aiTools.split(",").map((s) => s.trim()).filter(Boolean),
          creatorTipUrl: tipUrl,
          sandboxHtml,
          publishImmediately: publishNow
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setResultMsg({ ok: false, text: data.error || "Upload blocked by security sandbox." });
      } else {
        const i18nTag = data.translated ? " · AI 4-LANG TRANSLATED" : "";
        setResultMsg({
          ok: true,
          text:
            data.game.status === "published"
              ? `Published LIVE${i18nTag}! Security Scan: ${data.scanReport.verdict} (${data.scanReport.score}/100). Click Play in Arcade Hall now.`
              : `Submitted to Admin Review Queue${i18nTag}! Security Scan: ${data.scanReport.verdict} (${data.scanReport.score}/100).`,
          score: data.scanReport.score
        });
        onUploaded(data.game);
      }
    } catch {
      setResultMsg({ ok: false, text: "Network error while uploading game." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="sp-container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="section-bar">
        <div>
          <div className="section-index">02 // CREATOR UPLOAD BAY</div>
          <h1 className="section-heading">{t(locale, "studioTitle")}</h1>
          <p style={{ color: "var(--ink-muted)", fontSize: 14, marginTop: 6 }}>{t(locale, "studioSub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`country-btn ${mode === "single_html" ? "active" : ""}`}
            onClick={() => setMode("single_html")}
          >
            PASTE &amp; PLAY (AI SINGLE HTML)
          </button>
          <button
            type="button"
            className={`country-btn ${mode === "html5_zip" ? "active" : ""}`}
            onClick={() => setMode("html5_zip")}
          >
            HTML5 / WEBGL ZIP BUNDLE
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="cab-surface cab-chamfer" style={{ padding: 28, display: "grid", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>GAME TITLE *</div>
            <input className="sp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CYBER DRIFT ZERO" required />
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>CREATOR HANDLE</div>
            <input className="sp-input" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} />
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>CREATOR COUNTRY</div>
            <select className="sp-select" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.filter((c) => c.code !== "ALL").map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {getCountryName(c.code, locale)}</option>
              ))}
            </select>
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", marginBottom: 6 }}>CATEGORY</div>
            <select className="sp-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="ARCADE">ARCADE</option>
              <option value="RACING">RACING</option>
              <option value="SHMUP">SHMUP / BULLET HELL</option>
              <option value="AI NOIR">AI INTERACTIVE / NPC</option>
              <option value="ROGUELIKE">ROGUELIKE</option>
              <option value="TACTICS">TACTICS / STRATEGY</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>GAME SUMMARY</div>
            <input className="sp-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line hook (auto-translated to EN/ZH/JA/ES on publish)" />
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>AI TOOLCHAIN TAGS (COMMA SEPARATED)</div>
            <input className="sp-input" value={aiTools} onChange={(e) => setAiTools(e.target.value)} />
          </label>
          <label>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>DIRECT TIP LINK (0% PLATFORM CUT)</div>
            <input className="sp-input" value={tipUrl} onChange={(e) => setTipUrl(e.target.value)} placeholder="https://ko-fi.com/... or https://patreon.com/..." />
          </label>
        </div>

        {mode === "single_html" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="font-mono" style={{ fontSize: 11, color: "var(--cyan)" }}>
                PASTE SINGLE-FILE AI HTML (CLAUDE / GEMINI / CHATGPT ARTIFACT · MAX 5MB)
              </span>
              <button
                type="button"
                className="btn-steel"
                style={{ padding: "6px 12px", fontSize: 11 }}
                onClick={() => {
                  setTitle("VOLT CATCHER AI");
                  setTagline("Single-file HTML5 arcade demo auto-scanned and wrapped for SYNTHPLAY Sandbox.");
                  setSandboxHtml(SAMPLE_AI_HTML);
                }}
              >
                LOAD SAMPLE PLAYABLE AI HTML
              </button>
            </div>
            <textarea
              className="sp-textarea font-mono"
              rows={9}
              value={sandboxHtml}
              onChange={(e) => setSandboxHtml(e.target.value)}
              placeholder="<!DOCTYPE html><html>... Paste your AI-generated game HTML here ..."
            />
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleZipSelect(e.dataTransfer.files?.[0] || null);
            }}
            style={{
              padding: 32,
              border: `1px dashed ${dragActive || zipFile ? "var(--volt)" : "var(--hairline-strong)"}`,
              background: dragActive ? "rgba(243,255,0,0.06)" : "#0a0c11",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 140ms ease, background 140ms ease"
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              style={{ display: "none" }}
              onChange={(e) => handleZipSelect(e.target.files?.[0] || null)}
            />
            <IconUpload size={30} />
            {zipFile ? (
              <>
                <div className="font-display" style={{ marginTop: 10, fontSize: 16, color: "var(--volt)" }}>
                  READY: {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
                <p className="font-mono" style={{ fontSize: 12, color: "var(--cyan)", marginTop: 6 }}>
                  Click to choose another .zip · Pipeline: R2 Quarantine -&gt; Zip Bomb Guard -&gt; AST Scan -&gt; Isolated Sandbox (*.synthplay-box.cloud)
                </p>
              </>
            ) : (
              <>
                <div className="font-display" style={{ marginTop: 10, fontSize: 15 }}>
                  DROP OR CLICK TO SELECT HTML5 / UNITY WEBGL / GODOT .ZIP BUNDLE (MAX 100MB)
                </div>
                <p className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 6 }}>
                  Must contain index.html · Auto-scanned for Zip Bombs, path traversal, miners &amp; cookie theft · Zero egress on Cloudflare R2
                </p>
              </>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--ink-muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
            <span>Auto-publish immediately if Sandbox Security Score &ge; 90 (uncheck to send to Admin Review Queue)</span>
          </label>

          <button type="submit" className="btn-volt" disabled={submitting}>
            {submitting ? <span className="cyber-radar-spinner" /> : <IconShield size={16} />}
            <span>{submitting ? stageLabel : mode === "html5_zip" ? "SCAN ZIP & DEPLOY TO SANDBOX" : "RUN SECURITY SCAN & DEPLOY"}</span>
          </button>
        </div>

        {resultMsg && (
          <div
            className="font-mono"
            style={{
              padding: 14,
              border: `1px solid ${resultMsg.ok ? "var(--cyan)" : "var(--vermilion)"}`,
              background: resultMsg.ok ? "rgba(0,240,212,0.08)" : "rgba(255,42,60,0.12)",
              fontSize: 13,
              color: resultMsg.ok ? "var(--cyan)" : "#ff8b94"
            }}
          >
            {resultMsg.text}
          </div>
        )}
      </form>
      <AiToolsShelf />
    </section>
  );
}
