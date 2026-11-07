// Used by the RESELLER loader when a user pastes a reseller-issued key.
// Checks the key exists and is not expired. Does not touch IP or state.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { RESELLER_PRICING } from "@/lib/pricing";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { key?: string } | null;
  if (!body?.key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }
  const key = body.key.trim().toUpperCase();

  const rows = await db.select().from(schema.licenses)
    .where(eq(schema.licenses.licenseKey, key))
    .limit(1);
  const lic = rows[0];
  if (!lic) return NextResponse.json({ error: "License not found" }, { status: 404 });

  const now = new Date();
  if (lic.expiresAt && lic.expiresAt < now) {
    return NextResponse.json({ error: "License expired" }, { status: 410 });
  }

  // Pull the issuing reseller's brand (only honored when their tier includes branding).
  let brand: string | null = null;
  if (lic.resellerId) {
    const r = (await db.select().from(schema.resellers).where(eq(schema.resellers.id, lic.resellerId)).limit(1))[0];
    if (r?.brandName) {
      const plan = RESELLER_PRICING[r.tier as keyof typeof RESELLER_PRICING];
      if (plan?.features.branding) brand = r.brandName;
    }
  }

  return NextResponse.json({
    ok: true,
    tier: lic.tier,
    status: lic.status,
    expiresAt: lic.expiresAt,
    brand,
  });
}
