"use client";

import React, { useState } from "react";

export function AdminLogin({ isDefaultPassword }: { isDefaultPassword: boolean }) {
  const [email, setEmail] = useState("admin@synthplay.games");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed.");
      } else {
        window.location.reload();
      }
    } catch {
      setError("Network error connecting to auth service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#07090d" }}>
      <form
        onSubmit={onSubmit}
        className="ops-card"
        style={{ width: "100%", maxWidth: 420, padding: 28, borderColor: "rgba(243,255,0,0.35)", display: "grid", gap: 16 }}
      >
        <div>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)", letterSpacing: "0.12em" }}>
            ADMIN.SYNTHPLAY.GAMES // RBAC GATE
          </div>
          <h1 className="font-display" style={{ margin: "6px 0 4px", fontSize: 24 }}>
            OPERATOR SIGN IN
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>
            Authorized SYNTHPLAY administrators only. All sessions are HMAC-SHA256 signed &amp; audited.
          </p>
        </div>

        {isDefaultPassword && (
          <div
            className="font-mono"
            style={{
              padding: "10px 12px",
              fontSize: 11,
              border: "1px solid rgba(255,159,28,0.45)",
              background: "rgba(255,159,28,0.1)",
              color: "var(--amber)",
              lineHeight: 1.5
            }}
          >
            SECURITY NOTICE: Set <strong>ADMIN_PASSWORD</strong> &amp; <strong>AUTH_SECRET</strong> inside <code>/opt/synthplay/.env</code> on your VPS!
          </div>
        )}

        <label>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>ADMIN EMAIL</div>
          <input
            className="ops-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>ADMIN PASSWORD</div>
          <input
            className="ops-input"
            type="password"
            required
            placeholder="Enter ADMIN_PASSWORD from .env"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <div className="font-mono" style={{ padding: 10, border: "1px solid var(--red)", background: "rgba(255,42,60,0.12)", color: "#ff8b94", fontSize: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" className="ops-btn ops-btn-volt" style={{ padding: "11px 16px", fontSize: 13 }} disabled={loading}>
          {loading ? "VERIFYING CREDENTIALS..." : "AUTHENTICATE OPS CONSOLE"}
        </button>
      </form>
    </div>
  );
}
