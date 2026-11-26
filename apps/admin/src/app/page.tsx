import React from "react";
import { computeCountryPowerRankings, readStore } from "@synthplay/db";
import { AdminConsole } from "@/components/AdminConsole";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  const store = readStore();
  return (
    <AdminConsole
      initial={{
        ...store,
        countryPower: computeCountryPowerRankings(store.games)
      }}
    />
  );
}
