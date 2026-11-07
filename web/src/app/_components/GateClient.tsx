"use client";

// Client-side choreography for the three gate phases:
//   choose  → create | login | learn
//   login   → paste master code
//   saved   → show new code + 3-check confirm → redirect to /dashboard

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

type Phase = "choose" | "login" | "saved";

export function GateClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("choose");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);
  const [code, setCode]   = useState<string>("");          // what we just minted
  const [input, setInput] = useState<string>("");          // login field
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

            <p className="mt-8 text-center text-[12px] text-ink-3 font-mono">
              <Link href="/learn" className="underline underline-offset-4">What is this?</Link>
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
              onClick={() => { setPhase("choose"); setErr(null); }}
              disabled={busy}
              className="btn btn-ghost w-full justify-center"
            >
              Back
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

            <div className="space-y-3 mb-6">
              {[
                "I have copied this code to a safe place (password manager, notes, printed).",
                "I understand there is no recovery, no email reset, no support override.",
                "I understand that losing this code means a brand new, empty account.",
              ].map((label, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={(e) => {
                      const c = [...checks] as [boolean, boolean, boolean];
                      c[i] = e.target.checked;
                      setChecks(c);
                    }}
                    className="mt-0.5 w-[18px] h-[18px] accent-brand-300 shrink-0"
                  />
                  <span className="text-[13px] text-ink-2 leading-snug">{label}</span>
                </label>
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
