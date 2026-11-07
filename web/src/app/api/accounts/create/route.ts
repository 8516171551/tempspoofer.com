// Mint a new account bound to the caller's IP. Returns the master secret ONCE
// (bcrypt-stored; never recoverable). Rate-limited so a bored visitor can't
// burn a thousand rows minting throwaway accounts.

import { NextResponse } from "next/server";
import { createAccount, setAccountCookie } from "@/lib/account";
import { clientIpFromRequest } from "@/lib/ip";
import { enforceRateLimit, SignedRequestError } from "@/lib/signed";

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  try {
    await enforceRateLimit("acc:create:ip", ip ?? "unknown", 5, 60 * 60); // 5/hr/IP
  } catch (e) {
    if (e instanceof SignedRequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
  const { id, secret } = await createAccount(ip);
  await setAccountCookie(id);
  return NextResponse.json({ ok: true, id, secret });
}
