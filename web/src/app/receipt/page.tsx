// Shown right after Stripe sends the buyer back from consumer checkout.
// Looks up the license by Stripe session id so the buyer can grab their
// key even if the email takes a minute to land.

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CONSUMER_PRICING } from "@/lib/pricing";

export default async function ReceiptPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const sp = await searchParams;
  const sessionId = sp.session;
  if (!sessionId) notFound();

  // Webhook may land a hair after Stripe redirects the user — try a few times.
  let purchase = null as typeof schema.purchases.$inferSelect | null;
  for (let i = 0; i < 6 && !purchase; i++) {
    const rows = await db.select().from(schema.purchases).where(eq(schema.purchases.stripeSessionId, sessionId)).limit(1);
    purchase = rows[0] ?? null;
    if (!purchase) await new Promise(r => setTimeout(r, 500));
  }

  return (
    <div className="grid-pattern min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 w-full max-w-lg">
        <Link href="/" className="flex items-center gap-2 font-bold mb-8">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          Temporary Spoofer
        </Link>

        {purchase ? (
          <>
            <div className="text-xs text-emerald-400 font-semibold uppercase mb-2">Payment received</div>
            <h1 className="text-2xl font-bold mb-2">
              Your {CONSUMER_PRICING[purchase.tier as keyof typeof CONSUMER_PRICING]?.name ?? purchase.tier} is ready.
            </h1>
            <p className="text-sm text-zinc-400 mb-6">
              We also emailed this key to <span className="text-zinc-200">{purchase.email}</span>. One activation per key.
            </p>
            {purchase.licenseKey ? (
              <div className="bg-[#0a0a0a] border border-[#26262c] rounded-lg p-4 text-center font-mono text-amber-300 tracking-wider mb-6 break-all">
                {purchase.licenseKey}
              </div>
            ) : (
              <div className="bg-[#0a0a0a] border border-[#26262c] rounded-lg p-4 text-center font-mono text-zinc-500 mb-6">
                Key provisioning… refresh in a moment.
              </div>
            )}
            <div className="text-sm text-zinc-400 mb-3">Run the loader:</div>
            <code className="block bg-[#0a0a0a] border border-[#26262c] rounded-lg p-3 font-mono text-xs text-zinc-300">
              irm https://tempspoofer.com/loader | iex
            </code>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Processing your order…</h1>
            <p className="text-sm text-zinc-400 mb-6">
              Stripe is still confirming the charge. Refresh this page in 5–10 seconds, or check your email.
            </p>
            <Link href="/" className="btn btn-ghost">Back to home</Link>
          </>
        )}
      </div>
    </div>
  );
}
