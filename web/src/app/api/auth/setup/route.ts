// First-time reseller password creation. Consumes the one-shot token
// from the setup email, sets the password on the user, issues a session
// cookie, deletes the token.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { token?: string; password?: string } | null;
  if (!body?.token || !body?.password) {
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const now = new Date();
  const tokenRows = await db.select().from(schema.setupTokens)
    .where(and(eq(schema.setupTokens.token, body.token), gt(schema.setupTokens.expiresAt, now)))
    .limit(1);
  const t = tokenRows[0];
  if (!t) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const u = (await db.select().from(schema.users).where(eq(schema.users.id, t.userId)).limit(1))[0];
  if (!u) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const passwordHash = await hashPassword(body.password);
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, u.id));
  await db.delete(schema.setupTokens).where(eq(schema.setupTokens.id, t.id));

  const token = await signSession({ uid: u.id, email: u.email, isReseller: u.isReseller });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: true, sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
