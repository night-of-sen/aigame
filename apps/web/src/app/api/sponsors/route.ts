import { NextRequest, NextResponse } from "next/server";
import {
  appendAuditLog,
  createSponsorOrderAndSlot,
  loadFullStore,
  type PaymentProvider,
  type SponsorPlacement
} from "@synthplay/db";

export async function GET() {
  const store = await loadFullStore();
  return NextResponse.json({
    slots: store.sponsorSlots.filter((s) => s.isActive),
    orders: store.sponsorOrders.slice(0, 20),
    monthlyFundingGoalUsd: store.monthlyFundingGoalUsd,
    monthlyFundingRaisedUsd: store.monthlyFundingRaisedUsd
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payerName = String(body.payerName || "").trim();
    const payerCountry = String(body.payerCountry || "US").toUpperCase().slice(0, 4);
    const provider = (body.provider || "creem") as PaymentProvider;
    const tier = (body.tier || "gold_patron") as "diamond_b2b" | "gold_patron" | "supporter" | "pro_monthly";
    const amountUsd = Math.max(5, Number(body.amountUsd || 25));
    const tagline = String(body.tagline || "Proud supporter of free AI indie games on SYNTHPLAY.").trim();
    const targetUrl = String(body.targetUrl || "https://synthplay.games").trim();

    if (!payerName) {
      return NextResponse.json({ error: "Sponsor / brand name is required." }, { status: 400 });
    }

    const orderId = `ord-${Date.now().toString(36)}`;
    const order = {
      id: orderId,
      payerName,
      payerCountry,
      provider,
      tier,
      amountUsd,
      status: "paid" as const,
      createdAt: new Date().toISOString()
    };

    const slot =
      tier === "diamond_b2b" || tier === "gold_patron"
        ? {
            id: `sp-${Date.now().toString(36)}`,
            placement: (tier === "diamond_b2b" ? "hall_diamond" : "hall_gold") as SponsorPlacement,
            brandName: payerName.toUpperCase(),
            tagline,
            badgeLabel: tier === "diamond_b2b" ? "DIAMOND B2B" : "GOLD PATRON",
            targetUrl,
            countryCode: payerCountry,
            provider,
            monthlyUsd: amountUsd,
            isActive: true,
            clickCount: 0
          }
        : undefined;

    const { raisedUsd } = await createSponsorOrderAndSlot(order, slot);
    await appendAuditLog({
      id: `aud-${Date.now().toString(36)}`,
      actor: payerName,
      action: "SPONSOR_ORDER_CREATED",
      target: `${orderId} ($${amountUsd} via ${provider})`,
      detail: `Tier: ${tier}`,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(
      {
        ok: true,
        orderId,
        monthlyFundingRaisedUsd: raisedUsd
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid sponsorship payload." }, { status: 400 });
  }
}
