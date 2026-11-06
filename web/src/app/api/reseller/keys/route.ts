import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { newLicenseKey } from "@/lib/keys";
import { CONSUMER_PRICING, RESELLER_PRICING } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await currentSession();
  if (!s || !s.isReseller) {
    return NextResponse.json({ error: "Reseller access required" }, { status: 403 });
  }
  const body = await req.json().catch(() => null) as { tier?: string; count?: number } | null;
  const tier = body?.tier;
  const count = Math.max(1, Math.min(50, Number(body?.count ?? 1)));
  if (!tier || !(tier in CONSUMER_PRICING)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const reseller = (await db.select().from(schema.resellers).where(eq(schema.resellers.userId, s.uid)).limit(1))[0];
  if (!reseller || reseller.status !== "active") {
    return NextResponse.json({ error: "Reseller is not active" }, { status: 403 });
  }

  const plan = RESELLER_PRICING[reseller.tier as keyof typeof RESELLER_PRICING];
  if (!plan.features.infiniteKeys && count > 5) {
    return NextResponse.json({ error: "Your tier is limited to 5 keys per batch" }, { status: 403 });
  }

  const rows = Array.from({ length: count }, () => ({
    licenseKey: newLicenseKey(),
    tier,
    resellerId: reseller.id,
    status: "unused",
  }));
  const inserted = await db.insert(schema.licenses).values(rows).returning();
  return NextResponse.json({ ok: true, keys: inserted.map(r => r.licenseKey) });
}
