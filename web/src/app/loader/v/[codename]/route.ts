// Serves an archived loader binary by codename.
//   /loader/v/ECLIPSE          -> web/public/versions/ECLIPSE.exe
//   /loader/v/ECLIPSE-reseller -> web/public/versions/ECLIPSE-reseller.exe
//
// Refuses codenames that aren't listed in VERSIONS.json or that are blocked
// so a user can't side-step a kill-switched build by typing the URL directly.

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface VersionRow { codename: string; blocked?: boolean }

export async function GET(_req: Request, { params }: { params: Promise<{ codename: string }> }) {
  const { codename } = await params;
  const raw = codename.trim();
  if (!/^[A-Z0-9]+(-reseller)?$/i.test(raw)) {
    return NextResponse.json({ error: "Invalid codename" }, { status: 400 });
  }

  const isReseller = raw.toLowerCase().endsWith("-reseller");
  const base = isReseller ? raw.slice(0, -"-reseller".length).toUpperCase() : raw.toUpperCase();

  // Validate against VERSIONS.json.
  let versions: VersionRow[] = [];
  try {
    const doc = JSON.parse(await fs.readFile(path.join(process.cwd(), "public", "versions", "VERSIONS.json"), "utf8"));
    versions = doc.versions ?? [];
  } catch { /* fall through to 404 */ }

  const row = versions.find(v => v.codename.toUpperCase() === base);
  if (!row) return NextResponse.json({ error: "Unknown version" }, { status: 404 });
  if (row.blocked) return NextResponse.json({ error: "Version blocked by maintainer" }, { status: 410 });

  const fileName = isReseller ? `${base}-reseller.exe` : `${base}.exe`;
  const file     = path.join(process.cwd(), "public", "versions", fileName);
  try {
    const bytes = await fs.readFile(file);
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": "application/vnd.microsoft.portable-executable",
        "content-length": bytes.length.toString(),
        "cache-control": "public, max-age=300",
        "content-disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Binary not found" }, { status: 404 });
  }
}
