"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateKeysForm({ infinite }: { infinite: boolean }) {
  const router = useRouter();
  const [tier, setTier] = useState("week");
  const [count, setCount] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const max = infinite ? 50 : 5;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/reseller/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, count }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error ?? "Failed to generate keys");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-3 flex-wrap">
      <div className="min-w-[140px]">
        <label className="text-xs text-zinc-400 mb-1 block">Tier</label>
        <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="day">Day Pass</option>
          <option value="week">Week Pass</option>
          <option value="month">Month Pass</option>
        </select>
      </div>
      <div className="min-w-[160px]">
        <label className="text-xs text-zinc-400 mb-1 block">Count (max {max})</label>
        <input
          className="input"
          type="number"
          min={1}
          max={max}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(max, parseInt(e.target.value) || 1)))}
        />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary">
        {busy ? "..." : "Generate"}
      </button>
      {err && <div className="text-sm text-red-400 ml-2">{err}</div>}
    </form>
  );
}
