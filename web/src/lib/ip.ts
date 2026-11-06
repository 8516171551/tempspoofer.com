// Extract the real client IP from Vercel's forwarded headers. Vercel
// adds `x-forwarded-for` (comma-separated, first entry is the client)
// and `x-real-ip`. On the edge runtime `request.ip` would work too;
// stick to headers so this works everywhere.

import { headers } from "next/headers";

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}

export function clientIpFromRequest(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}
