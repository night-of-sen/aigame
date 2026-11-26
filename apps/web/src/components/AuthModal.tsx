"use client";

import React, { useState } from "react";
import { type Locale, t } from "@synthplay/i18n";

export interface AuthUserSummary {
  id: string;
  username: string;
  email: string;
  countryCode: string;
  role: string;
  isProSupporter?: boolean;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z" />
      <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

export function AuthModal({
  locale,
  googleEnabled,
  onClose,
  onSuccess
}: {
  locale: Locale;
  googleEnabled: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUserSummary) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed.");
      } else {
        onSuccess(data.user);
        onClose();
      }
    } catch {
      setError("Network error while authenticating.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="cab-energy-border"
        style={{ width: "100%", maxWidth: 420, padding: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
          <div>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--volt)", letterSpacing: "0.14em" }}>
              SYNTHPLAY // INSTANT ACCESS
            </div>
            <h2 className="font-display" style={{ margin: "4px 0 6px", fontSize: 22 }}>
              {mode === "register" ? t(locale, "authTitleRegister") : t(locale, "authTitleLogin")}
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-muted)" }}>
              {t(locale, "authSub")}
            </p>
          </div>
          <button type="button" className="btn-steel" style={{ padding: "6px 10px", fontSize: 11 }} onClick={onClose}>
            <span>ESC</span>
          </button>
        </div>

        {/* PRIMARY 1-CLICK GOOGLE OAUTH CTA */}
        <a
          href="/api/auth/google"
          onClick={(e) => {
            if (!googleEnabled) {
              e.preventDefault();
              setError(t(locale, "authGoogleNotReady"));
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "13px 18px",
            borderRadius: 6,
            background: "#ffffff",
            color: "#111318",
            fontWeight: 700,
            fontSize: 14,
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 6px 24px rgba(255,255,255,0.12)",
            cursor: "pointer",
            transition: "transform 0.15s ease"
          }}
        >
          <GoogleIcon />
          <span>{t(locale, "authGoogleBtn")}</span>
        </a>

        {/* Clean Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
          <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
            {t(locale, "authOrEmail")}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
        </div>

        {/* Mode Switcher */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={`country-btn ${mode === "login" ? "active" : ""}`}
            style={{ justifyContent: "center" }}
            onClick={() => { setMode("login"); setError(null); }}
          >
            {t(locale, "authTabLogin")}
          </button>
          <button
            type="button"
            className={`country-btn ${mode === "register" ? "active" : ""}`}
            style={{ justifyContent: "center" }}
            onClick={() => { setMode("register"); setError(null); }}
          >
            {t(locale, "authTabRegister")}
          </button>
        </div>

        {/* Minimal 2-Field Email Form (Handle & Country auto-assigned!) */}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 5 }}>
              {t(locale, "authEmailLabel")}
            </div>
            <input
              className="sp-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 5 }}>
              {t(locale, "authPasswordLabel")}
            </div>
            <input
              className="sp-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {mode === "register" && (
            <div style={{ fontSize: 11.5, color: "var(--ink-muted)", lineHeight: 1.45 }}>
              {t(locale, "authAutoHint")}
            </div>
          )}

          {error && (
            <div className="font-mono" style={{ padding: 10, borderRadius: 6, border: "1px solid var(--vermilion)", background: "rgba(255,42,60,0.14)", color: "#ff8b94", fontSize: 11.5 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-volt" style={{ width: "100%", marginTop: 4 }} disabled={loading}>
            <span>
              {loading
                ? "..."
                : mode === "register"
                  ? t(locale, "authSubmitRegister")
                  : t(locale, "authSubmitLogin")}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
