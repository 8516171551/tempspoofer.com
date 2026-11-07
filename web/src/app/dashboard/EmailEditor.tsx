"use client";

// Recovery email set/change. Required for the master-code-lost flow.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EmailEditor({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(initial ?? "");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/accounts/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value.trim() }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Could not save"); return; }
      setEditing(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  const hasEmail = (initial ?? "").length > 0;

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[12px] text-ink-3 font-mono mb-0.5">recovery email</div>
          {hasEmail ? (
            <div className="text-[14px] text-ink truncate">{initial}</div>
          ) : (
            <div className="text-[14px] text-ink-3">not set &mdash; <span className="text-amber-300">add one to enable recovery</span></div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-[12px] px-3 py-1.5 rounded-md border border-[#232323] text-ink-2 hover:text-ink hover:border-[#3A3A3A] transition-colors"
        >
          {hasEmail ? "Change" : "Add email"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-ink-3 font-mono mb-1">recovery email</div>
        <input
          type="email"
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="you@example.com"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setEditing(false); setValue(initial ?? ""); setErr(null); }
          }}
        />
        {err && <div className="text-[12px] text-red-400 mt-1">{err}</div>}
      </div>
      <div className="flex gap-2">
        <button className="btn btn-brand py-2 px-4 text-[13px]" onClick={save} disabled={busy}>
          {busy ? "..." : "Save"}
        </button>
        <button className="btn btn-ghost py-2 px-4 text-[13px]" onClick={() => { setEditing(false); setValue(initial ?? ""); setErr(null); }} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
