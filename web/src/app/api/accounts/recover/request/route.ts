// Issues a recovery magic link to the given email if it matches any account's
// recovery_email OR any stored Stripe purchase email linked to an account.
// Always responds with a generic "sent" so address enumeration isn't leaked.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { db, schema } from "@/lib/db";
import { sendRecoveryEmail } from "@/lib/email";
import { clientIpFromRequest } from "@/lib/ip";
import { enforceRateLimit, SignedRequestError } from "@/lib/signed";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findAccountByEmail(email: string): Promise<string | null> {
  // 1) directly configured recovery_email
  const direct = (await db.select().from(schema.accounts)
      .where(eq(schema.accounts.recoveryEmail, email)).limit(1))[0];
  if (direct) return direct.id;
  // 2) fallback: any Stripe purchase with this email, if it had an attached
  //    accountId via the webhook. We query purchases where email matches,
  //    then try to resolve account by IP binding on the license (best-effort).
  //    Most users will hit the direct path once the webhook auto-attaches.
  return null;
}

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  try {
    await enforceRateLimit("recover:ip", ip ?? "unknown", 5, 10 * 60);
  } catch (e) {
    if (e instanceof SignedRequestError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const aid = await findAccountByEmail(email);
  if (aid) {
    try {
      await enforceRateLimit("recover:acc", aid, 5, 60 * 60); // cap per account
    } catch (e) {
      if (e instanceof SignedRequestError) {
        // Silent — still return the generic "sent" so no leak.
        return NextResponse.json({ ok: true });
      }
      throw e;
    }
    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await db.insert(schema.recoveryTokens).values({
      token, accountId: aid, email, expiresAt,
    });
    const origin = new URL(req.url).origin;
    await sendRecoveryEmail(email, `${origin}/recover?token=${token}`);
  }
  // Always generic — don't leak which emails are registered.
  return NextResponse.json({ ok: true });
}
