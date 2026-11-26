import { NextRequest, NextResponse } from "next/server";
import { fulfillPaidWebhookOrder, verifyHmacHex } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const secret = process.env.PATREON_WEBHOOK_SECRET || "";
  if (!secret || secret.startsWith("your_")) {
    return NextResponse.json({ error: "PATREON_WEBHOOK_SECRET not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-patreon-signature") || "";
  // Patreon signs webhook payloads with HMAC-MD5
  if (!verifyHmacHex(rawBody, secret, signature, "md5")) {
    return NextResponse.json({ error: "Invalid Patreon webhook signature." }, { status: 401 });
  }

  try {
    const event = req.headers.get("x-patreon-event") || "";
    if (!["members:pledge:create", "members:pledge:update", "members:create"].includes(event)) {
      return NextResponse.json({ received: true, ignored: event });
    }

    const payload = JSON.parse(rawBody);
    const attrs = payload?.data?.attributes || {};
    const pledgeCents = Number(attrs.currently_entitled_amount_cents ?? attrs.pledge_amount_cents ?? 500);
    const amountUsd = Math.max(1, Math.round(pledgeCents / 100));
    const externalRef = `patreon:${payload?.data?.id || Date.now()}:${pledgeCents}`;

    const result = await fulfillPaidWebhookOrder({
      externalRef,
      provider: "patreon",
      payerName: String(attrs.full_name || "PATREON BACKER"),
      payerEmail: attrs.email ? String(attrs.email) : undefined,
      payerCountry: "US",
      amountUsd,
      tagline: "Monthly Patreon supporter powering SYNTHPLAY free AI games."
    });

    return NextResponse.json({ received: true, ...result });
  } catch {
    return NextResponse.json({ error: "Malformed Patreon webhook payload." }, { status: 400 });
  }
}
