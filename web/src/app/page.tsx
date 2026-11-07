import Link from "next/link";
import { CONSUMER_PRICING, RESELLER_PRICING, fmtUsd } from "@/lib/pricing";
import { Logo } from "@/components/Logo";

const CONSUMER_ORDER: Array<keyof typeof CONSUMER_PRICING> = ["day", "week", "month"];
const RESELLER_ORDER: Array<keyof typeof RESELLER_PRICING> = ["starter", "pro", "enterprise"];

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Principles />
        <Pricing />
        <Reseller />
        <Loader />
      </main>
      <Footer />
    </>
  );
}

/* ============================================================
   NAV — sticky hairline, no chrome
   ============================================================ */
function Nav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0A0A0A]/70 hair-b">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[58px] sm:h-[62px] flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 reveal-fast min-w-0">
          <Logo size={22} />
          <span className="text-[13px] sm:text-[14px] font-medium tracking-tight truncate">Temporary&nbsp;Spoofer</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#principles" className="navlink">Principles</a>
          <a href="#pricing"    className="navlink">Pricing</a>
          <a href="#reseller"   className="navlink">Reseller</a>
          <a href="#loader"     className="navlink">Loader</a>
          <Link href="/login"   className="navlink">Log in</Link>
        </nav>
        <a href="#pricing" className="btn btn-primary text-[12px] sm:text-[13px] py-2 sm:py-2.5 px-3.5 sm:px-5 whitespace-nowrap">
          Get a key <span className="arrow hidden sm:inline">→</span>
        </a>
      </div>
    </header>
  );
}

/* ============================================================
   HERO — serif display, aura, orbital mark
   ============================================================ */
