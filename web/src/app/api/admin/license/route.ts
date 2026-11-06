// Admin lookup. AUTH_SECRET gated. GET with ?session=<stripe_session_id>
// or ?key=<license_key>. Doubles as a support tool for "I lost my key".

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expect = `Bearer ${process.env.AUTH_SECRET ?? ""}`;
  if (!auth || auth !== expect) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const u = new URL(req.url);
  const session = u.searchParams.get("session");
  const key = u.searchParams.get("key");

  if (session) {
    const purchases = await db.select().from(schema.purchases)
      .where(eq(schema.purchases.stripeSessionId, session)).limit(1);
    const p = purchases[0];
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    let license = null;
    if (p.licenseKey) {
      const rows = await db.select().from(schema.licenses)
        .where(eq(schema.licenses.licenseKey, p.licenseKey)).limit(1);
      license = rows[0] ?? null;
    }
    return NextResponse.json({ purchase: p, license });
  }

  if (key) {
    const rows = await db.select().from(schema.licenses)
      .where(eq(schema.licenses.licenseKey, key.toUpperCase())).limit(1);
    const l = rows[0];
    if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ license: l });
  }

  return NextResponse.json({ error: "Pass ?session= or ?key=" }, { status: 400 });
}
