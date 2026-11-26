import { NextRequest, NextResponse } from "next/server";
import { fulfillPaidWebhookOrder, timingSafeStringEqual } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const expectedToken = process.env.KOFI_VERIFICATION_TOKEN || "";
  if (!expectedToken || expectedToken.startsWith("your_")) {
    return NextResponse.json({ error: "KOFI_VERIFICATION_TOKEN not configured." }, { status: 503 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let payload: Record<string, unknown>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      const rawData = String(form.get("data") || "{}");
      payload = JSON.parse(rawData);
    } else {
      payload = await req.json();
    }

    const token = String(payload.verification_token || "");
    if (!token || !timingSafeStringEqual(token, expectedToken)) {
      return NextResponse.json({ error: "Invalid Ko-fi verification token." }, { status: 401 });
    }

    const amountUsd = Math.max(1, Math.round(Number(payload.amount || 5)));
    const externalRef = `kofi:${String(payload.kofi_transaction_id || payload.message_id || Date.now())}`;
    const message = String(payload.message || "").trim();

    const result = await fulfillPaidWebhookOrder({
      externalRef,
      provider: "kofi",
      payerName: String(payload.from_name || "KO-FI SUPPORTER"),
      payerEmail: payload.email ? String(payload.email) : undefined,
      payerCountry: "US",
      amountUsd,
      tagline: message || "Backed SYNTHPLAY via Ko-fi (0% platform cut)."
    });

    return NextResponse.json({ received: true, ...result });
  } catch {
    return NextResponse.json({ error: "Malformed Ko-fi webhook payload." }, { status: 400 });
  }
}
