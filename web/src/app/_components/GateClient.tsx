"use client";

// Client-side choreography for the three gate phases:
//   choose  → create | login | learn
//   login   → paste master code
//   saved   → show new code + 3-check confirm → redirect to /dashboard

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

/* Custom-styled confirmation checkbox — native inputs are too generic for
   a gate screen where each click is a hard acknowledgement. */
function ConfirmCheck({ checked, onToggle, label }: {
  checked: boolean; onToggle: (v: boolean) => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!checked)}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg
                  border transition-colors cursor-pointer
                  ${checked
                    ? "border-brand-300/50 bg-[#0F161F]"
                    : "border-[#232323] bg-[#0C0C0C] hover:border-[#3A3A3A] hover:bg-[#101010]"}`}
      aria-pressed={checked}
    >
      <span
        className={`mt-0.5 shrink-0 w-[20px] h-[20px] rounded-md flex items-center justify-center
                    border transition-all duration-150
                    ${checked
                      ? "bg-brand-300 border-brand-300 scale-100"
                      : "bg-transparent border-[#3A3A3A] scale-95"}`}
      >
        {checked && (
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden>
            <path d="M3 8.5 L6.5 12 L13 4.5" stroke="#000" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`text-[13px] leading-snug ${checked ? "text-ink" : "text-ink-2"}`}>
        {label}
      </span>
    </button>
  );
}

type Phase = "choose" | "login" | "recover" | "recover_sent" | "saved";

export function GateClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("choose");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);
  const [code, setCode]   = useState<string>("");          // what we just minted
  const [input, setInput] = useState<string>("");          // login field
  const [email, setEmail] = useState<string>("");          // recovery email field
  const [checks, setChecks] = useState<[boolean, boolean, boolean]>([false, false, false]);

  async function createAccount() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/accounts/create", { method: "POST" });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Could not create account"); return; }
      setCode(j.secret);
      setPhase("saved");
    } finally { setBusy(false); }
  }

  async function login() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/accounts/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: input }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Invalid code"); return; }
      router.push("/dashboard");
      router.refresh();
    } finally { setBusy(false); }
  }

  async function sendRecovery() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/accounts/recover/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Could not send"); return; }
      setPhase("recover_sent");
    } finally { setBusy(false); }
  }

  function enterDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  async function copy() {
    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
  }

  const allChecked = checks[0] && checks[1] && checks[2];

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 reveal-fast">
          <Logo size={26} />
          <span className="text-[14px] font-medium tracking-tight">Temporary Spoofer</span>
        </Link>

        {phase === "choose" && (
          <section className="reveal">
            <h1 className="display text-5xl sm:text-6xl tracking-tight leading-[0.95] text-center mb-3">
              Start here.
            </h1>
            <p className="lead text-center mb-8">
              Your account is a single master code. No email, no password, no recovery.
            </p>

            <button
              onClick={createAccount}
              disabled={busy}
              className="btn btn-brand w-full justify-center mb-3"
            >
              {busy ? "Creating..." : "Create new account →"}
            </button>
            <button
              onClick={() => { setPhase("login"); setErr(null); }}
              disabled={busy}
              className="btn btn-ghost w-full justify-center"
            >
              I already have a code
            </button>

            <p className="mt-8 text-center text-[12px] text-ink-3 font-mono flex items-center justify-center gap-4 flex-wrap">
              <Link href="/learn" className="underline underline-offset-4">What is this?</Link>
              <span className="text-ink-3/50">&middot;</span>
              <Link href="/compare" className="underline underline-offset-4 text-red-400/90 hover:text-red-300">
                Why not Verse?
              </Link>
            </p>
          </section>
        )}

        {phase === "login" && (
          <section className="reveal">
            <h1 className="display text-4xl sm:text-5xl tracking-tight text-center mb-3">
              Enter your code.
            </h1>
            <p className="lead text-center mb-8">
              Paste the master code you saved when you created the account.
            </p>
            <input
              className="input mono text-center text-[15px] tracking-wider mb-3"
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
            />
            {err && <div className="text-sm text-red-400 mb-3 text-center">{err}</div>}
            <button
              onClick={login}
              disabled={busy || input.trim().length < 15}
              className="btn btn-brand w-full justify-center mb-3"
            >
              {busy ? "Checking..." : "Open my dashboard →"}
            </button>
            <button
              onClick={() => { setPhase("recover"); setErr(null); }}
              disabled={busy}
              className="btn btn-ghost w-full justify-center mb-3"
            >
              I lost my access code
            </button>
            <button
              onClick={() => { setPhase("choose"); setErr(null); }}
              disabled={busy}
              className="btn btn-ghost w-full justify-center"
            >
              Back
            </button>
          </section>
        )}

        {phase === "recover" && (
          <section className="reveal">
            <h1 className="display text-4xl sm:text-5xl tracking-tight text-center mb-3">
              Recover your account.
            </h1>
            <p className="lead text-center mb-6">
              Enter the email you used on Stripe (or the recovery email you set in your dashboard). We&rsquo;ll send a one-time link that resets your master code.
            </p>
            <input
              className="input mb-3"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            {err && <div className="text-sm text-red-400 mb-3 text-center">{err}</div>}
            <button
              onClick={sendRecovery}
              disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
              className="btn btn-brand w-full justify-center mb-3"
            >
              {busy ? "Sending..." : "Send recovery link →"}
            </button>
            <button
              onClick={() => { setPhase("login"); setErr(null); }}
              disabled={busy}
              className="btn btn-ghost w-full justify-center"
            >
              Back
            </button>
          </section>
        )}

        {phase === "recover_sent" && (
          <section className="reveal text-center">
            <div className="eyebrow mb-3">[sent]</div>
            <h1 className="display text-4xl sm:text-5xl tracking-tight mb-3">
              Check your inbox.
            </h1>
            <p className="lead mb-8">
              If <span className="text-ink mono">{email}</span> matches an account, a recovery link is
              on its way. The link works once and expires in 30 minutes.
            </p>
            <button
              onClick={() => { setPhase("choose"); setErr(null); setEmail(""); }}
              className="btn btn-ghost w-full justify-center"
            >
              Done
            </button>
          </section>
        )}

        {phase === "saved" && (
          <section className="reveal">
            <div className="eyebrow text-center mb-3">[account created]</div>
            <h1 className="display text-4xl sm:text-5xl tracking-tight text-center mb-3">
              Save this code.
            </h1>
            <p className="lead text-center mb-6">
              This is the <span className="text-ink">only</span> way back into your account.
              We don&rsquo;t keep a copy. Lose it = fresh account.
            </p>

            <div className="relative mb-2">
              <pre className="font-mono text-ink text-center text-[18px] sm:text-[22px] tracking-widest py-6 px-4 rounded-xl bg-[#0E0E0E] border border-[#2A2A2A] select-all break-all">
                {code}
              </pre>
            </div>
            <button
              onClick={copy}
              className="btn btn-ghost w-full justify-center mb-6 text-[12px] py-2"
            >
              Copy to clipboard
            </button>

            <div className="space-y-2 mb-6">
              {[
                "I have copied this code to a safe place (password manager, notes, printed).",
                "I understand there is no recovery, no email reset, no support override.",
                "I understand that losing this code means a brand new, empty account.",
              ].map((label, i) => (
                <ConfirmCheck
                  key={i}
                  checked={checks[i]}
                  onToggle={(v) => {
                    const c = [...checks] as [boolean, boolean, boolean];
                    c[i] = v;
                    setChecks(c);
                  }}
                  label={label}
                />
              ))}
            </div>

            <button
              onClick={enterDashboard}
              disabled={!allChecked}
              className="btn btn-brand w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to dashboard →
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
