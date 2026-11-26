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

  return (
    <AdminConsole
      adminEmail={session.email}
      isDefaultPassword={isDefaultPassword}
      engine={engine}
      initial={{
        ...store,
        countryPower: computeCountryPowerRankings(store.games)
      }}
    />
  );
}
