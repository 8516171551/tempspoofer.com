"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const resellerTier = params.get("reseller");           // starter|pro|enterprise or null
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error ?? "Registration failed");
        return;
      }
      if (resellerTier) {
        window.location.href = `/api/stripe/checkout?kind=reseller&tier=${resellerTier}`;
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-pattern min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 font-bold mb-8">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          Temporary Spoofer
        </Link>
        <h1 className="text-2xl font-bold mb-1">
          {resellerTier ? `Start reselling (${resellerTier})` : "Create your account."}
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          {resellerTier
            ? "Register, then we'll take you to Stripe to activate your subscription."
            : "Your passes and licenses will live in your dashboard."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Email</label>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Password</label>
            <input className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="text-sm text-red-400">{err}</div>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? "..." : resellerTier ? "Register & continue to Stripe" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-sm text-zinc-400 text-center">
          Already have one? <Link href="/login" className="text-orange-400 hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
