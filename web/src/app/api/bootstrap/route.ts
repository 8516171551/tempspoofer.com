// One-shot schema bootstrap. Protected by AUTH_SECRET. Runs CREATE TABLE
// IF NOT EXISTS for every table, then deletes nothing. Call once after the
// first deploy, then forget it exists.

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS ts_users (
    id              SERIAL PRIMARY KEY,
    email           TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    is_reseller     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_users_email_unique ON ts_users (email)`,

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
    user_id       INTEGER REFERENCES ts_users(id) ON DELETE SET NULL,
    reseller_id   INTEGER REFERENCES ts_resellers(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'unused',
    hwid          TEXT,
    activated_at  TIMESTAMP,
    expires_at    TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_licenses_key_unique ON ts_licenses (license_key)`,
  `CREATE INDEX IF NOT EXISTS ts_licenses_user_idx ON ts_licenses (user_id)`,
  `CREATE INDEX IF NOT EXISTS ts_licenses_reseller_idx ON ts_licenses (reseller_id)`,

  `CREATE TABLE IF NOT EXISTS ts_purchases (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER REFERENCES ts_users(id) ON DELETE SET NULL,
    reseller_id         INTEGER REFERENCES ts_resellers(id) ON DELETE SET NULL,
    stripe_session_id   TEXT NOT NULL,
    kind                TEXT NOT NULL,
    tier                TEXT NOT NULL,
    amount_cents        INTEGER NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ts_purchases_session_unique ON ts_purchases (stripe_session_id)`,
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
