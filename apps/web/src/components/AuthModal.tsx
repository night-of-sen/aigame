"use client";

import React, { useState } from "react";
import { COUNTRIES } from "@synthplay/i18n";

export interface AuthUserSummary {
  id: string;
  username: string;
  email: string;
  countryCode: string;
  role: string;
}

export function AuthModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: (user: AuthUserSummary) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("CN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? { username, email, password, countryCode }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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
        style={{ width: "100%", maxWidth: 440, padding: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--volt)", letterSpacing: "0.14em" }}>
              SYNTHPLAY IDENTITY // SCRYPT + HMAC
            </div>
            <h2 className="font-display" style={{ margin: "4px 0 0", fontSize: 22 }}>
              {mode === "register" ? "CREATE PLAYER / CREATOR ID" : "OPERATOR SIGN IN"}
            </h2>
          </div>
          <button type="button" className="btn-steel" style={{ padding: "6px 12px", fontSize: 11 }} onClick={onClose}>
            ESC
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          <button
            type="button"
            className={`country-btn ${mode === "register" ? "active" : ""}`}
            style={{ justifyContent: "center" }}
            onClick={() => { setMode("register"); setError(null); }}
          >
            REGISTER
          </button>
          <button
            type="button"
            className={`country-btn ${mode === "login" ? "active" : ""}`}
            style={{ justifyContent: "center" }}
            onClick={() => { setMode("login"); setError(null); }}
          >
            SIGN IN
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          {mode === "register" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
              <label>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 5 }}>HANDLE *</div>
                <input
                  className="sp-input"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="CyberPilot"
                />
              </label>
              <label>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 5 }}>NATION</div>
                <select className="sp-select" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                  {COUNTRIES.filter((c) => c.code !== "ALL").map((c) => (
                    <option key={c.code} value={c.code}>{c.code} · {c.nameZh}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 5 }}>
              {mode === "register" ? "EMAIL ADDRESS *" : "EMAIL OR HANDLE *"}
            </div>
            <input
              className="sp-input"
              type={mode === "register" ? "email" : "text"}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@synthplay.games"
            />
          </label>

          <label>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 5 }}>PASSWORD (MIN 6 CHARS) *</div>
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

          {error && (
            <div className="font-mono" style={{ padding: 10, borderRadius: 6, border: "1px solid var(--vermilion)", background: "rgba(255,42,60,0.14)", color: "#ff8b94", fontSize: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-volt" style={{ width: "100%", marginTop: 4 }} disabled={loading}>
            <span>{loading ? "VERIFYING..." : mode === "register" ? "JOIN SYNTHPLAY FREE" : "SIGN IN"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
