// The gate. Three mutually-exclusive states, all handled server-side so the
// decision is made before the first paint — no flashing content.
//
//   1. Cookie or IP binding resolves an account → redirect to /dashboard
//   2. Fresh visitor, no code → show "create account" + "I have a code"
//
// Account creation + master-code confirmation happen in GateClient (below).

import { redirect } from "next/navigation";
import { currentAccountId, accountByIp, getAccount } from "@/lib/account";
import { clientIp } from "@/lib/ip";
import { GateClient } from "./_components/GateClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let aid = await currentAccountId();
  const ip = await clientIp();

  if (!aid && ip) {
    const b = await accountByIp(ip);
    aid = b?.id ?? null;
  }

  if (aid) {
    const acc = await getAccount(aid);
    if (acc) redirect("/dashboard");
  }

  return <GateClient />;
}
