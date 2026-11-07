// Admin-only revocation. Any signed request from a revoked install is refused
// on the NEXT call it makes.
//   Authorization: Bearer <ADMIN_SECRET>
//   { installId: "..." }

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.ADMIN_SECRET ?? process.env.AUTH_SECRET ?? ""}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null) as { installId?: string } | null;
  if (!body?.installId) return NextResponse.json({ error: "installId required" }, { status: 400 });

  const r = await db.update(schema.installs)
    .set({ revokedAt: new Date() })
    .where(eq(schema.installs.installId, body.installId))
    .returning();
  if (r.length === 0) return NextResponse.json({ error: "Unknown install" }, { status: 404 });
  return NextResponse.json({ ok: true, revokedAt: r[0].revokedAt });
}
