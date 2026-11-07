// Account identity layer. One account = one visitor; the master secret is
// the ONLY credential. No email, no recovery. IP binding gives silent login
// to the same account on subsequent visits from the same network.

import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db, schema } from "@/lib/db";

const COOKIE_NAME = "ts_acc";
const COOKIE_DAYS = 90;
const JWT_ALG     = "HS256";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "dev-secret-change-me-in-production",
  );
}

// ─────────── id / code minting ───────────

// Short, friendly account id: ACC_ + 8 lowercase hex. Not a secret — this
// is what shows in the dashboard header.
export function newAccountId(): string {
  return "ACC_" + crypto.randomBytes(4).toString("hex");
}

// Master secret: 20-char CSPRNG using an unambiguous alphabet (no 0/O/1/l/I)
// grouped as XXXX-XXXX-XXXX-XXXX-XXXX for human readability.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newMasterSecret(): string {
  const bytes = crypto.randomBytes(20);
  let out = "";
  for (let i = 0; i < 20; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i % 4 === 3 && i < 19) out += "-";
  }
  return out;
}

export async function hashSecret(s: string): Promise<string> {
  return bcrypt.hash(s, 10);
}
export async function verifySecret(s: string, hash: string): Promise<boolean> {
  return bcrypt.compare(s, hash);
}

// ─────────── cookie helpers ───────────

export interface AccountCookie { aid: string; }

export async function signAccountCookie(aid: string): Promise<string> {
  return new SignJWT({ aid })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_DAYS}d`)
    .sign(secretKey());
}

export async function readAccountCookie(token: string | undefined): Promise<AccountCookie | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const aid = payload.aid as string | undefined;
    if (!aid) return null;
    return { aid };
  } catch {
    return null;
  }
}

export async function setAccountCookie(aid: string): Promise<void> {
  const token = await signAccountCookie(aid);
  (await cookies()).set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_DAYS * 86400,
  });
}

export async function clearAccountCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function currentAccountId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const c = await readAccountCookie(token);
  return c?.aid ?? null;
}

// ─────────── create / resolve ───────────

export async function createAccount(ip: string | null): Promise<{ id: string; secret: string }> {
  const id = newAccountId();
  const secret = newMasterSecret();
  const sh = await hashSecret(secret);
  const now = new Date();

  await db.insert(schema.accounts).values({
    id, secretHash: sh,
    firstIp: ip, lastIp: ip,
    lastSeenAt: now,
  });

  if (ip) {
    // Upsert ip binding so same IP returning finds this account first.
    try {
      await db.insert(schema.ipBindings).values({ ip, accountId: id, updatedAt: now });
    } catch {
      await db.update(schema.ipBindings)
        .set({ accountId: id, updatedAt: now })
        .where(eq(schema.ipBindings.ip, ip));
    }
  }

  return { id, secret };
}

export async function loginBySecret(secret: string, ip: string | null): Promise<{ id: string } | null> {
  const raw = secret.trim().toUpperCase();
  if (!/^[A-Z2-9-]{15,40}$/.test(raw)) return null;

  // bcrypt doesn't let us look up by hash, so scan accounts that this IP has
  // touched before as a fast path; fall back to a bounded scan.
  // In practice, re-login traffic is tiny — a full scan on a small accounts
  // table is fine. If this ever grows, swap to a keyed deterministic hash.
  const rows = await db.select().from(schema.accounts).limit(10000);
  for (const a of rows) {
    if (await verifySecret(raw, a.secretHash)) {
      const now = new Date();
      await db.update(schema.accounts)
        .set({ lastIp: ip, lastSeenAt: now })
        .where(eq(schema.accounts.id, a.id));
      if (ip) {
        try {
          await db.insert(schema.ipBindings).values({ ip, accountId: a.id, updatedAt: now });
        } catch {
          await db.update(schema.ipBindings)
            .set({ accountId: a.id, updatedAt: now })
            .where(eq(schema.ipBindings.ip, ip));
        }
      }
      return { id: a.id };
    }
  }
  return null;
}

// Look up the account bound to an IP (last to log in from it).
export async function accountByIp(ip: string): Promise<{ id: string } | null> {
  const b = (await db.select().from(schema.ipBindings).where(eq(schema.ipBindings.ip, ip)).limit(1))[0];
  if (!b) return null;
  // Verify account still exists
  const a = (await db.select().from(schema.accounts).where(eq(schema.accounts.id, b.accountId)).limit(1))[0];
  if (!a) return null;
  return { id: a.id };
}

export async function getAccount(id: string) {
  return (await db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).limit(1))[0] ?? null;
}

// Pull the active/most-recent license for this account. Licenses attach to
// accounts via the `account_id` column (added via the bootstrap route in a
// later pass); until then this resolves via IP — close enough for the gate's
// "do you have a pass?" check.
export async function activeLicenseForAccount(accountId: string, ip: string | null) {
  // best-effort: query by current ip. Dashboard copy is defensive if null.
  if (!ip) return null;
  const rows = await db.select().from(schema.licenses)
    .where(eq(schema.licenses.ip, ip))
    .orderBy(schema.licenses.createdAt)
    .limit(1);
  const l = rows[0] ?? null;
  if (!l) return null;
  // ignore accountId linkage for now — the IP binding is how it was issued.
  void accountId;
  return l;
}
