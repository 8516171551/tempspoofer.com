// Activates a license. Two shapes:
//   { } with no body → IP-based: look up the license bound to the
//      caller IP (set by /receipt when the buyer came back from Stripe)
//      and flip it to active with the standard duration.
//   { key } → reseller flow: reseller-issued keys bind to the caller IP
//      on first claim (so one key = one IP).

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CONSUMER_PRICING, type ConsumerTier } from "@/lib/pricing";
import { clientIpFromRequest } from "@/lib/ip";
import { verifySignedRequest, enforceRateLimit, SignedRequestError } from "@/lib/signed";

export async function POST(req: Request) {
  const raw = await req.text();
  const ip = clientIpFromRequest(req);
  if (!ip) return NextResponse.json({ error: "Could not detect IP" }, { status: 400 });

  try {
    await enforceRateLimit("claim:ip", ip, 10, 60);
    const v = await verifySignedRequest(req, raw);
    await enforceRateLimit("claim:install", v.installId, 5, 60);
  } catch (e) {
    if (e instanceof SignedRequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  let body: { key?: string } | null = null;
  try { body = raw ? JSON.parse(raw) as { key?: string } : null; } catch { /* malformed */ }
  const key = body?.key?.trim().toUpperCase();

  let lic = key
    ? (await db.select().from(schema.licenses).where(eq(schema.licenses.licenseKey, key)).limit(1))[0]
    : (await db.select().from(schema.licenses).where(eq(schema.licenses.ip, ip)).limit(1))[0];

  if (!lic) return NextResponse.json({ error: "License not found" }, { status: 404 });

  const now = new Date();
  if (lic.status === "expired" || (lic.expiresAt && lic.expiresAt < now && lic.status === "active")) {
    if (lic.status === "active") {
      await db.update(schema.licenses).set({ status: "expired" }).where(eq(schema.licenses.id, lic.id));
    }
    return NextResponse.json({ error: "License expired" }, { status: 410 });
  }

  const tier = lic.tier as ConsumerTier;
  const hours = CONSUMER_PRICING[tier]?.durationHours ?? 24;

  if (lic.status === "active") {
    if (lic.ip && lic.ip !== ip) {
      return NextResponse.json({ error: "License is bound to a different IP" }, { status: 409 });
    }
    return NextResponse.json({
      ok: true, status: "active", expiresAt: lic.expiresAt, tier,
    });
  }

  // Unused → activate and lock the IP in now (reseller keys bind on first claim).
  if (lic.ip && lic.ip !== ip) {
    return NextResponse.json({ error: "License is bound to a different IP" }, { status: 409 });
  }

  const expiresAt = new Date(now.getTime() + hours * 3600 * 1000);
  await db.update(schema.licenses).set({
    status: "active",
    ip,
    activatedAt: now,
    expiresAt,
  }).where(eq(schema.licenses.id, lic.id));

  return NextResponse.json({ ok: true, status: "active", expiresAt, tier });
}
