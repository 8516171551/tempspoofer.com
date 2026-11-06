import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc, count } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { RESELLER_PRICING, CONSUMER_PRICING, fmtUsd } from "@/lib/pricing";
import { GenerateKeysForm } from "./form";


export default async function ResellerPage() {
  const s = await currentSession();
  if (!s) redirect("/login");
  if (!s.isReseller) redirect("/#reseller");

  const reseller = (await db.select().from(schema.resellers).where(eq(schema.resellers.userId, s.uid)).limit(1))[0];
  if (!reseller) redirect("/#reseller");

  const tier = reseller.tier as keyof typeof RESELLER_PRICING;
  const plan = RESELLER_PRICING[tier];

  const keys = await db
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.resellerId, reseller.id))
    .orderBy(desc(schema.licenses.createdAt))
    .limit(100);

  const totalKeysRow = await db
    .select({ n: count() })
    .from(schema.licenses)
    .where(eq(schema.licenses.resellerId, reseller.id));
  const totalKeys = totalKeysRow[0]?.n ?? 0;

  const activeKeys = keys.filter(k => k.status === "active").length;
  const unusedKeys = keys.filter(k => k.status === "unused").length;

  return (
    <div className="grid-pattern min-h-screen">
      <TopBar email={s.email} />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Reseller panel</h1>
        <p className="text-zinc-400 mb-8">
          <span className="text-orange-400">{plan.name}</span> — status: {reseller.status} — slug:{" "}
          <code className="bg-[#111113] border border-[#26262c] rounded px-2 py-0.5 font-mono text-xs">{reseller.slug}</code>
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Stat label="Total keys issued" value={totalKeys.toString()} />
          <Stat label="Active" value={activeKeys.toString()} />
          <Stat label="Unused" value={unusedKeys.toString()} />
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Generate keys</h2>
            <span className="text-xs text-zinc-500">
              {plan.features.infiniteKeys ? "Infinite keys" : `${plan.features.discountCoupon}% coupon tier`}
            </span>
          </div>
          <GenerateKeysForm infinite={plan.features.infiniteKeys} />
        </div>

        {plan.features.branding && (
          <div className="card p-6 mb-6 border-amber-500/30">
            <div className="text-xs text-amber-400 font-semibold uppercase mb-2">Branding (Pro)</div>
            <p className="text-sm text-zinc-400">
              Your keys can be delivered under your own brand name. Contact support to configure your reseller storefront and loader skin.
            </p>
          </div>
        )}
        {plan.features.discordBot && (
          <div className="card p-6 mb-6 border-indigo-500/30">
            <div className="text-xs text-indigo-400 font-semibold uppercase mb-2">Discord bot (Pro)</div>
            <p className="text-sm text-zinc-400">
              Invite the Temporary Spoofer bot to your server to issue keys via slash command. Contact support for your invite link.
            </p>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Keys</h2>
          {keys.length === 0 ? (
            <div className="text-sm text-zinc-500 py-6 text-center">No keys generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-zinc-500 border-b border-[#26262c]">
                  <tr>
                    <th className="text-left py-2 pr-4">Key</th>
                    <th className="text-left py-2 pr-4">Tier</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Price if sold</th>
                    <th className="text-left py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => {
                    const consumer = CONSUMER_PRICING[k.tier as keyof typeof CONSUMER_PRICING];
                    return (
                      <tr key={k.id} className="border-b border-[#1a1a1f]">
                        <td className="py-3 pr-4 font-mono text-xs">{k.licenseKey}</td>
                        <td className="py-3 pr-4 capitalize">{k.tier}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            k.status === "active" ? "bg-emerald-500/15 text-emerald-400"
                            : k.status === "expired" ? "bg-zinc-500/15 text-zinc-500"
                            : "bg-orange-500/15 text-orange-400"
                          }`}>{k.status}</span>
                        </td>
                        <td className="py-3 pr-4 text-zinc-400">{consumer ? fmtUsd(consumer.priceCents) : "—"}</td>
                        <td className="py-3 text-zinc-400">{new Date(k.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs text-zinc-500 uppercase mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function TopBar({ email }: { email: string }) {
  return (
    <header className="border-b border-[#1e1e23] bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          Temporary Spoofer
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link href="/reseller" className="text-white font-semibold">Reseller</Link>
          <span className="text-zinc-500 hidden sm:inline">{email}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-ghost">Logout</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
