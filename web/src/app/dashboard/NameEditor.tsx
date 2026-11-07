"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function NameEditor({ id, initial }: { id: string; initial: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(initial ?? "");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const display = initial && initial.length > 0 ? initial : id;

  async function save() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/accounts/rename", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Could not save"); return; }
      setEditing(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  function begin() {
    setErr(null);
    setValue(initial ?? "");
    setEditing(true);
    setTimeout(() => ref.current?.select(), 0);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className="font-mono text-[22px] sm:text-[28px] text-ink truncate">{display}</div>
        <button
          type="button"
          onClick={begin}
          aria-label="Rename account"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-md border border-[#232323] text-ink-3 hover:text-ink hover:border-[#3A3A3A] transition-colors"
          title="Rename"
        >
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
            <path d="M3 17 L6 16 L16 6 L14 4 L4 14 Z" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={ref}
        className="input font-mono text-[18px] max-w-[320px]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. ethan.spoof"
        maxLength={24}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setEditing(false); setErr(null); }
        }}
      />
      <button className="btn btn-brand py-2 px-4 text-[13px]" onClick={save} disabled={busy}>
        {busy ? "..." : "Save"}
      </button>
      <button className="btn btn-ghost py-2 px-4 text-[13px]" onClick={() => { setEditing(false); setErr(null); }} disabled={busy}>
        Cancel
      </button>
      {err && <div className="w-full text-[12px] text-red-400 mt-1">{err}</div>}
    </div>
  );
}
