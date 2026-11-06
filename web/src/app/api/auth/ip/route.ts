// IP-based auto-login for the consumer loader. The server reads the
// caller IP and returns the matching active (or unused, not expired)
// license. No request body required — the IP IS the credential.

import { NextResponse } from "next/server";
import { and, desc, eq, gte, isNull, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { clientIpFromRequest } from "@/lib/ip";

export async function GET(req: Request) {
  const ip = clientIpFromRequest(req);
  if (!ip) return NextResponse.json({ error: "Could not detect IP" }, { status: 400 });

  const now = new Date();
  const rows = await db.select().from(schema.licenses)
    .where(and(
      eq(schema.licenses.ip, ip),
      or(
        eq(schema.licenses.status, "unused"),
        and(
          eq(schema.licenses.status, "active"),
          or(isNull(schema.licenses.expiresAt), gte(schema.licenses.expiresAt, now)),
        ),
      ),
    ))
    .orderBy(desc(schema.licenses.createdAt))
    .limit(1);

  const lic = rows[0];
  if (!lic) {
    return NextResponse.json({ error: "No license on this IP", ip }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    ip,
    tier: lic.tier,
    status: lic.status,
    expiresAt: lic.expiresAt,
  });
}
