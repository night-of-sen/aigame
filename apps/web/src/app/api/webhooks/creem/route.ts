import { NextRequest, NextResponse } from "next/server";
import { fulfillPaidWebhookOrder, verifyHmacHex } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const secret = process.env.CREEM_WEBHOOK_SECRET || "";
  if (!secret || secret.startsWith("your_")) {
    return NextResponse.json({ error: "CREEM_WEBHOOK_SECRET not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("creem-signature") || req.headers.get("x-creem-signature") || "";
  if (!verifyHmacHex(rawBody, secret, signature, "sha256")) {
    return NextResponse.json({ error: "Invalid Creem webhook signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const eventType = String(payload.eventType || payload.type || "");
    if (!["checkout.completed", "subscription.paid", "order.paid"].includes(eventType)) {
      return NextResponse.json({ received: true, ignored: eventType });
    }

    const obj = payload.object || payload.data || {};
    const meta = obj.metadata || {};
    const amountCents = Number(obj.order?.amount ?? obj.amount ?? 500);
    const amountUsd = amountCents >= 100 ? Math.round(amountCents / 100) : Math.max(1, Math.round(amountCents));
    const externalRef = `creem:${obj.order?.id || obj.id || payload.id || Date.now()}`;

    const result = await fulfillPaidWebhookOrder({
      externalRef,
      provider: "creem",
      payerName: meta.payerName || obj.customer?.name || obj.customer?.email?.split("@")[0] || "CREEM PATRON",
      payerEmail: obj.customer?.email || meta.payerEmail,
      payerCountry: meta.payerCountry || obj.customer?.country || "US",
      amountUsd,
      tier: meta.tier,
      tagline: meta.tagline,
      targetUrl: meta.targetUrl
    });

    return NextResponse.json({ received: true, ...result });
  } catch {
    return NextResponse.json({ error: "Malformed Creem webhook payload." }, { status: 400 });
  }
}
