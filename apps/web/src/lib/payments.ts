import crypto from "node:crypto";
import {
  appendAuditLog,
  createSponsorOrderAndSlot,
  type PaymentProvider,
  type SponsorOrderRecord,
  type SponsorSlotRecord
} from "@synthplay/db";

export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyHmacHex(rawBody: string, secret: string, signatureHex: string, algo: "sha256" | "md5" = "sha256"): boolean {
  if (!secret || !signatureHex) return false;
  const cleanSig = signatureHex.replace(/^(sha256=|md5=)/i, "").trim().toLowerCase();
  const expected = crypto.createHmac(algo, secret).update(rawBody, "utf8").digest("hex").toLowerCase();
  return timingSafeStringEqual(cleanSig, expected);
}

export function inferTierFromAmount(amountUsd: number, explicitTier?: string): SponsorOrderRecord["tier"] {
  if (explicitTier === "diamond_b2b" || explicitTier === "gold_patron" || explicitTier === "pro_monthly" || explicitTier === "supporter") {
    return explicitTier;
  }
  if (amountUsd >= 250) return "diamond_b2b";
  if (amountUsd >= 29) return "gold_patron";
  if (amountUsd >= 3) return "pro_monthly";
  return "supporter";
}

export function sanitizeTargetUrl(url?: string): string {
  const trimmed = (url || "").trim();
  if (/^https?:\/\/[a-zA-Z0-9.-]+/i.test(trimmed)) return trimmed.slice(0, 240);
  return "https://synthplay.games";
}

export interface FulfillPaymentInput {
  externalRef: string;
  provider: PaymentProvider;
  payerName: string;
  payerEmail?: string;
  payerCountry?: string;
  amountUsd: number;
  tier?: string;
  tagline?: string;
  targetUrl?: string;
}

/**
 * Unified idempotent fulfillment for verified payment webhooks (Creem, Ko-fi, Patreon, PayPal).
 * - Deduplicates by externalRef so webhook retries never double-credit.
 * - Upgrades matching user account to Pro Supporter when payerEmail matches.
 * - Auto-provisions Homepage Hero Marquee / Hall of Patrons showcase slots for Gold ($35+) & Diamond ($299+) tiers.
 */
export async function fulfillPaidWebhookOrder(input: FulfillPaymentInput) {
  const amountUsd = Math.max(1, Math.round(Number(input.amountUsd) || 5));
  const tier = inferTierFromAmount(amountUsd, input.tier);
  const payerName = (input.payerName || "SYNTHPLAY PATRON").trim().slice(0, 64);
  const payerCountry = (input.payerCountry || "US").toUpperCase().slice(0, 4);
  const now = new Date().toISOString();
  const orderId = `ord-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`;

  const order: SponsorOrderRecord = {
    id: orderId,
    externalRef: input.externalRef,
    payerName,
    payerEmail: input.payerEmail?.trim().toLowerCase() || undefined,
    payerCountry,
    provider: input.provider,
    tier,
    amountUsd,
    status: "paid",
    createdAt: now
  };

  let slot: SponsorSlotRecord | undefined;
  if (tier === "gold_patron" || tier === "diamond_b2b") {
    slot = {
      id: `sp-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`,
      placement: tier === "diamond_b2b" ? "hero_marquee" : "hall_gold",
      brandName: payerName.toUpperCase(),
      tagline: (input.tagline || "Verified Patron powering free global AI browser games.").trim().slice(0, 160),
      badgeLabel: tier === "diamond_b2b" ? "DIAMOND SPONSOR" : "GOLD PATRON",
      targetUrl: sanitizeTargetUrl(input.targetUrl),
      countryCode: payerCountry,
      provider: input.provider,
      monthlyUsd: amountUsd,
      isActive: true,
      clickCount: 0
    };
  }

  const res = await createSponsorOrderAndSlot(order, slot);

  if (!res.duplicate) {
    await appendAuditLog({
      id: `aud-${Date.now().toString(36)}`,
      actor: `${input.provider.toUpperCase()}_WEBHOOK`,
      action: "PAYMENT_WEBHOOK_FULFILLED",
      target: `${orderId} (${input.externalRef})`,
      detail: `$${amountUsd} USD · ${tier} · ${payerName}${res.upgradedUserId ? ` · PRO_GRANTED(${res.upgradedUserId})` : ""}${slot ? ` · SLOT_CREATED(${slot.placement})` : ""}`,
      createdAt: now
    });
  }

  return {
    orderId,
    duplicate: Boolean(res.duplicate),
    raisedUsd: res.raisedUsd,
    upgradedUserId: res.upgradedUserId,
    slotId: slot?.id
  };
}

