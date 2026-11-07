// Minimal dashboard. Server-rendered so there's no auth flash: we resolve
// cookie → IP binding → account → license in one pass and return the full
// state. If none of those give us an account we bounce to the gate.

import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccountId, accountByIp, getAccount, activeLicenseForAccount } from "@/lib/account";
import { clientIp } from "@/lib/ip";
import { CONSUMER_PRICING, fmtUsd } from "@/lib/pricing";
import { Logo } from "@/components/Logo";
import { DashboardActions } from "./actions";

export const dynamic = "force-dynamic";

const ORDER: Array<keyof typeof CONSUMER_PRICING> = ["day", "week", "month"];

export default async function Dashboard() {
  const ip = await clientIp();
  let aid = await currentAccountId();
  if (!aid && ip) aid = (await accountByIp(ip))?.id ?? null;
  if (!aid) redirect("/");

  const acc = await getAccount(aid);
  if (!acc) redirect("/");

  const lic = await activeLicenseForAccount(aid, ip);
  const now = Date.now();
  const active = !!lic && (!lic.expiresAt || new Date(lic.expiresAt).getTime() > now);
  const expires = active && lic?.expiresAt ? new Date(lic.expiresAt) : null;
  const msLeft = expires ? expires.getTime() - now : 0;

  return (
    <main className="min-h-dvh">
      <header className="hair-b">
        <div className="max-w-[920px] mx-auto px-5 sm:px-6 h-[58px] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="text-[14px] font-medium tracking-tight">Temporary Spoofer</span>
          </Link>
          <DashboardActions />
        </div>
      </header>

      <div className="max-w-[920px] mx-auto px-5 sm:px-6 py-10 sm:py-14">
        <div className="eyebrow mb-3">[account]</div>
        <div className="flex items-baseline gap-4 flex-wrap mb-10">
          <div className="font-mono text-[22px] sm:text-[28px] text-ink">{acc.id}</div>
          <span className={`chip ${active ? "" : "opacity-60"}`}>
            <span className="chip-dot" style={active ? undefined : { background: "#6E6E6E", boxShadow: "none" }}/>
            {active ? "pass active" : "no active pass"}
          </span>
        </div>

        {/* Active-pass panel */}
        {active && lic && (
          <section className="hair-t hair-b py-8 mb-14">
            <div className="grid sm:grid-cols-3 gap-6">
              <Metric k="TIER" v={lic.tier.toUpperCase()} />
              <Metric k="EXPIRES" v={expires?.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) ?? "—"} />
              <Metric k="TIME LEFT" v={humanLeft(msLeft)} />
            </div>
          </section>
        )}

        {/* Loader command */}
        <section className="mb-14">
          <div className="eyebrow mb-3">[loader]</div>
          <div className="hair-t hair-b py-6">
            <pre className="font-mono text-ink overflow-x-auto whitespace-nowrap" style={{ fontSize: "clamp(11px, 2.6vw, 20px)" }}>
              <span className="text-ink-3">PS&gt;</span> irm https://tempspoofer.com/loader | iex
            </pre>
          </div>
          <p className="mt-3 text-[12px] text-ink-3 font-mono">
            Paste into PowerShell. Your pass auto-attaches from this IP.
          </p>
        </section>

        {/* Buy / extend passes */}
        <section className="mb-14">
          <div className="eyebrow mb-3">[{active ? "extend" : "get a pass"}]</div>
          <div className="hair-t">
            {ORDER.map((tier) => {
              const p = CONSUMER_PRICING[tier];
              return (
                <a
                  key={tier}
                  href={`/api/stripe/checkout?kind=consumer&tier=${tier}`}
                  className="row-link hair-b block px-4 sm:px-5 py-5 sm:py-6"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="display text-[26px] sm:text-[32px] leading-none tracking-tight">{p.name}</div>
                      <div className="mt-1 text-[12px] text-ink-3 font-mono">{p.blurb}</div>
                    </div>
                    <div className="display text-[28px] sm:text-[36px] text-ink shrink-0">{fmtUsd(p.priceCents)}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Reseller block only if applicable */}
        {acc.isReseller && (
          <section className="mb-14">
            <div className="eyebrow mb-3">[reseller]</div>
            <p className="text-[13px] text-ink-2 mb-3">
              You have a reseller subscription. Panel + brand config: {" "}
              <Link href="/reseller" className="underline underline-offset-4 text-ink">open reseller panel</Link>.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{k}</div>
      <div className="font-mono text-[15px] sm:text-[17px] text-ink">{v}</div>
    </div>
  );
}

function humanLeft(ms: number): string {
  if (ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
