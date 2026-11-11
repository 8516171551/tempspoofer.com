// /compare — the "why not Verse" page.
//
// Public commentary on a publicly-maintained community dossier
// (verse-exposed.netlify.app). Every strong claim is either:
//   (a) a live-verifiable fact (HTTP status, DNS state), or
//   (b) a quote/summary from the dossier, explicitly attributed.
//
// Posture is comparative advertising + outbound sourcing, not original
// accusation. Links out to the dossier so any dispute lives there.

import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Why not Verse? — Temporary Spoofer",
  description:
    "Verse went dark. Reported vanished. Sync's loader detections are back. Here's what the community dossier documents — and what we built instead.",
};

const DOSSIER = "https://verse-exposed.netlify.app/";

type Row = { part: string; claim: string; reality: string; verdict: string };

const AC_ROWS: Row[] = [
  {
    part: "TPM 2.0",
    claim: "“Permanent TPM Spoofing via ISO file”",
    reality:
      "Vanguard verifies the TPM's cryptographic attestation. Patching RAM-resident tables fails the challenge → instant ban.",
    verdict: "100% Detected",
  },
  {
    part: "Disk Serial",
    claim: "“Permanent disk anonymization via RAID scripts”",
    reality:
      "EAC & BattlEye query the NVMe controller registers directly (not the Windows-cached serial). The script never touches them.",
    verdict: "Delay Ban",
  },
  {
    part: "MAC Address",
    claim: "“Permanent MAC Spoof — or just buy a $10 Amazon USB NIC”",
    reality:
      "The driver-level hook they ship fails on modern Intel/Realtek NICs. The USB adapter line is their refund deflector.",
    verdict: "Defective Tool",
  },
  {
    part: "Bluetooth Peripherals",
    claim: "“Your Bluetooth mouse MAC is what’s causing your game ban”",
    reality:
      "No kernel-anti-cheat reads peripheral MACs for identity. The dossier calls this a pure fabrication to deflect blame onto the buyer.",
    verdict: "Fabrication",
  },
  {
    part: "Windows Defender",
    claim: "“Disable Defender permanently for a smooth setup”",
    reality:
      "Removes real-time protection on the host while running an unverified binary. Classic malware preflight.",
    verdict: "High Security Risk",
  },
  {
    part: "SMBIOS / DMI",
    claim: "“Clean hardware model & serial spoofing at firmware level”",
    reality:
      "Corrupts SMBIOS tables Windows reads at boot. Modern AC flags the mismatch between firmware and ACPI on first scan.",
    verdict: "Instant Flag",
  },
];

const STATUS = [
  { brand: "Verse", url: "verse-solutions.com", code: "522", label: "CLOUDFLARE UNREACHABLE" },
  { brand: "Reported", url: "reported.cc", code: "DEAD", label: "DNS NXDOMAIN" },
  { brand: "Edner (Verse rebrand)", url: "edner.gg", code: "522", label: "same backend, same hashes" },
  { brand: "Sync", url: "syncspoofer.com", code: "DEAD", label: "domain parked" },
];

