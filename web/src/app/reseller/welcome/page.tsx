import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { RESELLER_PRICING } from "@/lib/pricing";

export default async function ResellerWelcomePage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const sp = await searchParams;
  const sessionId = sp.session;
  if (!sessionId) notFound();

  // Wait briefly for the webhook to create the user + setup token.
  let purchase = null as typeof schema.purchases.$inferSelect | null;
  for (let i = 0; i < 8 && !purchase; i++) {
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
            <div className="text-xs text-emerald-400 font-semibold uppercase mb-2">Subscription active</div>
            <h1 className="text-2xl font-bold mb-2">
              {RESELLER_PRICING[purchase.tier as keyof typeof RESELLER_PRICING]?.name ?? purchase.tier} is live.
            </h1>
            <p className="text-sm text-zinc-400 mb-6">
              We just emailed <span className="text-zinc-200">{purchase.email}</span> a one-time link to set your password.
              Click it to open your reseller dashboard.
            </p>
            <div className="bg-[#0a0a0a] border border-[#26262c] rounded-lg p-4 text-sm text-zinc-300 mb-6">
              Didn't get it in a minute? Check spam, or <Link href="/login" className="text-orange-400 hover:underline">log in</Link> if you already have an account on this email.
            </div>
            <Link href="/login" className="btn btn-ghost w-full">Already have a password? Log in</Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Activating your subscription…</h1>
            <p className="text-sm text-zinc-400 mb-6">Stripe is still confirming. Refresh in a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
