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
      <div className="max-w-[1240px] mx-auto px-6 h-[62px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 reveal-fast">
          <Logo size={24} />
          <span className="text-[14px] font-medium tracking-tight">Temporary&nbsp;Spoofer</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#principles" className="navlink">Principles</a>
          <a href="#pricing"    className="navlink">Pricing</a>
          <a href="#reseller"   className="navlink">Reseller</a>
          <a href="#loader"     className="navlink">Loader</a>
          <Link href="/login"   className="navlink">Log in</Link>
        </nav>
        <a href="#pricing" className="btn btn-primary text-[13px] py-2.5 px-5">
          Get a key <span className="arrow">→</span>
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
      <div className="relative max-w-[1240px] mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-36">
        <div className="chip reveal mb-10">
          <span className="chip-dot" /> Live now
        </div>

        <h1 className="reveal d-100 display text-[56px] sm:text-[88px] md:text-[112px] lg:text-[128px] tracking-[-0.04em] leading-[0.92] max-w-5xl">
          Spoof your<br/>
          <span className="text-brand-300">hardware</span>, on a timer.
        </h1>

        <p className="reveal d-200 lead mt-10 max-w-xl">
          Pay once. A key lands in your email. Paste it into the loader. The spoof rolls back
          when the window ends — nothing to uninstall.
        </p>

        <div className="reveal d-300 mt-12 flex items-center gap-3 flex-wrap">
          <a href="#pricing" className="btn btn-brand">Buy a pass <span className="arrow">→</span></a>
          <a href="#loader"  className="btn btn-ghost">Loader command</a>
        </div>

        {/* Orbital mark */}
        <div className="reveal d-500 hidden lg:block absolute right-10 top-20 opacity-90">
          <div className="relative w-[320px] h-[320px]">
            <div className="absolute inset-0 rounded-full border border-[#1C1C1C]" />
            <div className="absolute inset-6 rounded-full border border-[#1C1C1C]" />
            <div className="absolute inset-12 rounded-full border border-[#1C1C1C]" />
            <div className="absolute inset-0 orbit">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-brand-300 shadow-[0_0_20px_rgba(178,214,248,.9)]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Logo size={110} />
            </div>
          </div>
        </div>
      </div>

      {/* bottom meta strip */}
      <div className="hair-t">
        <div className="max-w-[1240px] mx-auto px-6 py-4 flex items-center justify-between text-[12px] text-ink-3 font-mono">
          <span>EST&nbsp;2026</span>
          <span className="hidden sm:inline">Windows&nbsp;10&nbsp;&middot;&nbsp;Windows&nbsp;11</span>
          <span>one&nbsp;file&nbsp;loader</span>
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
    { n: "01", t: "No account to make",      b: "Buy it. Open your email. Paste the key. That's the whole login." },
    { n: "02", t: "Per-session passes",      b: "24 hours, 7 days, 30 days. Pay for exactly what you need." },
    { n: "03", t: "One file. One command.",  b: "No installer. No dependencies. A PowerShell line pulls the loader into memory." },
    { n: "04", t: "Rolls back on expiry",    b: "When the window closes, the spoof reverts. No residue left on disk." },
    { n: "05", t: "Reseller program",        b: "Sell under your own brand. Keys, panel, custom loader." },
    { n: "06", t: "Windows 10 & 11",         b: "x64 retail builds. No custom kernel, no insider." },
  ];
  return (
    <section id="principles" className="hair-b">
      <div className="max-w-[1240px] mx-auto px-6 py-24 sm:py-32">
        <div className="grid md:grid-cols-[1fr_2fr] gap-10 md:gap-16">
          <div className="reveal">
            <div className="eyebrow mb-6">[01] — principles</div>
            <h2 className="display text-5xl sm:text-6xl tracking-tight leading-[0.95]">
              Built&nbsp;to<br/>do&nbsp;one thing<br/>cleanly.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-12">
            {items.map((it, i) => (
              <div key={it.n} className={`reveal d-${100 + Math.min(i, 5) * 60}`}>
                <div className="eyebrow mb-3">{it.n}</div>
                <h3 className="text-[18px] font-medium tracking-tight mb-1.5">{it.t}</h3>
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
      <div className="max-w-[1240px] mx-auto px-6 pt-24 sm:pt-32 pb-8">
        <div className="eyebrow reveal mb-6">[02] — passes</div>
        <div className="grid md:grid-cols-[1fr_1fr] gap-10 items-end mb-16">
          <h2 className="reveal d-50 display text-5xl sm:text-7xl tracking-tight leading-[0.95]">
            Pick your<br/>window.
          </h2>
          <p className="reveal d-150 lead md:text-right max-w-md md:ml-auto">
            One-time payment. No subscription. Key arrives in your email within seconds. Loader opens from a single PowerShell line.
          </p>
        </div>
      </div>

      {/* Rows */}
      <div className="hair-t">
        <div className="max-w-[1240px] mx-auto px-0">
          {CONSUMER_ORDER.map((tier, i) => {
            const p = CONSUMER_PRICING[tier];
            return (
              <a
                key={tier}
                href={`/api/stripe/checkout?kind=consumer&tier=${tier}`}
                className={`row-link hair-b grid-cols-[88px_1fr_auto_auto] md:grid-cols-[120px_1fr_auto_auto_auto] px-6 py-10 sm:py-14 items-baseline gap-6 reveal d-${100 + i * 100}`}
                style={{ display: "grid" }}
              >
                <span className="eyebrow self-center">0{i + 1}</span>
                <div>
                  <div className="display text-4xl sm:text-5xl tracking-tight leading-none">{p.name}</div>
                  <div className="mt-2 text-[13px] text-ink-3 font-mono">{p.blurb} · {p.durationHours}h window</div>
                </div>
                <div className="hidden md:block text-[12px] text-ink-3 font-mono uppercase">single activation</div>
                <div className="display text-5xl sm:text-6xl text-ink">{fmtUsd(p.priceCents)}</div>
                <div className="text-ink-3 group-hover:text-ink transition text-xl">→</div>
              </a>
            );
          })}
        </div>
      </div>

      <p className="max-w-[1240px] mx-auto px-6 py-6 text-[12px] text-ink-3 font-mono">
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
      <div className="max-w-[1240px] mx-auto px-6 pt-24 sm:pt-32 pb-24">
        <div className="eyebrow reveal mb-6">[03] — reseller program</div>
        <div className="grid md:grid-cols-[1fr_1fr] gap-10 items-end mb-16">
          <h2 className="reveal d-50 display text-5xl sm:text-7xl tracking-tight leading-[0.95]">
            Sell under<br/>your own brand.
          </h2>
          <p className="reveal d-150 lead md:text-right max-w-md md:ml-auto">
            Subscribe, pick a brand name in your dashboard, hand the one-liner to your customers. Their loader shows your mark.
          </p>
        </div>

        <div className="hair-t">
          {RESELLER_ORDER.map((tier, i) => {
            const p = RESELLER_PRICING[tier];
            return (
              <a
                key={tier}
                href={`/api/stripe/checkout?kind=reseller&tier=${tier}`}
                className={`row-link hair-b grid-cols-[88px_1fr_auto_auto] md:grid-cols-[120px_1fr_1fr_auto_auto] px-6 py-10 sm:py-14 items-baseline gap-6 reveal d-${100 + i * 100}`}
                style={{ display: "grid" }}
              >
                <span className="eyebrow self-center">{p.highlight ? "popular" : "0" + (i + 1)}</span>
                <div>
                  <div className="display text-4xl sm:text-5xl tracking-tight leading-none">{p.name}</div>
                  <div className="mt-2 text-[13px] text-ink-3 font-mono">
                    {p.features.infiniteKeys ? "infinite keys" : `${p.features.discountCoupon}% coupon`}
                    {p.features.branding ? " · custom brand" : ""}
                    {p.features.panelAccess ? " · panel" : ""}
                  </div>
                </div>
                <div className="hidden md:block text-[12px] text-ink-3 font-mono uppercase">monthly</div>
                <div className="display text-5xl sm:text-6xl text-brand-300">{fmtUsd(p.priceCents)}</div>
                <div className="text-ink-3 text-xl">→</div>
              </a>
            );
          })}
        </div>

        <p className="mt-6 text-[12px] text-ink-3 font-mono">
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
      <div className="max-w-[1240px] mx-auto px-6 py-24 sm:py-32">
        <div className="eyebrow reveal mb-6">[04] — loader</div>
        <h2 className="reveal d-50 display text-5xl sm:text-7xl tracking-tight leading-[0.95] mb-10">
          One line.<br/>No installer.
        </h2>
        <div className="reveal d-150 hair-t hair-b py-8 sm:py-12">
          <pre className="font-mono text-[15px] sm:text-[22px] md:text-[28px] text-ink overflow-x-auto">
            <span className="text-ink-3">$</span>  irm https://tempspoofer.com/loader | iex
          </pre>
        </div>
        <p className="reveal d-250 mt-6 text-[13px] text-ink-3 font-mono">
          Fileless: the exe pulls into %TEMP%, launches, and wipes itself from disk before the window even focuses.
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
      <div className="max-w-[1240px] mx-auto px-6 py-16 grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={24} />
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
        <div className="max-w-[1240px] mx-auto px-6 py-6 flex items-center justify-between text-[11px] font-mono text-ink-3">
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
