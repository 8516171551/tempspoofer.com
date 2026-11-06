// Called by loader.exe once the user logs in and clicks Spoof.
// Takes the key + hwid, marks the license active, returns expiry.

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { CONSUMER_PRICING, type ConsumerTier } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null) as { key?: string; hwid?: string } | null;
  if (!body?.key || !body?.hwid) {
    return NextResponse.json({ error: "key and hwid required" }, { status: 400 });
  }

  const rows = await db.select().from(schema.licenses)
    .where(and(eq(schema.licenses.licenseKey, body.key), eq(schema.licenses.userId, s.uid)))
    .limit(1);
  const lic = rows[0];
  if (!lic) return NextResponse.json({ error: "License not found" }, { status: 404 });
  if (lic.status === "expired") return NextResponse.json({ error: "License expired" }, { status: 410 });

  const tier = lic.tier as ConsumerTier;
  const hours = CONSUMER_PRICING[tier]?.durationHours ?? 24;

  if (lic.status === "active") {
    return NextResponse.json({
      ok: true, status: "active", expiresAt: lic.expiresAt,
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + hours * 3600 * 1000);
  await db.update(schema.licenses).set({
    status: "active",
    hwid: body.hwid,
    activatedAt: now,
    expiresAt,
  }).where(eq(schema.licenses.id, lic.id));

  return NextResponse.json({ ok: true, status: "active", expiresAt });
}
