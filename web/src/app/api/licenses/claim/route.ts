// Loader-facing license activation. No session, no account — the key IS
// the authentication. Once a key is activated, it binds to the first
// HWID that claims it; subsequent claims from a different HWID are
// rejected.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CONSUMER_PRICING, type ConsumerTier } from "@/lib/pricing";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { key?: string; hwid?: string } | null;
  if (!body?.key || !body?.hwid) {
    return NextResponse.json({ error: "key and hwid required" }, { status: 400 });
  }
  const key = body.key.trim().toUpperCase();
  const hwid = body.hwid.trim();

  const rows = await db.select().from(schema.licenses)
    .where(eq(schema.licenses.licenseKey, key))
    .limit(1);
  const lic = rows[0];
  if (!lic) return NextResponse.json({ error: "License not found" }, { status: 404 });

  const now = new Date();
  if (lic.expiresAt && lic.expiresAt < now && lic.status === "active") {
    await db.update(schema.licenses).set({ status: "expired" }).where(eq(schema.licenses.id, lic.id));
    return NextResponse.json({ error: "License expired" }, { status: 410 });
  }
  if (lic.status === "expired") {
    return NextResponse.json({ error: "License expired" }, { status: 410 });
  }

  const tier = lic.tier as ConsumerTier;
  const hours = CONSUMER_PRICING[tier]?.durationHours ?? 24;

  if (lic.status === "active") {
    if (lic.hwid && lic.hwid !== hwid) {
      return NextResponse.json({ error: "License is bound to a different machine" }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      status: "active",
      expiresAt: lic.expiresAt,
      tier,
    });
  }

  const expiresAt = new Date(now.getTime() + hours * 3600 * 1000);
  await db.update(schema.licenses).set({
    status: "active",
    hwid,
    activatedAt: now,
    expiresAt,
  }).where(eq(schema.licenses.id, lic.id));

  return NextResponse.json({
    ok: true,
    status: "active",
    expiresAt,
    tier,
  });
}