function Hero() {
  return (
    <section className="relative overflow-hidden hair-b">
      <div className="aura" />
      <div className="relative max-w-[1240px] mx-auto px-5 sm:px-6 pt-12 pb-20 sm:pt-28 sm:pb-40">
        <div className="chip reveal mb-8 sm:mb-10 max-w-full">
          <span className="chip-dot" />
          <span className="truncate">HWID banned? One command away.</span>
        </div>

        <h1 className="reveal d-100 display d-hero tracking-[-0.04em] max-w-5xl">
          Walk back in<br/>
          with <span className="text-brand-300">a new</span> machine.
        </h1>

        <p className="reveal d-200 lead mt-6 sm:mt-10 max-w-2xl">
          Rotate every hardware identifier Windows hands out to anti-cheats, launchers, and
          licensing stacks &mdash; <span className="text-ink">MAC address, disk serial, SMBIOS GUID,
          TPM endorsement, machine SID, computer name</span>. Pay for a window, press Spoof,
          walk back in. When the timer ends it reverts automatically.
        </p>

        {/* identifier grid — 2 cols on phone, 3 on sm, 6 on md+ */}
        <div className="reveal d-300 mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-px bg-[#1C1C1C] border border-[#1C1C1C] rounded-xl overflow-hidden max-w-4xl">
          {[
            ["MAC",    "network card"],
            ["DISK",   "drive serials"],
            ["SMBIOS", "motherboard GUID"],
            ["TPM",    "endorsement key"],
            ["SID",    "machine identity"],
            ["NAME",   "computer name"],
          ].map(([k, v]) => (
            <div key={k} className="bg-[#0B0B0B] px-3 sm:px-4 py-3.5 sm:py-5">
              <div className="font-mono text-[10px] tracking-widest text-ink-3">{k}</div>
              <div className="text-[12px] sm:text-[13px] text-ink mt-1 leading-tight">{v}</div>
            </div>
          ))}
        </div>

        <div className="reveal d-400 mt-8 sm:mt-12 flex items-stretch sm:items-center gap-3 flex-col sm:flex-row">
          <a href="#pricing" className="btn btn-brand justify-center">From $2.99 &mdash; buy a pass <span className="arrow">→</span></a>
          <a href="#loader"  className="btn btn-ghost justify-center">How it runs</a>
        </div>
      </div>

      {/* bottom meta strip */}
      <div className="hair-t">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 text-[10px] sm:text-[11px] text-ink-3 font-mono tracking-wider uppercase">
          <span>24h &middot; 7d &middot; 30d</span>
          <span className="hidden sm:inline">Windows 10 &middot; 11 (x64)</span>
          <span className="text-right">reverts on expiry</span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PRINCIPLES — numbered two-col layout, hairline cells
   ============================================================ */
function Principles() {
  const items = [
    { n: "01", t: "No account, no login",     b: "Pay. Check your email. Paste the key once. That's the entire onboarding." },
    { n: "02", t: "Rotates everything",       b: "MAC, disk serial, SMBIOS GUID, TPM endorsement, machine SID, computer name. Not just one or two." },
    { n: "03", t: "Reverts automatically",    b: "When your window ends the loader restores every original value. No manual cleanup." },
    { n: "04", t: "One command, no setup",    b: "A single PowerShell line starts it. No installer wizard, no admin elevation prompts past the first UAC." },
    { n: "05", t: "Windows 10 & 11",          b: "Standard retail x64 builds. Tested on fresh installs, updated installs, and custom partitioned systems." },
    { n: "06", t: "Reseller program",         b: "Sell it under your own brand. Panel, keys, custom-branded loader in your customer's taskbar." },
  ];
  return (
    <section id="principles" className="hair-b">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 py-16 sm:py-32">
        <div className="grid md:grid-cols-[1fr_2fr] gap-8 md:gap-16">
          <div className="reveal">
            <div className="eyebrow mb-4 sm:mb-6">[01] — how it works</div>
            <h2 className="display d-lg tracking-tight">
              Nothing clever.<br/>Just every<br/>identifier.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8 sm:gap-y-12 mt-6 md:mt-0">
            {items.map((it, i) => (
              <div key={it.n} className={`reveal d-${100 + Math.min(i, 5) * 60}`}>
                <div className="eyebrow mb-2.5 sm:mb-3">{it.n}</div>
                <h3 className="text-[17px] sm:text-[18px] font-medium tracking-tight mb-1.5">{it.t}</h3>
                <p className="text-[14px] leading-relaxed text-ink-2">{it.b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PRICING — horizontal rows, big display numbers, no cards
   ============================================================ */
function Pricing() {
  return (
    <section id="pricing" className="hair-b">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 pt-16 sm:pt-32 pb-6 sm:pb-8">
        <div className="eyebrow reveal mb-4 sm:mb-6">[02] — passes</div>
        <div className="grid md:grid-cols-[1fr_1fr] gap-6 md:gap-10 items-end mb-10 sm:mb-16">
          <h2 className="reveal d-50 display d-xl tracking-tight">
            Pick your<br/>window.
          </h2>
          <p className="reveal d-150 lead md:text-right max-w-md md:ml-auto">
            One payment, no subscription. Stripe fires the key straight to your inbox. The window starts the moment you press <span className="font-mono text-ink">Spoof</span>, not the moment you pay.
          </p>
        </div>
      </div>

      {/* Rows — on mobile: 2 rows per card (name/price + blurb). On md+: single horizontal row. */}
      <div className="hair-t">
        <div className="max-w-[1240px] mx-auto">
          {CONSUMER_ORDER.map((tier, i) => {
            const p = CONSUMER_PRICING[tier];
            return (
              <a
                key={tier}
                href={`/api/stripe/checkout?kind=consumer&tier=${tier}`}
                className={`row-link hair-b block px-5 sm:px-6 py-7 sm:py-14 reveal d-${100 + i * 100}`}
              >
                {/* top line on mobile: name + big price */}
                <div className="flex items-start justify-between gap-4 md:grid md:grid-cols-[120px_1fr_auto_auto_auto] md:items-baseline md:gap-6">
                  <span className="hidden md:block eyebrow self-center">0{i + 1}</span>
                  <div className="min-w-0 flex-1 md:flex-initial">
                    <div className="flex items-center gap-2 md:hidden mb-1">
                      <span className="eyebrow">0{i + 1}</span>
                    </div>
                    <div className="display tracking-tight leading-none text-[38px] sm:text-5xl">{p.name}</div>
                    <div className="mt-2 text-[12px] sm:text-[13px] text-ink-3 font-mono">{p.blurb} · {p.durationHours}h window</div>
                  </div>
                  <div className="hidden md:block text-[12px] text-ink-3 font-mono uppercase">single activation</div>
                  <div className="display text-[44px] sm:text-6xl text-ink shrink-0">{fmtUsd(p.priceCents)}</div>
                  <div className="hidden md:block text-ink-3 text-xl">→</div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <p className="max-w-[1240px] mx-auto px-5 sm:px-6 py-5 sm:py-6 text-[11px] sm:text-[12px] text-ink-3 font-mono">
        Checkout via Stripe. We never see your card. The email you enter at Stripe is where the key lands.
      </p>
    </section>
  );
}

/* ============================================================
   RESELLER — monospace table w/ brand accent
   ============================================================ */
function Reseller() {
  return (
    <section id="reseller" className="hair-b">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 pt-16 sm:pt-32 pb-16 sm:pb-24">
        <div className="eyebrow reveal mb-4 sm:mb-6">[03] — reseller program</div>
        <div className="grid md:grid-cols-[1fr_1fr] gap-6 md:gap-10 items-end mb-10 sm:mb-16">
          <h2 className="reveal d-50 display d-xl tracking-tight">
            Sell under<br/>your own brand.
          </h2>
          <p className="reveal d-150 lead md:text-right max-w-md md:ml-auto">
            Subscribe, pick a brand name in your dashboard, hand the one-liner to your customers. Their loader shows your mark.
          </p>
        </div>

        <div className="hair-t -mx-5 sm:-mx-6">
          {RESELLER_ORDER.map((tier, i) => {
            const p = RESELLER_PRICING[tier];
            return (
              <a
                key={tier}
                href={`/api/stripe/checkout?kind=reseller&tier=${tier}`}
                className={`row-link hair-b block px-5 sm:px-6 py-7 sm:py-14 reveal d-${100 + i * 100}`}
              >
                <div className="flex items-start justify-between gap-4 md:grid md:grid-cols-[120px_1fr_1fr_auto_auto] md:items-baseline md:gap-6">
                  <span className="hidden md:block eyebrow self-center">{p.highlight ? "popular" : "0" + (i + 1)}</span>
                  <div className="min-w-0 flex-1 md:flex-initial">
                    <div className="flex items-center gap-2 md:hidden mb-1">
                      <span className="eyebrow">{p.highlight ? "popular" : "0" + (i + 1)}</span>
                    </div>
                    <div className="display tracking-tight leading-none text-[34px] sm:text-5xl">{p.name}</div>
                    <div className="mt-2 text-[12px] sm:text-[13px] text-ink-3 font-mono">
                      {p.features.infiniteKeys ? "infinite keys" : `${p.features.discountCoupon}% coupon`}
                      {p.features.branding ? " · custom brand" : ""}
                      {p.features.panelAccess ? " · panel" : ""}
                    </div>
                  </div>
                  <div className="hidden md:block text-[12px] text-ink-3 font-mono uppercase">monthly</div>
                  <div className="display text-[40px] sm:text-6xl text-brand-300 shrink-0">{fmtUsd(p.priceCents)}</div>
                  <div className="hidden md:block text-ink-3 text-xl">→</div>
                </div>
              </a>
            );
          })}
        </div>

        <p className="mt-5 sm:mt-6 text-[11px] sm:text-[12px] text-ink-3 font-mono">
          Already a reseller? <Link href="/login" className="text-ink underline underline-offset-4">Log in</Link>.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   LOADER — the one-liner, big and mono
   ============================================================ */
function Loader() {
  return (
    <section id="loader" className="hair-b">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 py-16 sm:py-32">
        <div className="eyebrow reveal mb-4 sm:mb-6">[04] — loader</div>
        <h2 className="reveal d-50 display d-xl tracking-tight mb-8 sm:mb-10">
          One line.<br/>No wizard.
        </h2>
        <div className="reveal d-150 hair-t hair-b py-6 sm:py-12">
          <pre className="font-mono text-ink overflow-x-auto whitespace-nowrap" style={{ fontSize: "clamp(11px, 2.6vw, 28px)" }}>
            <span className="text-ink-3">PS&gt;</span> irm https://tempspoofer.com/loader | iex
          </pre>
        </div>
        <p className="reveal d-250 mt-5 sm:mt-6 text-[12px] sm:text-[13px] text-ink-3 font-mono">
          Paste it into PowerShell after your pass arrives. The loader opens, you press Spoof, you&rsquo;re in.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER — minimal, hairline, no gradient
   ============================================================ */
function Footer() {
  return (
    <footer>
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 py-10 sm:py-16 grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8 md:gap-10">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="text-[14px] font-medium tracking-tight">Temporary Spoofer</span>
          </Link>
          <p className="mt-4 text-[13px] text-ink-3 max-w-xs">
            Short-term HWID spoofer. Windows 10 and 11 only.
          </p>
        </div>
        <FooterCol title="Product" links={[
          ["Pricing",  "#pricing"],
          ["Loader",   "#loader"],
          ["Reseller", "#reseller"],
        ]} />
        <FooterCol title="Account" links={[
          ["Reseller login", "/login"],
        ]} />
        <FooterCol title="System" links={[
          ["Status", "https://status.tempspoofer.com"],
        ]} />
      </div>
      <div className="hair-t">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6 py-5 sm:py-6 flex items-center justify-between gap-3 text-[10px] sm:text-[11px] font-mono text-ink-3">
          <span>© 2026 TEMPORARY SPOOFER</span>
          <span>v2 · build DAWN</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="eyebrow mb-4">{title}</div>
      <ul className="space-y-2.5">
        {links.map(([t, h]) => (
          <li key={t}><a href={h} className="navlink text-ink">{t}</a></li>
        ))}
      </ul>
    </div>
  );
}
