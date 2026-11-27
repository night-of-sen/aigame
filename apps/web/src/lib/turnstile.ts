export function isTurnstileConfigured(): boolean {
  const secret = process.env.TURNSTILE_SECRET_KEY || "";
  return Boolean(secret && !secret.startsWith("your_"));
}

/**
 * Verifies a Cloudflare Turnstile response token on the server.
 * When TURNSTILE_SECRET_KEY is not yet configured in .env, returns ok: true so the site works cleanly out of the box.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string | null
): Promise<{ ok: boolean; enforced: boolean; error?: string }> {
  if (!isTurnstileConfigured()) {
    return { ok: true, enforced: false };
  }

  const clean = (token || "").trim();
  if (!clean) {
    return { ok: false, enforced: true, error: "Please complete the Cloudflare security check." };
  }

  try {
    const form = new URLSearchParams();
    form.set("secret", process.env.TURNSTILE_SECRET_KEY!);
    form.set("response", clean);
    if (remoteIp) form.set("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
    if (!res.ok) {
      return { ok: false, enforced: true, error: "Turnstile verification service error." };
    }
    const data = await res.json();
    if (data?.success === true) {
      return { ok: true, enforced: true };
    }
    return { ok: false, enforced: true, error: "Anti-bot check failed. Please retry." };
  } catch {
    return { ok: false, enforced: true, error: "Unable to verify anti-bot token." };
  }
}
