"use client";

// Dashboard header buttons: show code (prompts confirm), log out.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (!confirm("Sign out of this account? You'll need your master code to come back on a different IP.")) return;
    setBusy(true);
    try {
      await fetch("/api/accounts/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={logout}
        disabled={busy}
        className="btn btn-ghost text-[12px] py-2 px-3"
      >
        {busy ? "..." : "Log out"}
      </button>
    </div>
  );
}
