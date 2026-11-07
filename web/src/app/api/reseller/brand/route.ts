// Saves the reseller's public-facing brand name. Shown inside the
// rebranded loader at auth time. Requires an active reseller session
// AND a tier whose features.branding is true.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { RESELLER_PRICING } from "@/lib/pricing";

export async function POST(req: Request) {
  const s = await currentSession();
  if (!s || !s.isReseller) {
    return NextResponse.json({ error: "Reseller access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { brand?: string } | null;
  const raw = (body?.brand ?? "").trim();
  if (raw.length > 32) {
    return NextResponse.json({ error: "Brand name must be 32 characters or fewer" }, { status: 400 });
  }
  // Allow letters / numbers / spaces / dashes / dots so it renders cleanly in
  // the loader's title bar. Blocks newlines, control chars and HTML tags.
  if (raw && !/^[A-Za-z0-9 .\-_'&]+$/.test(raw)) {
    return NextResponse.json({ error: "Letters, numbers, spaces and . - _ ' & only" }, { status: 400 });
  }

  const reseller = (await db.select().from(schema.resellers).where(eq(schema.resellers.userId, s.uid)).limit(1))[0];
  if (!reseller) {
    return NextResponse.json({ error: "No reseller account" }, { status: 404 });
  }
  const plan = RESELLER_PRICING[reseller.tier as keyof typeof RESELLER_PRICING];
  if (!plan?.features.branding) {
    return NextResponse.json({ error: "Your tier does not include branding" }, { status: 403 });
  }

  const brand = raw.length === 0 ? null : raw;
  await db.update(schema.resellers).set({ brandName: brand }).where(eq(schema.resellers.id, reseller.id));
  return NextResponse.json({ ok: true, brand });
}
