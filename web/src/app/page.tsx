import Link from "next/link";
import { CONSUMER_PRICING, RESELLER_PRICING, fmtUsd } from "@/lib/pricing";
import { Logo } from "@/components/Logo";

const CONSUMER_ORDER: Array<keyof typeof CONSUMER_PRICING> = ["day", "week", "month"];
const RESELLER_ORDER: Array<keyof typeof RESELLER_PRICING> = ["starter", "pro", "enterprise"];

export default function Home() {
  return (
    <div className="grid-pattern min-h-screen">
      <Nav />
      <Hero />
      <Features />
      <ConsumerPricing />
      <Reseller />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="border-b border-[#1e1e23] backdrop-blur sticky top-0 z-30 bg-[#0a0a0a]/80">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-[15px] sm:text-[16px] reveal-fast tracking-tight">
          <Logo size={28} />
          Temporary Spoofer
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
          <a href="#features" className="navlink">Features</a>
          <a href="#pricing"  className="navlink">Pricing</a>
          <a href="#reseller" className="navlink">Reseller</a>
          <Link href="/login" className="navlink">Reseller login</Link>
        </nav>
        <a href="#pricing" className="btn btn-primary text-[13px] sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5">Get a key</a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 pt-14 sm:pt-20 pb-20 sm:pb-24 text-center">
      <div className="reveal inline-flex items-center gap-2 border border-[#26262c] bg-[#111113] rounded-full px-3 py-1 text-xs text-zinc-400 mb-6">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        Live now — per-session passes from $2.99
      </div>
      <h1 className="reveal d-50 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
        Spoof your <span className="bg-gradient-to-r from-brand-300 to-brand-200 bg-clip-text text-transparent">hardware</span>.<br />
        Only when you need it.
      </h1>
      <p className="reveal d-100 mt-5 sm:mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto px-2">
        Pay once, get a key by email, paste it into the loader. No account, no subscription. The spoof rolls back when the window ends.
      </p>
      <div className="reveal d-150 mt-8 sm:mt-10 flex items-center justify-center gap-3 flex-wrap">
        <a href="#pricing" className="btn btn-primary">See pricing</a>
        <a href="#features" className="btn btn-ghost">How it works</a>
      </div>
      <div className="reveal d-200 mt-8 sm:mt-10 inline-block max-w-full">
        <code className="block bg-[#111113] border border-[#26262c] rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm text-zinc-300 font-mono overflow-x-auto">
          irm https://tempspoofer.com/loader | iex
        </code>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { title: "No account to make",     body: "Buy, open your email, paste the key. That's it." },
    { title: "Per-session passes",     body: "Pay for exactly the window you need. 24 hours, 7 days, or 30 days." },
    { title: "One-file loader",        body: "No installer, no dependencies. Download loader.exe, paste your key, click spoof." },
    { title: "Rollback on expiry",     body: "When the pass ends the spoof reverts. No residue left behind." },
    { title: "Reseller program",       body: "Sell under your own brand. Panel access and Discord bot included at Pro." },
    { title: "Windows 10 & 11",        body: "x64 only. Standard retail builds." },
  ];
  return (
    <section id="features" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-24">
      <h2 className="reveal text-3xl sm:text-4xl font-bold mb-3">What you get.</h2>
      <p className="reveal d-50 text-zinc-400 mb-10 sm:mb-12 max-w-xl">A loader that does exactly what it says. Nothing hidden, nothing bundled.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.map((it, i) => {
          const delays = ["d-100","d-150","d-200","d-250","d-300","d-400"];
          return (
            <div key={it.title} className={`card lift p-6 reveal ${delays[i] ?? "d-500"}`}>
              <div className="w-9 h-9 rounded-md bg-brand-300/15 border border-brand-300/30 flex items-center justify-center mb-4 shadow-[inset_0_0_0_1px_rgba(178,214,248,.08)]">
                <span className="w-2 h-2 rounded-full bg-brand-300 shadow-[0_0_10px_rgba(178,214,248,.9)]"></span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{it.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{it.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ConsumerPricing() {
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-24">
      <div className="text-center mb-10 sm:mb-12">
        <h2 className="reveal text-3xl sm:text-4xl font-bold mb-3">Pick your window.</h2>
        <p className="reveal d-50 text-zinc-400 px-2">One-time payment. No account. Key arrives in your email within seconds.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
        {CONSUMER_ORDER.map((tier, i) => {
          const p = CONSUMER_PRICING[tier];
          const highlight = tier === "week";
          const delays = ["d-100","d-200","d-300"];
          return (
            <div key={tier}
                 className={`card lift p-6 sm:p-7 relative reveal ${delays[i] ?? "d-300"} ${highlight ? "border-brand-300/60 shadow-[0_0_0_1px_rgba(178,214,248,.4)]" : ""}`}>
              {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 reveal-pop d-300"><span className="price-badge">Most popular</span></div>}
              <div className="text-sm text-zinc-400 mb-2">{p.name}</div>
              <div className="text-4xl font-extrabold mb-1">{fmtUsd(p.priceCents)}</div>
              <div className="text-sm text-zinc-500 mb-6">{p.blurb}</div>
              <a
                href={`/api/stripe/checkout?kind=consumer&tier=${tier}`}
                className={`btn w-full ${highlight ? "btn-primary" : "btn-ghost"}`}
              >
                Buy {p.name}
              </a>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-zinc-500 mt-8 reveal d-400">
        Checkout via Stripe. We never see your card. The email you enter at Stripe is where we send your key.
      </p>
    </section>
  );
}

function Reseller() {
  return (
    <section id="reseller" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-24">
      <div className="text-center mb-10 sm:mb-12">
        <div className="inline-block price-badge mb-4 reveal-pop">Reseller program</div>
        <h2 className="reveal d-50 text-3xl sm:text-4xl font-bold mb-3">Sell under your own brand.</h2>
        <p className="reveal d-100 text-zinc-400 max-w-2xl mx-auto px-2">
          Three monthly tiers. Keys, panel access, optional branding and Discord bot. Subscribe, then we&rsquo;ll email you a link to create your account.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
        {RESELLER_ORDER.map((tier, i) => {
          const p = RESELLER_PRICING[tier];
          const delays = ["d-150","d-250","d-300"];
          return (
            <div key={tier}
                 className={`card lift p-6 sm:p-7 relative reveal ${delays[i] ?? "d-300"} ${p.highlight ? "border-brand-300/60 shadow-[0_0_0_1px_rgba(178,214,248,.4)]" : ""}`}>
              {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 reveal-pop d-400"><span className="price-badge">Most popular</span></div>}
              <h3 className="text-lg font-bold mb-2">{p.name}</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-extrabold text-brand-300">{fmtUsd(p.priceCents)}</span>
                <span className="text-sm text-zinc-500">/ month</span>
              </div>
              <ul className="space-y-2 text-sm mb-7">
                {p.features.discountCoupon > 0 ? (
                  <Feat yes>{p.features.discountCoupon}% Coupon</Feat>
                ) : (
                  <Feat yes>Infinite Keys</Feat>
                )}
                <Feat yes={p.features.panelAccess}>Panel Access</Feat>
                <Feat yes={p.features.branding}>Branding</Feat>
              </ul>
              <a
                href={`/api/stripe/checkout?kind=reseller&tier=${tier}`}
                className={`btn w-full ${p.highlight ? "btn-primary" : "btn-ghost"}`}
              >
                Subscribe
              </a>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-zinc-500 mt-8 reveal d-500">
        Already have a reseller account? <Link href="/login" className="text-brand-300 hover:underline">Log in</Link>
      </p>
    </section>
  );
}

function Feat({ yes, children }: { yes: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className={yes ? "chk" : "cross"} aria-hidden>
        {yes ? (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </span>
      <span className={yes ? "text-zinc-200" : "text-zinc-500"}>{children}</span>
    </li>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#1e1e23] mt-20 sm:mt-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 flex items-center justify-between flex-wrap gap-4">
        <div className="text-xs text-zinc-500">
          © 2026 Temporary Spoofer. Windows 10 / 11 only.
        </div>
        <div className="flex gap-5 sm:gap-6 text-sm text-zinc-400 flex-wrap">
          <Link href="/login" className="navlink">Reseller login</Link>
          <a href="#reseller" className="navlink">Become a reseller</a>
          <a href="#pricing"  className="navlink">Buy a pass</a>
        </div>
      </div>
    </footer>
  );
}
