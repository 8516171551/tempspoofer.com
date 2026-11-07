// Login by master secret. Sets the session cookie; responds with the resolved
// account id. Rate-limited per IP to blunt brute-force on the alphabet.

import { NextResponse } from "next/server";
import { loginBySecret, setAccountCookie } from "@/lib/account";
import { clientIpFromRequest } from "@/lib/ip";
import { enforceRateLimit, SignedRequestError } from "@/lib/signed";

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  try {
    await enforceRateLimit("acc:login:ip", ip ?? "unknown", 20, 10 * 60);
  } catch (e) {
    if (e instanceof SignedRequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
  const body = (await req.json().catch(() => null)) as { secret?: string } | null;
  if (!body?.secret) return NextResponse.json({ error: "secret required" }, { status: 400 });
  const r = await loginBySecret(body.secret, ip);
  if (!r) return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  await setAccountCookie(r.id);
  return NextResponse.json({ ok: true, id: r.id });
}
