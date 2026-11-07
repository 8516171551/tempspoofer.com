// Reusable brand mark. `variant`:
//   "tile"  — full gradient-filled rounded square (default, headers + hero)
//   "mono"  — stroke-only brand-colored version for inline use on dark BG
// Scale with the `size` prop; SVG is viewBox-based so it stays crisp.

import React from "react";

type Variant = "tile" | "mono";

export function Logo({
  size = 28,
  variant = "tile",
  className = "",
}: { size?: number; variant?: Variant; className?: string }) {
  const gid = React.useId();
  if (variant === "mono") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"
        width={size} height={size} fill="none" className={className}
        aria-hidden
      >
        <path d="M18 22 H46" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
        <path d="M32 22 V46" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
        <path d="M 52 32 A 20 20 0 1 0 32 12" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round"/>
        <circle cx="32" cy="12" r="2.8" fill="currentColor"/>
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"
      width={size} height={size} className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#E4F0FD"/>
          <stop offset="55%" stopColor="#B2D6F8"/>
          <stop offset="100%" stopColor="#6BAAEB"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${gid})`}/>
      <path d="M18 22 H46" stroke="#0A0A0E" strokeWidth="7" strokeLinecap="round"/>
      <path d="M32 22 V46" stroke="#0A0A0E" strokeWidth="7" strokeLinecap="round"/>
      <path d="M 52 32 A 20 20 0 1 0 32 12" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
      <circle cx="32" cy="12" r="2.8" fill="#0A0A0E"/>
    </svg>
  );
}

// Logo + wordmark lockup for headers and footers.
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5 font-bold">
      <Logo size={size} />
      <span className="tracking-tight">Temporary Spoofer</span>
    </span>
  );
}
