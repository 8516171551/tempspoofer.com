import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc, count } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { RESELLER_PRICING, CONSUMER_PRICING, fmtUsd } from "@/lib/pricing";
import { GenerateKeysForm, BrandNameForm } from "./form";


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
          <span className="text-brand-300">{plan.name}</span> — status: {reseller.status} — slug:{" "}
          <code className="bg-[#111113] border border-[#26262c] rounded px-2 py-0.5 font-mono text-xs">{reseller.slug}</code>
        </p>

        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Stat label="Total keys issued" value={totalKeys.toString()} delay="d-50" />
          <Stat label="Active"            value={activeKeys.toString()} delay="d-100" />
          <Stat label="Unused"            value={unusedKeys.toString()} delay="d-150" />
        </div>

        <div className="card lift p-5 sm:p-6 mb-8 border-brand-300/40 reveal d-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs text-brand-300 font-semibold uppercase mb-1">Reseller loader (key-auth)</div>
              <div className="font-semibold">Hand this build to your customers</div>
              <div className="text-sm text-zinc-400 mt-1">
                Key-based login (no IP binding). Put either link on your shop.
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href="/loader-reseller.exe" className="btn btn-primary">Download .exe</a>
              <a href="/loader-reseller" className="btn btn-ghost" target="_blank">PowerShell one-liner</a>
            </div>
          </div>
          <div className="mt-4 bg-[#0a0a0a] border border-[#26262c] rounded-lg p-3 font-mono text-xs text-zinc-300 overflow-x-auto">
            irm https://tempspoofer.com/loader-reseller | iex
          </div>
        </div>

        <div className="card lift p-5 sm:p-6 mb-6 reveal d-250">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold">Generate keys</h2>
            <span className="text-xs text-zinc-500">
              {plan.features.infiniteKeys ? "Infinite keys" : `${plan.features.discountCoupon}% coupon tier`}
            </span>
          </div>
          <GenerateKeysForm infinite={plan.features.infiniteKeys} />
        </div>

        {plan.features.branding && (
          <div className="card lift p-5 sm:p-6 mb-6 border-brand-200/30 reveal d-300">
            <div className="text-xs text-brand-200 font-semibold uppercase mb-2">Branding (Pro)</div>
            <p className="text-sm text-zinc-400 mb-4">
              Your customers&rsquo; rebranded loader shows this name in place of &ldquo;Temporary Spoofer&rdquo;. Up to 32 characters; letters, numbers, spaces and <code className="text-zinc-300">. - _ &apos; &amp;</code> only. Leave blank to show the default name.
            </p>
            <BrandNameForm initial={reseller.brandName ?? ""} />
            <div className="mt-4 text-xs text-zinc-500">
              Hand this one-liner to your customers — it pulls <code className="text-zinc-300">loader-reseller.exe</code>, which auto-picks up the brand from the key they paste.
            </div>
            <div className="mt-2 bg-[#0a0a0a] border border-[#26262c] rounded-lg p-3 font-mono text-xs text-zinc-300 overflow-x-auto">
              irm https://tempspoofer.com/loader-reseller | iex
            </div>
          </div>
        )}

        <div className="card lift p-5 sm:p-6 reveal d-400">
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
                            : "bg-brand-300/15 text-brand-300"
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

function Stat({ label, value, delay = "" }: { label: string; value: string; delay?: string }) {
  return (
    <div className={`card lift p-5 reveal ${delay}`}>
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
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-300"></span>
          Temporary Spoofer
        </Link>
        <nav className="flex items-center gap-4 sm:gap-5 text-sm">
          <Link href="/dashboard" className="navlink hidden sm:inline">Dashboard</Link>
          <Link href="/reseller"  className="text-white font-semibold">Reseller</Link>
          <span className="text-zinc-500 hidden md:inline">{email}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-ghost text-[13px] px-3 py-2">Logout</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
