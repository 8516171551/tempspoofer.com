// Read-only license check for the loader's login window. Returns the
// tier and (if already activated) the current status/expiry, without
// binding to a HWID or mutating state. Actual activation still happens
// in /api/licenses/claim when the user presses Spoof.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

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

  return NextResponse.json({
    ok: true,
    tier: lic.tier,
    status: lic.status,
    expiresAt: lic.expiresAt,
    boundToThisMachine: null,                    // loader compares hwid itself
  });
}
