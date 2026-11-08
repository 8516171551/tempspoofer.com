// Admin grant. AUTH_SECRET gated. Mints a license key for an account and
// pre-binds it to the account's current IP so the loader picks it up on next
// contact (same path as a Stripe-paid key).
//
// POST /api/admin/grant
//   body: { accountId: "ACC_...", tier: "day"|"week"|"month", hours?: number }
// Response:
//   { ok: true, licenseKey, ip, expiresAt }
//
// If `hours` is omitted the tier default is used (day=24, week=168, month=720).

import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, schema } from "@/lib/db";

const TIER_HOURS: Record<string, number> = { day: 24, week: 24 * 7, month: 24 * 30 };

function mintKey(tier: string): string {
  const prefix = `TS-${tier.toUpperCase().slice(0, 4)}`;
  const body = randomBytes(10).toString("hex").toUpperCase();
  const g = body.match(/.{1,4}/g)!.join("-");
  return `${prefix}-${g}`;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const admin = process.env.ADMIN_SECRET;
  const authSec = process.env.AUTH_SECRET;
  const ok =
    (admin   && auth === `Bearer ${admin}`) ||
    (authSec && auth === `Bearer ${authSec}`);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { accountId?: string; tier?: string; hours?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const accountId = (body.accountId ?? "").trim();
  const tier      = (body.tier ?? "day").toLowerCase();
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
  if (!(tier in TIER_HOURS)) return NextResponse.json({ error: `tier must be one of ${Object.keys(TIER_HOURS).join(", ")}` }, { status: 400 });

  // Resolve the account.
  const acc = (await db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId)).limit(1))[0];
  if (!acc) return NextResponse.json({ error: "account not found" }, { status: 404 });

  // Resolve its IP. Prefer the ip_bindings row (most recent write) then fall back
  // to accounts.lastIp. Loader activation reads licenses WHERE ip = caller IP.
  const binding = (await db.select().from(schema.ipBindings)
    .where(eq(schema.ipBindings.accountId, accountId))
    .orderBy(desc(schema.ipBindings.updatedAt))
    .limit(1))[0];
  const ip = binding?.ip ?? acc.lastIp ?? null;
  if (!ip) return NextResponse.json({ error: "account has no bound IP yet — have them visit the site first" }, { status: 409 });

  const hours = Math.max(1, Math.min(24 * 365, Math.floor(body.hours ?? TIER_HOURS[tier])));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + hours * 3600 * 1000);

  const licenseKey = mintKey(tier);

  await db.insert(schema.licenses).values({
    licenseKey,
    tier,
    ip,
    status: "active",
    activatedAt: now,
    expiresAt,
  });

  return NextResponse.json({
    ok: true,
    licenseKey,
    accountId,
    tier,
    ip,
    activatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    hours,
  });
}
