// Minimal dashboard. Server-rendered so there's no auth flash: we resolve
// cookie → IP binding → account → license in one pass and return the full
// state. If none of those give us an account we bounce to the gate.

import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccountId, accountByIp, getAccount, activeLicenseForAccount, setAccountCookie } from "@/lib/account";
import { clientIp } from "@/lib/ip";
import { CONSUMER_PRICING, fmtUsd } from "@/lib/pricing";
import { Logo } from "@/components/Logo";
import { DashboardActions } from "./actions";
import { NameEditor } from "./NameEditor";
import { LoaderCommand } from "./LoaderCommand";
import { EmailEditor } from "./EmailEditor";

export const dynamic = "force-dynamic";

const ORDER: Array<keyof typeof CONSUMER_PRICING> = ["day", "week", "month"];

export default async function Dashboard() {
  const ip = await clientIp();
  let aid = await currentAccountId();
  const hadCookie = !!aid;
  if (!aid && ip) aid = (await accountByIp(ip))?.id ?? null;
  if (!aid) redirect("/");
  // If we authed via IP binding alone, (re-)establish the cookie so client-
  // side calls (rename, logout, future) see an authenticated session.
  if (!hadCookie) {
    try { await setAccountCookie(aid); } catch { /* server-component cookie set may fail on reads; swallow */ }
  }

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
        <div className="flex items-center gap-4 flex-wrap mb-3">
          <NameEditor id={acc.id} initial={acc.displayName} />
          <span className={`chip ${active ? "" : "opacity-60"}`}>
            <span className="chip-dot" style={active ? undefined : { background: "#6E6E6E", boxShadow: "none" }}/>
            {active ? "pass active" : "no active pass"}
          </span>
        </div>
        {acc.displayName && (
          <div className="text-[11px] text-ink-3 font-mono mb-6">id: {acc.id}</div>
        )}
        {!acc.displayName && <div className="mb-6" />}

        {/* Recovery email — optional but surfaced early so users set it up */}
        <div className="mb-10 py-4 px-4 sm:px-5 rounded-xl border border-[#1E1E1E] bg-[#0C0C0C]">
          <EmailEditor initial={acc.recoveryEmail ?? null} />
          <p className="mt-3 text-[11.5px] text-ink-3 leading-snug">
            The only way back in if you lose your master code. Auto-attached when you pay via Stripe,
            or set it yourself above.
          </p>
        </div>

        {/* Supports + trace cleaner — tighter, only the anti-cheats we actually bypass */}
        <section className="hair-t hair-b py-5 sm:py-6 mb-10">
          <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[180px_1fr] gap-5 sm:gap-6 items-center">
            <div>
              <div className="eyebrow mb-1">[ supports ]</div>
              <div className="text-[12px] text-ink-2">tested + bypassed</div>
            </div>
            <div className="flex items-center gap-6 sm:gap-10 flex-wrap">
              {["EAC", "BattlEye"].map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300 shrink-0" style={{ boxShadow: "0 0 8px rgba(178,214,248,.9)" }} />
                  <span className="text-[15px] sm:text-[17px] font-medium text-ink tracking-tight">{n}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" style={{ boxShadow: "0 0 8px rgba(74,222,128,.9)" }} />
                <span className="text-[15px] sm:text-[17px] font-medium text-ink tracking-tight">Trace cleaner</span>
                <span className="text-[11px] text-ink-3 font-mono">on every run</span>
              </div>
            </div>
          </div>
        </section>

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
          <LoaderCommand />
          <p className="mt-3 text-[12px] text-ink-3 font-mono">
            Copy &rarr; paste into PowerShell. Your pass auto-attaches from this IP.
          </p>
        </section>

        {/* Buy / extend passes */}
        <section className="mb-14">
          <div className="eyebrow mb-3">[{active ? "extend" : "get a pass"}]</div>

          {/* Network-share perk — explicit so nobody misses it */}
          <div className="mb-5 rounded-xl border border-brand-300/30 bg-brand-300/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-brand-300/15 flex items-center justify-center">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="3.5" stroke="#B2D6F8" strokeWidth="1.6"/>
                  <path d="M3.5 10 a6.5 6.5 0 0 1 13 0" stroke="#B2D6F8" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M1 10 a9 9 0 0 1 18 0" stroke="#B2D6F8" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] sm:text-[15px] text-ink font-medium tracking-tight">
                  One key works for everyone on your real network.
                </div>
                <p className="text-[12.5px] text-ink-2 mt-1 leading-snug">
                  Unlike other providers that lock per machine, our pass binds to your <span className="text-ink">public IP</span>.
                  Buy once &mdash; everyone sharing your household router uses the same key for the entire window.
                  <span className="text-ink-3"> No seat limits.</span>
                </p>
                <p className="text-[11.5px] text-amber-300/90 mt-2 leading-snug">
                  <span className="font-semibold">Real households only.</span> Hamachi, Radmin VPN, ZeroTier,
                  Parsec, or any virtual-LAN tunnel is detected and refused by the loader. Remote friends on
                  a different public IP need their own pass.
                </p>
              </div>
            </div>
          </div>

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

        {/* FAQ — no landing page, so the honest copy lives here */}
        <section className="mb-14">
          <div className="eyebrow mb-3">[ faq ]</div>
          <div className="hair-t">
            <Faq
              q="Why is there no landing page?"
              a={<>
                Because landing pages exist to convince you. <span className="text-ink">You don&rsquo;t
                need convincing.</span>
                <br/><br/>
                If you&rsquo;re here, you&rsquo;ve already been HWID-flagged, you&rsquo;ve tried the
                free spoofers that get you delay-banned two games in, and you&rsquo;re done rolling
                dice on sketchy forum tools. We built this for ourselves first &mdash; then opened
                it up for people who know the drill&nbsp;;).
                <br/><br/>
                <span className="text-ink">Full virtualization at the hardware level.</span> Every
                identifier rotated before the anti-cheat even loads. Priced so low you&rsquo;ll
                re-buy without thinking about it. No subscriptions, no seat limits on your network,
                no support theater, no &ldquo;please reinstall Windows&rdquo; ticket replies.
                <br/><br/>
                We&rsquo;re not the same as your 0815 pasted spoofer that gets you delay-banned
                within two games. Save the five minutes of marketing copy and just run the loader.
              </>}
            />
            <Faq
              q="What anti-cheats does this work on?"
              a={<>
                <span className="text-ink">Easy Anti-Cheat (EAC)</span> and
                <span className="text-ink"> BattlEye</span> &mdash; the two biggest hardware-ban
                stacks in play. If a game ships either of those on Windows 10/11 x64, the loader
                covers it. <span className="text-ink-3">(Not Vanguard.)</span>
              </>}
            />
            <Faq
              q="Can my friends use the same key?"
              a={<>
                On the same <span className="text-ink">real</span> network, yes &mdash; and that&rsquo;s
                the big win versus other providers. Our passes bind to your <span className="text-ink">public
                IP</span>, not your machine. Everyone under your household router auto-logs in with
                the same key for the entire window. Unlimited devices, no seat limits.
                <br/><br/>
                <span className="text-amber-300">What won&rsquo;t work:</span> Hamachi, Radmin VPN,
                ZeroTier, Parsec, or any virtual-LAN tunnel. The loader detects those and refuses
                to spoof &mdash; a remote friend has a different public IP, and sharing that way is
                exactly how competitors leak passes everywhere. If your friend is on a different
                connection, they need their own pass.
              </>}
            />
            <Faq
              q="Will I get banned using this?"
              a="We spoof every identifier Windows surfaces, every run, before the anti-cheat loads. The pass window is short on purpose — you use it, you move on, nothing stays on disk to fingerprint later."
            />
            <Faq
              q="What happens when I reboot / when my pass ends?"
              a={<>
                <span className="text-ink">The spoof lives until the next reboot.</span> Every spoof
                reverts automatically when Windows restarts &mdash; even if your pass is still
                active. If you&rsquo;re still inside your window, just open the loader again and hit
                Spoof to re-apply.
                <br/><br/>
                When the <span className="text-ink">pass itself</span> expires, the key stops
                working &mdash; grab a fresh one from the panel above. Nothing stays on your machine
                either way: no residue, nothing to uninstall.
              </>}
            />
            <Faq
              q="Lost my code — how do I recover?"
              a="You can't. The code is the only credential; we store a bcrypt hash of it and cannot reverse it. Create a fresh account and buy a new pass — accounts are free to make."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="group hair-b">
      <summary className="list-none cursor-pointer py-5 sm:py-6 flex items-center justify-between gap-4">
        <span className="text-[15px] sm:text-[16px] font-medium tracking-tight text-ink">{q}</span>
        <span className="shrink-0 w-6 h-6 flex items-center justify-center text-ink-3 transition-transform group-open:rotate-45">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M8 2 V14 M2 8 H14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </span>
      </summary>
      <div className="pb-6 text-[13.5px] leading-relaxed text-ink-2 max-w-3xl">
        {a}
      </div>
    </details>
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
