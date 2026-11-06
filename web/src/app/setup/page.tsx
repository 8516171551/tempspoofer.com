"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid-pattern" />}>
      <SetupInner />
    </Suspense>
  );
}

function SetupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    if (password.length < 8)  { setErr("At least 8 characters.");  return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error ?? "Setup failed");
        return;
      }
      router.push("/reseller");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="grid-pattern min-h-screen flex items-center justify-center px-6">
        <div className="card p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid setup link.</h1>
          <p className="text-sm text-zinc-400 mb-6">The link is missing its token. Use the exact link we emailed you after checkout.</p>
          <Link href="/" className="btn btn-primary">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-pattern min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 font-bold mb-8">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          Temporary Spoofer
        </Link>
        <h1 className="text-2xl font-bold mb-1">Set your password.</h1>
        <p className="text-sm text-zinc-400 mb-6">You'll use this to log into your reseller dashboard next time.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">New password</label>
            <input className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Confirm password</label>
            <input className="input" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {err && <div className="text-sm text-red-400">{err}</div>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? "..." : "Set password & open dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
