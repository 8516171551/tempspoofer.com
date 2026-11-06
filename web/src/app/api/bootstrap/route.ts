// One-shot schema bootstrap. Protected by AUTH_SECRET. Runs CREATE TABLE
// IF NOT EXISTS for every table + the ALTER statements that are safe to
// re-run. Call again after any schema change.

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS ts_users (
    id              SERIAL PRIMARY KEY,
    email           TEXT NOT NULL,
    password_hash   TEXT,
    is_reseller     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_users_email_unique ON ts_users (email)`,
  // Previous version had password_hash NOT NULL; relax it for reseller-first-login flow.
  `ALTER TABLE ts_users ALTER COLUMN password_hash DROP NOT NULL`,

  `CREATE TABLE IF NOT EXISTS ts_resellers (
    id                       SERIAL PRIMARY KEY,
    user_id                  INTEGER NOT NULL REFERENCES ts_users(id) ON DELETE CASCADE,
    tier                     TEXT NOT NULL,
    slug                     TEXT NOT NULL,
    stripe_subscription_id   TEXT,
    status                   TEXT NOT NULL DEFAULT 'active',
    created_at               TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_resellers_slug_unique ON ts_resellers (slug)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_resellers_user_unique ON ts_resellers (user_id)`,

  `CREATE TABLE IF NOT EXISTS ts_licenses (
    id            SERIAL PRIMARY KEY,
    license_key   TEXT NOT NULL,
    tier          TEXT NOT NULL,
    email         TEXT,
    user_id       INTEGER REFERENCES ts_users(id) ON DELETE SET NULL,
    reseller_id   INTEGER REFERENCES ts_resellers(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'unused',
    hwid          TEXT,
    activated_at  TIMESTAMP,
    expires_at    TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE ts_licenses ADD COLUMN IF NOT EXISTS email TEXT`,
  `ALTER TABLE ts_licenses ADD COLUMN IF NOT EXISTS ip TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_licenses_key_unique ON ts_licenses (license_key)`,
  `CREATE INDEX IF NOT EXISTS ts_licenses_user_idx ON ts_licenses (user_id)`,
  `CREATE INDEX IF NOT EXISTS ts_licenses_reseller_idx ON ts_licenses (reseller_id)`,
  `CREATE INDEX IF NOT EXISTS ts_licenses_email_idx ON ts_licenses (email)`,
  `CREATE INDEX IF NOT EXISTS ts_licenses_ip_idx ON ts_licenses (ip)`,

  `CREATE TABLE IF NOT EXISTS ts_purchases (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER REFERENCES ts_users(id) ON DELETE SET NULL,
    reseller_id         INTEGER REFERENCES ts_resellers(id) ON DELETE SET NULL,
    email               TEXT,
    stripe_session_id   TEXT NOT NULL,
    kind                TEXT NOT NULL,
    tier                TEXT NOT NULL,
    amount_cents        INTEGER NOT NULL,
    license_key         TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE ts_purchases ADD COLUMN IF NOT EXISTS email TEXT`,
  `ALTER TABLE ts_purchases ADD COLUMN IF NOT EXISTS license_key TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_purchases_session_unique ON ts_purchases (stripe_session_id)`,

  `CREATE TABLE IF NOT EXISTS ts_setup_tokens (
    id            SERIAL PRIMARY KEY,
    token         TEXT NOT NULL,
    user_id       INTEGER NOT NULL REFERENCES ts_users(id) ON DELETE CASCADE,
    expires_at    TIMESTAMP NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_setup_tokens_token_unique ON ts_setup_tokens (token)`,
];

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expect = `Bearer ${process.env.AUTH_SECRET ?? ""}`;
  if (!auth || auth !== expect) {
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
