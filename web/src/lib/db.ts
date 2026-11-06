import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

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

export { schema };