export function getPaymentIntegrationsStatus() {
  const env = process.env;
  const isSet = (v?: string) => Boolean(v && !v.startsWith("your_"));
  const readRuntime = (key: string) => (env[key] || "").trim();
  return {
    creem: isSet(env.CREEM_API_KEY) && isSet(env.CREEM_WEBHOOK_SECRET),
    kofi: isSet(env.KOFI_VERIFICATION_TOKEN),
    patreon: isSet(env.PATREON_WEBHOOK_SECRET),
    paypal: isSet(env.PAYPAL_CLIENT_ID) && isSet(env.PAYPAL_CLIENT_SECRET) && isSet(env.PAYPAL_WEBHOOK_ID),
    hostedUrls: {
      kofi: readRuntime("KOFI_URL") || readRuntime("NEXT_PUBLIC_KOFI_URL"),
      patreon: readRuntime("PATREON_URL") || readRuntime("NEXT_PUBLIC_PATREON_URL"),
      paypalMe: readRuntime("PAYPAL_ME_URL") || readRuntime("NEXT_PUBLIC_PAYPAL_ME_URL")
    }
  };
}

/**
 * Creates a real Creem MoR hosted checkout session if CREEM_API_KEY and product IDs are configured.
 */
export async function createCreemCheckoutSession(params: {
  tier: "pro_monthly" | "gold_patron" | "diamond_b2b";
  payerEmail?: string;
  payerName?: string;
  tagline?: string;
  targetUrl?: string;
  payerCountry?: string;
}): Promise<{ checkoutUrl: string } | null> {
  const apiKey = process.env.CREEM_API_KEY || "";
  if (!apiKey || apiKey.startsWith("your_")) return null;

  const productMap: Record<string, string | undefined> = {
    pro_monthly: process.env.CREEM_PRODUCT_PRO,
    gold_patron: process.env.CREEM_PRODUCT_GOLD,
    diamond_b2b: process.env.CREEM_PRODUCT_DIAMOND
  };
  const productId = productMap[params.tier];
  if (!productId) return null;

  const baseUrl = process.env.CREEM_API_BASE || "https://api.creem.io/v1";
  const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");

  const res = await fetch(`${baseUrl}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      product_id: productId,
      success_url: `${mainDomain}/?sponsor_paid=1`,
      customer: params.payerEmail ? { email: params.payerEmail } : undefined,
      metadata: {
        tier: params.tier,
        payerName: params.payerName || "",
        payerCountry: params.payerCountry || "US",
        tagline: params.tagline || "",
        targetUrl: params.targetUrl || ""
      }
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  const checkoutUrl = data?.checkout_url || data?.url;
  return typeof checkoutUrl === "string" ? { checkoutUrl } : null;
}

/**
 * Verifies a PayPal webhook signature using PayPal's official OAuth2 + verify-webhook-signature API.
 */
export async function verifyPayPalWebhookSignature(params: {
  headers: Headers;
  webhookEvent: unknown;
}): Promise<boolean> {
  const clientId = process.env.PAYPAL_CLIENT_ID || "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || "";
  if (!clientId || !clientSecret || !webhookId || clientId.startsWith("your_")) {
    return false;
  }

  const base =
    process.env.PAYPAL_MODE === "sandbox"
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

  // 1. Obtain OAuth2 access token
  const authRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!authRes.ok) return false;
  const { access_token } = await authRes.json();
  if (!access_token) return false;

  // 2. Call PayPal signature verification endpoint
  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      auth_algo: params.headers.get("paypal-auth-algo"),
      cert_url: params.headers.get("paypal-cert-url"),
      transmission_id: params.headers.get("paypal-transmission-id"),
      transmission_sig: params.headers.get("paypal-transmission-sig"),
      transmission_time: params.headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: params.webhookEvent
    })
  });
  if (!verifyRes.ok) return false;
  const verified = await verifyRes.json();
  return verified?.verification_status === "SUCCESS";
}
