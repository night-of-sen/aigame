import { NextRequest, NextResponse } from "next/server";
import { fulfillPaidWebhookOrder, verifyPayPalWebhookSignature } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    const webhookEvent = await req.json();
    const verified = await verifyPayPalWebhookSignature({
      headers: req.headers,
      webhookEvent
    });

    if (!verified) {
      return NextResponse.json({ error: "PayPal webhook signature verification failed." }, { status: 401 });
    }

    const eventType = String(webhookEvent?.event_type || "");
    if (!["PAYMENT.CAPTURE.COMPLETED", "CHECKOUT.ORDER.APPROVED", "INVOICING.INVOICE.PAID"].includes(eventType)) {
      return NextResponse.json({ received: true, ignored: eventType });
    }

    const resource = webhookEvent?.resource || {};
    const amountVal = Number(
      resource?.amount?.value ??
        resource?.purchase_units?.[0]?.amount?.value ??
        resource?.invoice?.amount?.value ??
        35
    );
    const amountUsd = Math.max(1, Math.round(amountVal));
    const payer = resource?.payer || resource?.invoice?.primary_recipients?.[0]?.billing_info || {};
    const payerName =
      [payer?.name?.given_name, payer?.name?.surname].filter(Boolean).join(" ") ||
      payer?.business_name ||
      "PAYPAL SPONSOR";
    const payerEmail = payer?.email_address || resource?.payer_email;
    const payerCountry = payer?.address?.country_code || "US";
    const externalRef = `paypal:${String(resource?.id || webhookEvent?.id || Date.now())}`;

    const result = await fulfillPaidWebhookOrder({
      externalRef,
      provider: "paypal",
      payerName,
      payerEmail,
      payerCountry,
      amountUsd,
      tagline: "Verified cross-border PayPal Business sponsor on SYNTHPLAY."
    });

    return NextResponse.json({ received: true, ...result });
  } catch {
    return NextResponse.json({ error: "Malformed PayPal webhook payload." }, { status: 400 });
  }
}
