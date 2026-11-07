// Next.js instrumentation hook. Fires ONCE per server boot — on every cold
// start of a serverless function, before the first request lands.
//
// We use it to apply pending schema migrations idempotently so a deploy that
// adds a new column never races the first request that SELECTs it. The
// DDL list lives in src/lib/ddl.ts.
//
// Node runtime only — edge runtime doesn't need (and can't easily run) the
// neon-http client here.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureSchema } = await import("@/lib/db");
    await ensureSchema();
  } catch (e) {
    // Never crash the server on schema boot — individual DDL errors are
    // already swallowed in ensureSchema. This catch handles the import
    // itself failing (e.g. DATABASE_URL missing in a preview build).
    console.error("[instrumentation] ensureSchema import failed:", (e as Error).message);
  }
}
