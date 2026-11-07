// Post-Stripe success page. Also acts as the IP binding step: the
// first visit from the buyer's network locks the license to that IP
// so the loader can auto-login later from the same network.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CONSUMER_PRICING } from "@/lib/pricing";
import { clientIp } from "@/lib/ip";

export default async function ReceiptPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const sp = await searchParams;
  const sessionId = sp.session;
  if (!sessionId) notFound();

  // Webhook may land a hair after Stripe redirects — poll briefly.
  let purchase = null as typeof schema.purchases.$inferSelect | null;
  for (let i = 0; i < 6 && !purchase; i++) {
    const rows = await db.select().from(schema.purchases).where(eq(schema.purchases.stripeSessionId, sessionId)).limit(1);
    purchase = rows[0] ?? null;
    if (!purchase) await new Promise(r => setTimeout(r, 500));
  }

  let license: typeof schema.licenses.$inferSelect | null = null;
  if (purchase?.licenseKey) {
    const rows = await db.select().from(schema.licenses).where(eq(schema.licenses.licenseKey, purchase.licenseKey)).limit(1);
    license = rows[0] ?? null;
  }

  // Bind the buyer's IP to this license so the loader auto-logs in later.
  // Only writes if not already bound, or if the caller IP changed.
  const ip = await clientIp();
  if (ip && license && license.ip !== ip) {
    await db.update(schema.licenses).set({ ip }).where(eq(schema.licenses.id, license.id));
    license = { ...license, ip };
  }

  return (
    <div className="grid-pattern min-h-screen flex items-center justify-center px-5 sm:px-6">
      <div className="card lift p-7 sm:p-8 w-full max-w-lg reveal">
        <Link href="/" className="flex items-center gap-2.5 font-bold mb-8 tracking-tight">
          <Logo size={28} />
          Temporary Spoofer
        </Link>

        {purchase ? (
          <>
            <div className="text-xs text-emerald-400 font-semibold uppercase mb-2">Payment received</div>
            <h1 className="text-2xl font-bold mb-2">
              Your {CONSUMER_PRICING[purchase.tier as keyof typeof CONSUMER_PRICING]?.name ?? purchase.tier} is ready.
            </h1>
            <p className="text-sm text-zinc-400 mb-6">
              We&rsquo;ve bound this pass to your network{ip ? ` (${ip})` : ""}. Run the loader from the same connection and it&rsquo;ll let you in automatically — no key to type.
            </p>
            <div className="text-sm text-zinc-400 mb-2">Open PowerShell and run:</div>
            <code className="block bg-[#0a0a0a] border border-[#26262c] rounded-lg p-3 font-mono text-xs text-zinc-300 mb-6">
              irm https://tempspoofer.com/loader | iex
            </code>
            {purchase.licenseKey && (
              <details className="text-xs text-zinc-500 mb-2">
                <summary className="cursor-pointer hover:text-zinc-300">Reference key (for support): {purchase.licenseKey}</summary>
                <div className="mt-2 text-zinc-500">You don&rsquo;t need to enter this — IP binding handles it. Keep it in case you contact support.</div>
              </details>
            )}
            <p className="text-xs text-zinc-500 mt-4">
              Changing networks (VPN, mobile tether, different Wi-Fi)? Reload this page from the new network and the binding updates to that IP.
            </p>
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