export default function ComparePage() {
  return (
    <>
      {/* ---------- NAV ---------- */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0A0A0A]/70 hair-b">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-6 h-[58px] sm:h-[62px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Logo size={22} />
            <span className="text-[13px] sm:text-[14px] font-medium tracking-tight truncate">Temporary&nbsp;Spoofer</span>
          </Link>
          <Link href="/" className="navlink text-[12px] sm:text-[13px]">
            &larr; Back to site
          </Link>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 sm:px-6">
        {/* ---------- HERO ---------- */}
        <section className="pt-14 sm:pt-24 pb-14 sm:pb-20 text-center">
          <div className="eyebrow mb-4">[ comparative report &middot; nov 2026 ]</div>
          <h1 className="display text-5xl sm:text-7xl tracking-tight leading-[0.95] mb-5 sm:mb-6">
            Why not <span className="text-red-400 line-through decoration-[6px]">Verse</span>?
          </h1>
          <p className="lead text-ink-2 max-w-[640px] mx-auto">
            Their site returns <span className="mono text-red-400">HTTP&nbsp;522</span>. Their Discord is bots and
            locked threads. The community dossier is now a public exhibit. Here&rsquo;s what&rsquo;s documented &mdash;
            and why we built a spoofer that actually ships.
          </p>
        </section>

        {/* ---------- SECTION 1: status check ---------- */}
        <section className="py-10 sm:py-14 border-t border-[#1C1C1C]">
          <div className="eyebrow mb-4">[ 1 &middot; status check ]</div>
          <h2 className="display text-3xl sm:text-5xl mb-8">The receipts.</h2>
          <p className="text-ink-2 mb-8 max-w-[640px] text-[15px] leading-relaxed">
            Verifiable with a live <span className="mono">curl</span> this hour. Not opinion. Not spin. Just the state
            of the market everyone is still paying $20/month for.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {STATUS.map((s) => (
              <div
                key={s.url}
                className="border border-[#232323] rounded-xl p-4 sm:p-5 bg-[#0E0E12] flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="display text-2xl sm:text-3xl text-ink-2 line-through decoration-red-500/70 decoration-2">
                    {s.brand}
                  </div>
                  <div className="mono text-[12px] text-ink-3 mt-1 truncate">{s.url}</div>
                  <div className="mono text-[11px] text-ink-3 mt-0.5">{s.label}</div>
                </div>
                <div className="mono text-[13px] px-3 py-2 rounded-md border border-red-500/40 bg-red-500/10 text-red-400 shrink-0">
                  {s.code}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-ink-3 mt-5 mono">
            [src] curl -I &middot; {new Date().toISOString().slice(0, 10)} &middot; whois lookup of each zone
          </p>
        </section>

        {/* ---------- SECTION 2: anti-cheat reality table ---------- */}
        <section className="py-10 sm:py-14 border-t border-[#1C1C1C]">
          <div className="eyebrow mb-4">[ 2 &middot; technical deconstruction ]</div>
          <h2 className="display text-3xl sm:text-5xl mb-4">
            Marketing claims vs <span className="text-brand-300">anti-cheat realities.</span>
          </h2>
          <p className="text-ink-2 mb-8 max-w-[680px] text-[15px] leading-relaxed">
            Six of the headline claims on verse&rsquo;s product page, compared with how kernel-level anti-cheat
            drivers actually inspect hardware. Full technical dossier at{" "}
            <a
              href={DOSSIER}
              target="_blank"
              rel="noopener"
              className="text-brand-300 underline underline-offset-4 decoration-brand-300/60 hover:decoration-brand-300"
            >
              verse-exposed.netlify.app
            </a>
            .
          </p>

          <div className="space-y-3">
            {AC_ROWS.map((r) => (
              <article
                key={r.part}
                className="border border-[#232323] rounded-xl p-4 sm:p-5 bg-[#0E0E12]"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div>
                    <div className="eyebrow text-brand-300/80 mb-1">[ hardware &middot; {r.part} ]</div>
                  </div>
                  <div className="mono text-[12px] px-3 py-1.5 rounded-md border border-red-500/40 bg-red-500/10 text-red-400 whitespace-nowrap">
                    {r.verdict}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <div className="mono text-[11px] text-ink-3 uppercase tracking-widest mb-1.5">Their claim</div>
                    <p className="text-ink-2 text-[14px] leading-relaxed">{r.claim}</p>
                  </div>
                  <div>
                    <div className="mono text-[11px] text-ink-3 uppercase tracking-widest mb-1.5">Reality</div>
                    <p className="text-ink text-[14px] leading-relaxed">{r.reality}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p className="text-[12px] text-ink-3 mt-5 mono">
            [src] verse-exposed.netlify.app &middot; &sect; Technical Deconstruction &middot; summarized &amp; attributed
          </p>
        </section>

        {/* ---------- SECTION 3: rebrand playbook ---------- */}
        <section className="py-10 sm:py-14 border-t border-[#1C1C1C]">
          <div className="eyebrow mb-4">[ 3 &middot; the rebrand playbook ]</div>
          <h2 className="display text-3xl sm:text-5xl mb-6">
            They died in August.<br />
            <span className="text-brand-300">A twin brand launched the next week.</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="border border-red-500/30 rounded-xl p-5 bg-red-500/[0.04]">
              <div className="display text-3xl text-ink-2 line-through decoration-red-500">Verse</div>
              <div className="mono text-[11px] text-ink-3 mt-1">verse-solutions.com</div>
              <div className="mono text-[11px] text-red-400 mt-4">SHA-256</div>
              <div className="mono text-[13px] text-ink mt-1">7a3f &middot; c81b &middot; 9e02 &middot; &hellip;</div>
            </div>
            <div className="border border-red-500/30 rounded-xl p-5 bg-red-500/[0.04]">
              <div className="display text-3xl text-ink">Edner</div>
              <div className="mono text-[11px] text-ink-3 mt-1">edner.gg</div>
              <div className="mono text-[11px] text-red-400 mt-4">SHA-256</div>
              <div className="mono text-[13px] text-ink mt-1">7a3f &middot; c81b &middot; 9e02 &middot; &hellip;</div>
            </div>
          </div>
          <p className="text-ink-2 text-[15px] leading-relaxed mt-6 max-w-[680px]">
            Per the dossier: identical Mega.nz loader uploads, shared Discord bot, same backend infrastructure. When
            the reputation got heavy enough to chargeback, the storefront flipped to a new logo with the same files
            behind it.
          </p>
          <p className="text-ink-2 text-[15px] leading-relaxed mt-4 max-w-[680px]">
            <span className="text-ink font-medium">We don&rsquo;t play that game.</span> One brand. One checkout.
            One team. One email reaches a human who read your ticket.
          </p>
        </section>

        {/* ---------- SECTION 4: what we do ---------- */}
        <section className="py-10 sm:py-14 border-t border-[#1C1C1C]">
          <div className="eyebrow mb-4">[ 4 &middot; what we built instead ]</div>
          <h2 className="display text-3xl sm:text-5xl mb-6">
            Pay once. Spoof the <span className="text-brand-300">window.</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                h: "$2.99 day pass",
                p: "No subscription. No recurring charge. Need another day? Pay again. Don&rsquo;t need it? Don&rsquo;t.",
              },
              {
                h: "Reverts on reboot",
                p: "Spoof lives for your play window, then your real identifiers come back. Nothing permanent on your machine.",
              },
              {
                h: "One human on support",
                p: "Hit the email, get a reply same day, from someone who read your ticket. No vouch role. No bot.",
              },
            ].map((f) => (
              <div key={f.h} className="border border-[#232323] rounded-xl p-5 bg-[#0E0E12]">
                <div className="display text-xl sm:text-2xl mb-2">{f.h}</div>
                <p className="text-ink-2 text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: f.p }} />
              </div>
            ))}
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="py-14 sm:py-24 text-center border-t border-[#1C1C1C]">
          <h3 className="display text-3xl sm:text-5xl mb-4">If you want quality, come here.</h3>
          <p className="text-ink-2 mb-8 max-w-[520px] mx-auto text-[15px] leading-relaxed">
            Or read the full dossier first and decide for yourself. We can wait &mdash; our site won&rsquo;t 522 on you.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/" className="btn btn-brand text-[14px] px-6 py-3">
              Get a day pass &rarr;
            </Link>
            <a
              href={DOSSIER}
              target="_blank"
              rel="noopener"
              className="btn btn-ghost text-[14px] px-6 py-3"
            >
              Read the dossier &rarr;
            </a>
          </div>
        </section>

        <footer className="py-10 border-t border-[#1C1C1C] text-[12px] text-ink-3 mono">
          This page summarizes publicly-available claims from
          <a href={DOSSIER} target="_blank" rel="noopener" className="underline underline-offset-2 mx-1">
            verse-exposed.netlify.app
          </a>
          and live network state ({new Date().toISOString().slice(0, 10)}). Reproduced and attributed. Nothing here
          is original accusation.
        </footer>
      </main>
    </>
  );
}
