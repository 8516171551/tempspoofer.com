// Set display name for the current account. Cookie required.
// Charset deliberately narrow so names render clean in the loader title bar
// without breaking BAML text layout.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentAccountId } from "@/lib/account";

export async function POST(req: Request) {
  const aid = await currentAccountId();
  if (!aid) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const raw = (body?.name ?? "").trim();
  if (raw.length === 0) {
    await db.update(schema.accounts).set({ displayName: null }).where(eq(schema.accounts.id, aid));
    return NextResponse.json({ ok: true, displayName: null });
  }
  if (raw.length > 24) return NextResponse.json({ error: "Max 24 characters" }, { status: 400 });
  if (!/^[A-Za-z0-9 _.\-]+$/.test(raw)) {
    return NextResponse.json({ error: "Letters, numbers, spaces and . _ - only" }, { status: 400 });
  }
  await db.update(schema.accounts).set({ displayName: raw }).where(eq(schema.accounts.id, aid));
  return NextResponse.json({ ok: true, displayName: raw });
}
