"use client";

import React, { useState } from "react";
import { COUNTRIES, getCountryName, type Locale, t } from "@synthplay/i18n";
import type { GameRecord } from "@synthplay/db";
import { IconShield, IconUpload } from "./Icons";

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
  const [country, setCountry] = useState("CN");
  const [category, setCategory] = useState("ARCADE");
  const [aiTools, setAiTools] = useState("Claude, Single-HTML, Canvas2D");
  const [tipUrl, setTipUrl] = useState("https://ko-fi.com/synthplay");
  const [sandboxHtml, setSandboxHtml] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; text: string; score?: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResultMsg(null);
    try {
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
          sandboxHtml: mode === "single_html" ? sandboxHtml : undefined,
          publishImmediately: publishNow
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setResultMsg({ ok: false, text: data.error || "Upload blocked by security sandbox." });
      } else {
        setResultMsg({
          ok: true,
          text:
            data.game.status === "published"
              ? `Published LIVE! Security Scan: ${data.scanReport.verdict} (${data.scanReport.score}/100). Click Play in Arcade Hall now.`
              : `Submitted to Admin Review Queue! Security Scan: ${data.scanReport.verdict} (${data.scanReport.score}/100).`,
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
            <input className="sp-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line hook (auto-translated to 4 languages on publish)" />
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
          <div style={{ padding: 28, border: "1px dashed var(--hairline-strong)", background: "#0a0c11", textAlign: "center" }}>
            <IconUpload size={28} />
            <div className="font-display" style={{ marginTop: 10, fontSize: 15 }}>
              DROP HTML5 / UNITY WEBGL / GODOT .ZIP BUNDLE (MAX 100MB)
            </div>
            <p className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 6 }}>
              Direct presigned upload to Cloudflare R2 Quarantine Bucket -&gt; Zip Bomb Guard -&gt; AST Security Scan -&gt; Isolated Sandbox Domain (*.synthplay-box.cloud)
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--ink-muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
            <span>Auto-publish immediately if Sandbox Security Score &ge; 90 (uncheck to send to Admin Review Queue)</span>
          </label>

          <button type="submit" className="btn-volt" disabled={submitting}>
            {submitting ? <span className="cyber-radar-spinner" /> : <IconShield size={16} />}
            <span>{submitting ? "RUNNING AST SANDBOX SCAN..." : "RUN SECURITY SCAN & DEPLOY"}</span>
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
    </section>
  );
}
