// Set / clear the recovery email on the logged-in account.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentAccountId, accountByIp, setAccountCookie } from "@/lib/account";
import { clientIpFromRequest } from "@/lib/ip";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let aid = await currentAccountId();
  if (!aid) {
    const ip = clientIpFromRequest(req);
    if (ip) aid = (await accountByIp(ip))?.id ?? null;
    if (aid) await setAccountCookie(aid);
  }
  if (!aid) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const raw = (body?.email ?? "").trim().toLowerCase();
  if (raw.length === 0) {
    await db.update(schema.accounts).set({ recoveryEmail: null }).where(eq(schema.accounts.id, aid));
    return NextResponse.json({ ok: true, email: null });
  }
  if (raw.length > 120 || !EMAIL_RE.test(raw)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  await db.update(schema.accounts).set({ recoveryEmail: raw }).where(eq(schema.accounts.id, aid));
  return NextResponse.json({ ok: true, email: raw });
}
