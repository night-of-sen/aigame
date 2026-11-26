import { NextRequest, NextResponse } from "next/server";
import { USER_SESSION_COOKIE, verifySessionToken } from "@synthplay/db";
import { createCreemCheckoutSession, getPaymentIntegrationsStatus } from "@/lib/payments";

export async function GET() {
  return NextResponse.json(getPaymentIntegrationsStatus());
}

export async function POST(req: NextRequest) {
  try {
    const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    const body = await req.json();
    const provider = String(body.provider || "creem");
    const tier = (body.tier || "gold_patron") as "pro_monthly" | "gold_patron" | "diamond_b2b";
    const status = getPaymentIntegrationsStatus();

    if (provider === "creem") {
      const creemSession = await createCreemCheckoutSession({
        tier,
        payerEmail: session?.email || body.payerEmail,
        payerName: body.payerName || session?.username,
        payerCountry: body.payerCountry || session?.countryCode || "US",
        tagline: body.tagline,
        targetUrl: body.targetUrl
      });
      if (creemSession) {
        return NextResponse.json({ mode: "redirect", checkoutUrl: creemSession.checkoutUrl });
      }
    }

    if (provider === "kofi" && status.hostedUrls.kofi) {
      return NextResponse.json({ mode: "redirect", checkoutUrl: status.hostedUrls.kofi });
    }
    if (provider === "patreon" && status.hostedUrls.patreon) {
      return NextResponse.json({ mode: "redirect", checkoutUrl: status.hostedUrls.patreon });
    }
    if (provider === "paypal" && status.hostedUrls.paypalMe) {
      return NextResponse.json({ mode: "redirect", checkoutUrl: status.hostedUrls.paypalMe });
    }

    return NextResponse.json({
      mode: "sandbox_fallback",
      integrations: status
    });
  } catch {
    return NextResponse.json({ error: "Checkout initialization failed." }, { status: 400 });
  }
}
