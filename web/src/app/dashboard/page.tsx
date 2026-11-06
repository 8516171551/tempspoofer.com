import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { CONSUMER_PRICING, RESELLER_PRICING, fmtUsd } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await currentSession();
  if (!s) redirect("/login");

  const licenses = await db
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.userId, s.uid))
    .orderBy(desc(schema.licenses.createdAt))
    .limit(50);

  const reseller = s.isReseller
    ? (await db.select().from(schema.resellers).where(eq(schema.resellers.userId, s.uid)).limit(1))[0]
    : null;

  return (
    <div className="grid-pattern min-h-screen">
      <TopBar email={s.email} isReseller={s.isReseller} />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-zinc-400 mb-8">Signed in as <span className="text-zinc-200">{s.email}</span></p>

        {reseller && (
          <div className="card p-6 mb-6 border-orange-500/40">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-orange-400 font-semibold uppercase mb-1">Reseller — {reseller.tier}</div>
                <div className="font-semibold">{RESELLER_PRICING[reseller.tier as keyof typeof RESELLER_PRICING]?.name ?? reseller.tier}</div>
                <div className="text-sm text-zinc-400">Status: {reseller.status}</div>
              </div>
              <Link href="/reseller" className="btn btn-primary">Open reseller panel</Link>
            </div>
          </div>
        )}

        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Buy a pass</h2>
            <Link href="/#pricing" className="text-sm text-orange-400 hover:underline">See all →</Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {(["day", "week", "month"] as const).map((t) => {
              const p = CONSUMER_PRICING[t];
              return (
                <Link
                  key={t}
                  href={`/api/stripe/checkout?kind=consumer&tier=${t}`}
                  className="block card p-5 hover:border-orange-500/50 transition"
                >
                  <div className="text-xs text-zinc-500 mb-1">{p.name}</div>
                  <div className="text-2xl font-bold">{fmtUsd(p.priceCents)}</div>
                  <div className="text-xs text-zinc-500 mt-1">{p.blurb}</div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Your licenses</h2>
          {licenses.length === 0 ? (
            <div className="text-sm text-zinc-500 py-6 text-center">
              No licenses yet. Buy a pass above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-zinc-500 border-b border-[#26262c]">
                  <tr>
                    <th className="text-left py-2 pr-4">Key</th>
                    <th className="text-left py-2 pr-4">Tier</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Activated</th>
                    <th className="text-left py-2">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((l) => (
                    <tr key={l.id} className="border-b border-[#1a1a1f]">
                      <td className="py-3 pr-4 font-mono text-xs">{l.licenseKey}</td>
                      <td className="py-3 pr-4 capitalize">{l.tier}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          l.status === "active" ? "bg-emerald-500/15 text-emerald-400"
                          : l.status === "expired" ? "bg-zinc-500/15 text-zinc-500"
                          : "bg-orange-500/15 text-orange-400"
                        }`}>{l.status}</span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">{l.activatedAt ? new Date(l.activatedAt).toLocaleString() : "—"}</td>
                      <td className="py-3 text-zinc-400">{l.expiresAt ? new Date(l.expiresAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-zinc-500">
          Loader: <code className="bg-[#111113] border border-[#26262c] rounded px-2 py-1 font-mono text-zinc-300">irm https://tempspoofer.com/loader | iex</code>
        </div>
      </main>
    </div>
  );
}

function TopBar({ email, isReseller }: { email: string; isReseller: boolean }) {
  return (
    <header className="border-b border-[#1e1e23] bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          Temporary Spoofer
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          {isReseller && <Link href="/reseller" className="hover:text-white">Reseller</Link>}
          <span className="text-zinc-500 hidden sm:inline">{email}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-ghost">Logout</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
