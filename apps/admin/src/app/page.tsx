import React from "react";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  computeCountryPowerRankings,
  getAdminConfig,
  getStorageEngineInfo,
  loadFullStore,
  verifySessionToken
} from "@synthplay/db";
import { AdminConsole } from "@/components/AdminConsole";
import { AdminLogin } from "@/components/AdminLogin";
import { getGrowthChannelsStatus } from "@/lib/autoPromote";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  const { isDefaultPassword } = getAdminConfig();

  if (!session || (session.role !== "admin" && session.role !== "moderator")) {
    return <AdminLogin isDefaultPassword={isDefaultPassword} />;
  }

  const [store, engine] = await Promise.all([loadFullStore(), getStorageEngineInfo()]);
  let meiliOk = false;
  if (process.env.MEILISEARCH_URL) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 1200);
      const r = await fetch(`${process.env.MEILISEARCH_URL.replace(/\/$/, "")}/health`, { signal: ctrl.signal });
      clearTimeout(tm);
      meiliOk = r.ok;
    } catch {
      meiliOk = false;
    }
  }
  const isSet = (v?: string) => Boolean(v && !v.startsWith("your_"));
  const integrations = {
    r2: isSet(process.env.R2_ACCOUNT_ID) && isSet(process.env.R2_ACCESS_KEY_ID) && isSet(process.env.R2_SECRET_ACCESS_KEY),
    creem: isSet(process.env.CREEM_WEBHOOK_SECRET),
    kofi: isSet(process.env.KOFI_VERIFICATION_TOKEN),
    patreon: isSet(process.env.PATREON_WEBHOOK_SECRET),
    paypal: isSet(process.env.PAYPAL_CLIENT_ID) && isSet(process.env.PAYPAL_WEBHOOK_ID),
    aiTranslate: isSet(process.env.AI_TRANSLATE_API_KEY),
    aiProvider: (process.env.AI_TRANSLATE_PROVIDER || "gemini").toUpperCase(),
    meili: meiliOk,
    turnstile: isSet(process.env.TURNSTILE_SECRET_KEY)
  };
  const growthChannels = getGrowthChannelsStatus();

  return (
    <AdminConsole
      adminEmail={session.email}
      isDefaultPassword={isDefaultPassword}
      engine={engine}
      integrations={integrations}
      growthChannels={growthChannels}
      initial={{
        ...store,
        countryPower: computeCountryPowerRankings(store.games)
      }}
    />
  );
}
