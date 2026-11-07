// Resolves the current account for the caller:
//   1) read cookie
//   2) if no cookie, check IP binding
// Returns {id, hasPass} or {id: null, ipHasAccount: bool}.

import { NextResponse } from "next/server";
import { currentAccountId, accountByIp, getAccount, activeLicenseForAccount } from "@/lib/account";
import { clientIpFromRequest } from "@/lib/ip";

export async function GET(req: Request) {
  const ip = clientIpFromRequest(req);
  let aid = await currentAccountId();
  if (!aid && ip) {
    const r = await accountByIp(ip);
    aid = r?.id ?? null;
  }
  if (!aid) {
    return NextResponse.json({ ok: true, id: null, ipHasAccount: false });
  }
  const acc = await getAccount(aid);
  if (!acc) return NextResponse.json({ ok: true, id: null, ipHasAccount: false });
  const lic = await activeLicenseForAccount(aid, ip);
  const now = Date.now();
  const active = lic && (!lic.expiresAt || new Date(lic.expiresAt).getTime() > now);
  return NextResponse.json({
    ok: true,
    id: acc.id,
    ipHasAccount: true,
    isReseller: !!acc.isReseller,
    brandName: acc.brandName ?? null,
    license: active ? {
      tier: lic.tier,
      status: lic.status,
      expiresAt: lic.expiresAt,
    } : null,
  });
}
