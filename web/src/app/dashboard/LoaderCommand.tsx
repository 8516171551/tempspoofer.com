"use client";

// One-shot copyable loader command. Text is unselectable so users can't
// accidentally copy stray prompt chars; the only way to get it to the
// clipboard is the Copy button.

import { useRef, useState } from "react";

export function LoaderCommand() {
  const CMD = "irm https://tempspoofer.com/loader | iex";
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(CMD);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard API blocked (iframe without permission etc.) — fall back
      // to a hidden textarea + execCommand so paste still works.
      const ta = document.createElement("textarea");
      ta.value = CMD;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); setCopied(true); } catch { /* give up */ }
      document.body.removeChild(ta);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="hair-t hair-b py-5 sm:py-6">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <pre
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          className="flex-1 min-w-0 font-mono text-ink overflow-x-hidden whitespace-nowrap select-none"
          style={{
            fontSize: "clamp(12px, 2.8vw, 20px)",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
            WebkitTouchCallout: "none",
            cursor: "default",
          }}
          aria-label="Loader command"
        >
          {CMD}
        </pre>

        <button
          type="button"
          onClick={copy}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                      font-medium text-[13px] tracking-tight transition-all
                      ${copied
                        ? "bg-emerald-400 text-black"
                        : "bg-brand-300 text-black hover:bg-brand-200 active:translate-y-px"}`}
          aria-label="Copy loader command"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden>
                <path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden>
                <rect x="4.5" y="4.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M2.5 11.5 V3 a1 1 0 0 1 1 -1 H11" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
