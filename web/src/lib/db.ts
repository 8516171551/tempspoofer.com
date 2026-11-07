import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { DDL } from "./ddl";

const url = process.env.DATABASE_URL;
if (!url) {
  // Not fatal at module load — some routes (like /loader) don't touch the DB.
  // Any route that does touch it and finds no url will throw on first query.
  console.warn("[ts] DATABASE_URL is not set");
}

const client = url ? neon(url) : null;

export const db = client
  ? drizzle(client, { schema })
  : (new Proxy({}, {
      get() {
        throw new Error("DATABASE_URL is not configured");
      },
    }) as ReturnType<typeof drizzle>);

// ---------------------------------------------------------------------------
// Auto-migrate on cold-start. Idempotent — every DDL statement uses
// IF NOT EXISTS, so running the whole list on every process boot is cheap
// (couple hundred ms for a dozen round-trips, once per lambda lifetime).
//
// Fired by src/instrumentation.ts when Next.js spins up a Node runtime,
// and any route can also `await ensureSchema()` defensively — the promise
// is memoized, so repeat callers get the cached resolved value for free.
//
// Why this exists: we got caught shipping a route that SELECTed a column
// before the ALTER had been applied to the live DB. Manual bootstrap curls
// are fragile and easy to forget. Now the migration runs with the deploy.
// ---------------------------------------------------------------------------

let bootstrapPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!client) return Promise.resolve();
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const t0 = Date.now();
    let okCount = 0;
    let failCount = 0;
    for (const stmt of DDL) {
      try {
        await db.execute(sql.raw(stmt));
        okCount++;
      } catch (e) {
        failCount++;
        console.error("[ensureSchema] step failed:", (e as Error).message);
      }
    }
    const ms = Date.now() - t0;
    console.log(`[ensureSchema] ${okCount}/${DDL.length} applied (${failCount} failed) in ${ms}ms`);
  })();
  return bootstrapPromise;
}

export { schema };
