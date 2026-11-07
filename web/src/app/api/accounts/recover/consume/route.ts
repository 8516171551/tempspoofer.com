// Consumes a recovery token:
//   - validates it's unexpired and unused
//   - marks the token used
//   - mints a FRESH master code on the recovered account (old one invalidated)
//   - rebinds the caller's IP
//   - sets the session cookie
//   - returns the new master code for the user to copy
//
// The old master code is overwritten by the new bcrypt hash — the token was
// sent to a verified-owned email, so this is the account-ownership proof.

import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  newMasterSecret, hashSecret, setAccountCookie,
} from "@/lib/account";
import { clientIpFromRequest } from "@/lib/ip";
import { enforceRateLimit, SignedRequestError } from "@/lib/signed";

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  try {
    await enforceRateLimit("recover:consume", ip ?? "unknown", 10, 10 * 60);
  } catch (e) {
    if (e instanceof SignedRequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = (body?.token ?? "").trim();
  if (!token || token.length < 24) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const row = (await db.select().from(schema.recoveryTokens)
      .where(and(eq(schema.recoveryTokens.token, token), isNull(schema.recoveryTokens.usedAt))).limit(1))[0];
  if (!row) return NextResponse.json({ error: "Invalid or already-used link" }, { status: 400 });
  if (row.expiresAt < new Date()) return NextResponse.json({ error: "Link expired" }, { status: 400 });

  // Mark used (prevents race) BEFORE issuing a new secret
  await db.update(schema.recoveryTokens).set({ usedAt: new Date() }).where(eq(schema.recoveryTokens.id, row.id));

  // Mint fresh master code
  const newSecret = newMasterSecret();
  const newHash   = await hashSecret(newSecret);
  const now = new Date();
  await db.update(schema.accounts).set({
    secretHash: newHash,
    lastIp: ip ?? null,
    lastSeenAt: now,
  }).where(eq(schema.accounts.id, row.accountId));

  // Rebind IP → account so silent-login works after recovery
  if (ip) {
    try {
      await db.insert(schema.ipBindings).values({ ip, accountId: row.accountId, updatedAt: now });
    } catch {
      await db.update(schema.ipBindings)
        .set({ accountId: row.accountId, updatedAt: now })
        .where(eq(schema.ipBindings.ip, ip));
    }
  }

  await setAccountCookie(row.accountId);
  return NextResponse.json({ ok: true, id: row.accountId, secret: newSecret });
}
