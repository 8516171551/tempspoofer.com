// Manual schema bootstrap endpoint. Protected by AUTH_SECRET.
//
// Schema is also auto-applied on every server cold-start via
// src/instrumentation.ts → ensureSchema(). This endpoint is kept as a
// manual escape hatch — useful for forcing a migration without waiting for
// a cold-start, or for inspecting per-step results during debug.
//
// Single source of truth for the statements is src/lib/ddl.ts.

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { DDL } from "@/lib/ddl";

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

  const results: Array<{ step: number; ok: boolean; error?: string }> = [];
  for (let i = 0; i < DDL.length; i++) {
    try {
      await db.execute(sql.raw(DDL[i]));
      results.push({ step: i, ok: true });
    } catch (e) {
      results.push({ step: i, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ ok: results.every(r => r.ok), results });
}
