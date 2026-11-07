"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export function RecoverClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [phase, setPhase] = useState<"working" | "shown" | "error">("working");
  const [code, setCode] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [checks, setChecks] = useState<[boolean, boolean, boolean]>([false, false, false]);

  useEffect(() => {
    if (!token) { setPhase("error"); setErr("Missing token in link."); return; }
    (async () => {
      try {
        const r = await fetch("/api/accounts/recover/consume", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const j = await r.json();
        if (!r.ok) { setErr(j.error ?? "Could not recover."); setPhase("error"); return; }
        setCode(j.secret);
        setPhase("shown");
      } catch {
        setErr("Network error.");
        setPhase("error");
      }
    })();
  }, [token]);

  async function copy() {
    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
  }

  const allChecked = checks[0] && checks[1] && checks[2];

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <Logo size={26} />
          <span className="text-[14px] font-medium tracking-tight">Temporary Spoofer</span>
        </Link>

        {phase === "working" && (
          <div className="text-center">
            <div className="eyebrow mb-3">[recovering]</div>
            <div className="text-ink-2">Working on it...</div>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center">
            <h1 className="display text-4xl sm:text-5xl mb-3">Link no good.</h1>
            <p className="lead mb-6">{err}</p>
            <Link href="/" className="btn btn-ghost w-full justify-center">Back to login</Link>
          </div>
        )}

        {phase === "shown" && (
          <section>
            <div className="eyebrow text-center mb-3">[new master code]</div>
            <h1 className="display text-4xl sm:text-5xl text-center mb-3">Save this code.</h1>
            <p className="lead text-center mb-6">
              Your old code is dead. This is the <span className="text-ink">only</span> way back into your account. We don&rsquo;t keep a copy.
            </p>

            <pre className="font-mono text-ink text-center text-[18px] sm:text-[22px] tracking-widest py-6 px-4 rounded-xl bg-[#0E0E0E] border border-[#2A2A2A] select-all break-all mb-2">
              {code}
            </pre>
            <button onClick={copy} className="btn btn-ghost w-full justify-center mb-6 text-[12px] py-2">
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
                    c[i] = v; setChecks(c);
                  }}
                  label={label}
                />
              ))}
            </div>

            <button
              disabled={!allChecked}
              onClick={() => { router.push("/dashboard"); router.refresh(); }}
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
      <span className={`mt-0.5 shrink-0 w-[20px] h-[20px] rounded-md flex items-center justify-center
                       border transition-all duration-150
                       ${checked ? "bg-brand-300 border-brand-300" : "bg-transparent border-[#3A3A3A]"}`}>
        {checked && (
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden>
            <path d="M3 8.5 L6.5 12 L13 4.5" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <span className={`text-[13px] leading-snug ${checked ? "text-ink" : "text-ink-2"}`}>{label}</span>
    </button>
  );
}
