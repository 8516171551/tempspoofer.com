// Issues a fresh (installId, installSecret) pair for a first-contact loader.
// Called ONCE per machine on first launch; the loader stores the pair in a
// DPAPI-protected file under %APPDATA% and signs every subsequent request
// with it. Rate-limited per IP so an attacker can't spam-mint identities.

import { NextResponse } from "next/server";
import { clientIpFromRequest } from "@/lib/ip";
import { db, schema } from "@/lib/db";
import { newInstallId, newInstallSecret, enforceRateLimit, SignedRequestError } from "@/lib/signed";

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req) ?? "unknown";
  try {
    await enforceRateLimit("install:register", ip, 5, 60 * 60); // 5 installs/hr/IP
  } catch (e) {
    if (e instanceof SignedRequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const installId = newInstallId();
  const secret    = newInstallSecret();
  // NOTE: secretHash column holds the plaintext secret — see signed.ts for the
  // tradeoff rationale. Column name is kept for migration compatibility.
  await db.insert(schema.installs).values({
    installId,
    secretHash: secret,
    firstIp:    ip,
    lastIp:     ip,
    lastSeenAt: new Date(),
  });

  return NextResponse.json({
    ok: true,
    installId,
    installSecret: secret,
    serverTime:    Math.floor(Date.now() / 1000),
  }, { headers: { "cache-control": "no-store" } });
}
